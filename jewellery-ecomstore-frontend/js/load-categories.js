(function () {
    const rail = document.querySelector('.category-rail');
    if (!rail) return;

    const baseUrl = API_BASE_URL || '';

    function render(categories) {
        rail.innerHTML = '';
        if (!Array.isArray(categories) || categories.length === 0) {
            rail.innerHTML = '<div style="color:#777;padding:12px">No categories</div>';
            return;
        }
        categories.forEach(c => {
            const card = document.createElement('a');
            card.className = 'category-card';
            // Use category slug or ID for the link if available, otherwise fallback
            const categoryIdentifier = c.slug || c.categoryId || c.categoryName || '';
            card.href = `catalog.html?category=${encodeURIComponent(categoryIdentifier)}`;

            // *** FIX 1: Use c.imageUrl and c.categoryName ***
            const imageUrl = c.imageUrl || 'images/placeholder.png'; // Use imageUrl
            const categoryName = c.categoryName || 'Unnamed Category'; // Use categoryName

            card.innerHTML = `
                <img src="${imageUrl}" alt="${categoryName}" />
                <div class="label">${categoryName}</div>
            `;
            // Add data-category attribute if needed elsewhere, using a consistent identifier
            card.setAttribute('data-category', categoryIdentifier);
            rail.appendChild(card);
        });
    }

    async function fetchCategoriesServer() {
        if (!baseUrl) {
            console.warn("API_BASE_URL not defined, cannot fetch categories from server.");
            return null;
        }
        try {
            // *** FIX 2: Use the /public/categories endpoint ***
            const res = await fetch(`${baseUrl}/public/categories`); // Correct endpoint
            if (!res.ok) {
                console.error(`Failed to fetch categories: ${res.status}`);
                return null;
            }
            return await res.json();
        } catch (e) {
            console.error("Error fetching categories:", e);
            return null;
        }
    }

    async function load() {
        // Prefer server only if API_BASE_URL is set. Otherwise use localStorage only.
        let categories = null;
        if (baseUrl) {
            categories = await fetchCategoriesServer();
        }

        if (Array.isArray(categories) && categories.length) {
            console.log("Rendering categories from server:", categories);
            render(categories);
            // Optionally save to local storage if needed for offline fallback elsewhere
            // localStorage.setItem('local-categories', JSON.stringify(categories));
            return;
        } else {
            console.log("No categories fetched from server or API_BASE_URL not set.");
            // Optional: Attempt local storage fallback if server fetch failed
            // const raw = localStorage.getItem('local-categories');
            // const arr = raw ? JSON.parse(raw) : [];
            // render(arr);
            render([]); // Render empty state if fetch fails and no fallback desired
        }
    }

    load();

    // update when admin modifies categories
    //window.addEventListener('localCategoriesUpdated', load);
})();
// jewellery-ecomstore-frontend/js/admin.js
// Admin script - uses global API_BASE_URL from config.js

(function () {
    // helpers
    function el(id) { return document.getElementById(id); }
    function escapeHtml(str) { return String(str || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

    // --- API helper (returns parsed JSON) ---
    async function apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('adminToken');
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        if (!res.ok) {
            let errText;
            try { errText = await res.text(); } catch(e) { errText = res.statusText; }
            throw new Error(`Server error ${res.status}: ${errText}`);
        }
        if (res.status === 204) return null;
        const contentType = res.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) return await res.json();
        // otherwise return raw text
        return await res.text();
    }

    // --- Image upload (returns imageUrl) ---
    async function uploadImageFile(file) {
        if (!file) return '';
        const form = new FormData();
        form.append('file', file);

        const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: form });
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new Error(`Upload failed: ${res.status} ${txt}`);
        }
        const json = await res.json();
        // backend returns { imageUrl: 'http://...'}
        return json.imageUrl || json.url || json;
    }

    // --- UI and logic ---
    const productsListEl = el('productsList');
    const addProductForm = el('addProductForm');
    const prodImageFileInput = el('prod-image-file'); // file input element
    const prodImageUrlInput = el('prod-image'); // text input to hold image url
    const prodPreview = el('prod-image-preview');

    // Load products
    async function loadAndRenderProducts() {
        if (!productsListEl) return;
        productsListEl.innerHTML = 'Loading products...';
        try {
            const products = await apiRequest('/admin/products');
            renderProductsList(products);
        } catch (err) {
            productsListEl.innerHTML = `<div style="color:red">Error loading products: ${escapeHtml(err.message)}</div>`;
            console.error(err);
        }
    }

    function renderProductsList(products) {
        if (!productsListEl) return;
        productsListEl.innerHTML = '';
        if (!Array.isArray(products) || products.length === 0) {
            productsListEl.innerHTML = '<div style="color:#666">No products found.</div>';
            return;
        }
        products.forEach(p => {
            const imageUrl = (p.images && p.images.length > 0) ? p.images[0].imageUrl : 'images/placeholder1.jpg';
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(p.productName)}" />
        <div class="meta">
          <div style="font-weight:700">${escapeHtml(p.productName)}</div>
          <div style="color:#777">LKR ${Number(p.basePrice || 0).toLocaleString()}</div>
          <div style="color:#777;font-size:.8em">SKU: ${escapeHtml(p.sku)}</div>
        </div>
        <div class="actions">
          <button class="btn-small btn-delete" data-id="${p.productId}">Delete</button>
        </div>`;
            const btn = item.querySelector('.btn-delete');
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (!confirm(`Delete product ${id}?`)) return;
                try {
                    await apiRequest(`/admin/products/${id}`, { method: 'DELETE' });
                    loadAndRenderProducts();
                } catch (err) { alert('Delete failed: ' + err.message); }
            });
            productsListEl.appendChild(item);
        });
    }

    // Upload file when selected, fill URL and preview
    if (prodImageFileInput) {
        prodImageFileInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) {
                if (prodPreview) prodPreview.innerHTML = '';
                if (prodImageUrlInput) prodImageUrlInput.value = '';
                return;
            }
            try {
                if (prodPreview) prodPreview.innerHTML = 'Uploading...';
                const uploadedUrl = await uploadImageFile(file);
                if (prodImageUrlInput) prodImageUrlInput.value = uploadedUrl;
                if (prodPreview) prodPreview.innerHTML = `<img src="${uploadedUrl}" style="max-width:160px;max-height:120px;border-radius:6px;object-fit:cover;">`;
                console.log('Uploaded image URL:', uploadedUrl);
            } catch (err) {
                console.error('Upload failed', err);
                if (prodPreview) prodPreview.innerHTML = `<div style="color:red">Upload failed: ${escapeHtml(err.message)}</div>`;
            }
        });
    }

    // Submit new product
    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = addProductForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding...';
            try {
                const title = el('prod-title').value.trim();
                const price = Number(el('prod-price').value) || 0;
                const desc = el('prod-desc').value.trim();
                const categoryId = el('prod-category') ? el('prod-category').value : null;
                const sku = el('prod-sku') ? el('prod-sku').value.trim() : `SKU-${Date.now()}`;
                const stock = el('prod-stock') ? Number(el('prod-stock').value) : 0;
                const imageUrl = prodImageUrlInput ? prodImageUrlInput.value.trim() : '';

                if (!title || price <= 0) { throw new Error('Product title and valid price required'); }

                const payload = {
                    productName: title,
                    basePrice: price,
                    description: desc,
                    sku: sku,
                    stockQuantity: stock,
                    productCategories: categoryId ? [{ categoryId: Number(categoryId) }] : [],
                    images: imageUrl ? [{ imageUrl: imageUrl, isPrimary: true }] : [],
                    isActive: true,
                    markupPercentage: 10 // 👈 Added this line — prevents SQL null error
                };

                await apiRequest('/admin/products', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                addProductForm.reset();
                if (prodPreview) prodPreview.innerHTML = '';
                if (prodImageUrlInput) prodImageUrlInput.value = '';
                await loadAndRenderProducts();
                alert('Product added successfully!');
            } catch (err) {
                console.error('Add product failed', err);
                alert('Failed: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Add product';
            }
        });
    }

    // Initialize
    window.addEventListener('load', () => {
        loadAndRenderProducts();
    });

})();

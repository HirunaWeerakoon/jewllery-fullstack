// jewellery-ecomstore-frontend/js/admin.js
// Admin script - uses global API_BASE_URL from config.js

(function () {
    // helpers
    function el(id) { return document.getElementById(id); }
    function escapeHtml(str) { return String(str || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

    // --- API helper (returns parsed JSON) ---
    // --- API helper (returns parsed JSON) ---
    async function apiRequest(endpoint, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

        try {
            // Add credentials include for session cookie handling if CORS requires it
            const fetchOptions = {
                ...options,
                headers,
                credentials: 'include' // <<< Add: Send cookies (JSESSIONID)
            };

            const res = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions); // Use fetchOptions

            if (res.status === 401) {
                // Unauthorized - Browser should have prompted or session expired

                console.error('Authentication required or session expired.');
                // Example: window.location.href = 'admin-login.html';
                alert('Authentication required. Please log in.'); // Simple alert
                throw new Error('Unauthorized'); // Stop processing
            }

            if (!res.ok) {
                let errText;
                try { errText = await res.text(); } catch(e) { errText = res.statusText; }
                throw new Error(`Server error ${res.status}: ${errText}`);
            }

            // --- Response handling (remains mostly the same) ---
            if (res.status === 204) return null; // No Content
            const contentType = res.headers.get('Content-Type') || '';
            if (contentType.includes('application/json')) {
                return await res.json();
            } else {
                return await res.text(); // Return raw text otherwise
            }

        } catch (error) { // <<< Catch block for fetch errors
            console.error(`API Request failed for endpoint ${endpoint}:`, error);
            // Re-throw or handle error appropriately for the UI
            throw error;
        }
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

    // --- Category Management Elements ---
    const categoriesListEl = el('categoriesList');
    const addCategoryForm = el('addCategoryForm');
    const catImageFileInput = el('cat-image-file');
    const catImageUrlInput = el('cat-image-url');
    const catPreview = el('cat-image-preview');
    const prodCategoryDropdown = el('prod-category'); // Dropdown in Add Product form

    // --- Slips Management Elements ---
    const slipsContainerEl = el('slipsContainer');

    // --- Load and Render Categories ---
    async function loadAndRenderCategories() {
        if (!categoriesListEl) return;
        categoriesListEl.innerHTML = 'Loading categories...';
        let categories = [];
        try {
            // Use the public endpoint, adjust if you have a specific admin one
            categories = await apiRequest('/api/categories');
            renderCategoriesList(categories);
        } catch (err) {
            categoriesListEl.innerHTML = `<div style="color:red">Error loading categories: ${escapeHtml(err.message)}</div>`;
            console.error(err);
        }

        // --- Populate Product Category Dropdown ---
        if (prodCategoryDropdown) {
            // Clear existing options except the first "Uncategorized" one
            while (prodCategoryDropdown.options.length > 1) {
                prodCategoryDropdown.remove(1);
            }
            // Add fetched categories
            if (Array.isArray(categories)) {
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.categoryId; // Use categoryId
                    option.textContent = cat.categoryName; // Use categoryName
                    prodCategoryDropdown.appendChild(option);
                });
            }
        }
    }

    function renderCategoriesList(categories) {
        if (!categoriesListEl) return;
        categoriesListEl.innerHTML = '';
        if (!Array.isArray(categories) || categories.length === 0) {
            categoriesListEl.innerHTML = '<div style="color:#666">No categories found.</div>';
            return;
        }
        categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'admin-item'; // Reuse existing style
            item.innerHTML = `
                {/* Add image if category DTO includes it */}
                {/* <img src="${escapeHtml(cat.imageUrl || 'images/placeholder2.jpg')}" alt="${escapeHtml(cat.categoryName)}" /> */}
                <div class="meta">
                  <div style="font-weight:700">${escapeHtml(cat.categoryName)}</div>
                  <div style="color:#777; font-size: .8em">ID: ${cat.categoryId}, Slug: ${escapeHtml(cat.slug || '')}</div>
                </div>
                <div class="actions">
                  <button class="btn-small btn-delete" data-id="${cat.categoryId}">Delete</button>
                </div>`;

            const btn = item.querySelector('.btn-delete');
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const name = cat.categoryName;
                if (!confirm(`Delete category "${name}" (ID: ${id})?`)) return;
                try {
                    // Use correct admin endpoint which requires authentication
                    await apiRequest(`/api/categories/${id}`, { method: 'DELETE' });
                    loadAndRenderCategories(); // Refresh list
                } catch (err) {
                    alert('Delete failed: ' + err.message);
                }
            });
            categoriesListEl.appendChild(item);
        });
    }

    // --- Handle Category Image Upload --- (Similar to Product Image)
    if (catImageFileInput) {
        catImageFileInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) {
                if (catPreview) catPreview.innerHTML = '';
                if (catImageUrlInput) catImageUrlInput.value = '';
                return;
            }
            try {
                if (catPreview) catPreview.innerHTML = 'Uploading...';
                const uploadedUrl = await uploadImageFile(file);
                if (catImageUrlInput) catImageUrlInput.value = uploadedUrl;
                if (catPreview) catPreview.innerHTML = `<img src="${uploadedUrl}" style="max-width:160px; max-height:120px; border-radius:6px; object-fit:cover;">`;
            } catch (err) {
                console.error('Category image upload failed', err);
                if (catPreview) catPreview.innerHTML = `<div style="color:red">Upload failed: ${escapeHtml(err.message)}</div>`;
            }
        });
    }

    // --- Submit New Category ---
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = addCategoryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding...';
            try {
                const name = el('cat-name').value.trim();
                const imageUrl = catImageUrlInput ? catImageUrlInput.value.trim() : '';
                // Simple slug generation (replace spaces with hyphens, lowercase)
                const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                if (!name || !slug) { throw new Error('Category name is required'); }

                const payload = {
                    categoryName: name,
                    slug: slug,
                    // Add imageUrl if your CategoryDto supports it
                    // imageUrl: imageUrl,
                    isActive: true // Default to active
                };

                // Use correct admin endpoint which requires authentication
                await apiRequest('/api/categories', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                addCategoryForm.reset();
                if (catPreview) catPreview.innerHTML = '';
                if (catImageUrlInput) catImageUrlInput.value = '';
                await loadAndRenderCategories(); // Refresh list
                alert('Category added successfully!');
            } catch (err) {
                console.error('Add category failed', err);
                alert('Failed: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Add category';
            }
        });
    }


    // --- Load and Render Slips (Orders) ---
    async function loadAndRenderSlips() {
        if (!slipsContainerEl) return;
        slipsContainerEl.innerHTML = 'Loading payment slips (orders)...';
        try {
            // Fetch orders from the admin endpoint
            const orders = await apiRequest('/api/admin/orders'); // GET /api/admin/orders

            if (!Array.isArray(orders) || orders.length === 0) {
                slipsContainerEl.innerHTML = '<div class="no-slips">No orders with slips found yet.</div>';
                return;
            }

            // Filter orders that have slip information (optional, backend might do this)
            const ordersWithSlips = orders.filter(o => o.slipFileName && o.slipFilePath);

            if (ordersWithSlips.length === 0) {
                slipsContainerEl.innerHTML = '<div class="no-slips">No orders with slips found yet.</div>';
                return;
            }

            renderSlipsTable(ordersWithSlips);

        } catch (err) {
            slipsContainerEl.innerHTML = `<div style="color:red">Error loading slips: ${escapeHtml(err.message)}</div>`;
            console.error(err);
        }
    }

    function renderSlipsTable(orders) {
        if (!slipsContainerEl) return;

        // Create table structure
        slipsContainerEl.innerHTML = `
            <table class="slips-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Slip</th>
                        <th>Uploaded</th>
                        <th>Payment Status</th>
                        <th>Verify Payment</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => createSlipTableRow(order)).join('')}
                </tbody>
            </table>
        `;

        // Add event listeners for verify buttons
        slipsContainerEl.querySelectorAll('.btn-verify-payment').forEach(button => {
            button.addEventListener('click', async () => {
                const orderId = button.dataset.orderId;
                const currentPaymentStatus = button.dataset.paymentStatus; // Get current status
                const currentOrderStatus = button.dataset.orderStatus; // Get current status

                if (currentPaymentStatus === 'verified') {
                    alert('Payment is already verified.');
                    return;
                }

                if (!confirm(`Mark payment for Order ID ${orderId} as VERIFIED?`)) return;

                button.disabled = true;
                button.textContent = 'Verifying...';

                try {
                    // Prepare payload - only update payment status to 'verified'
                    // Keep existing order status unless verification implies a change (e.g., to 'processing')
                    const payload = {
                        paymentStatus: 'verified', // Target status
                        orderStatus: currentOrderStatus // Keep current order status (or set to 'processing' etc.)
                    };

                    await apiRequest(`/api/admin/orders/${orderId}/status`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });

                    alert(`Payment for Order ID ${orderId} verified successfully!`);
                    loadAndRenderSlips(); // Refresh the table

                } catch (err) {
                    console.error('Verification failed:', err);
                    alert('Verification failed: ' + err.message);
                    button.disabled = false;
                    button.textContent = 'Verify';
                }
            });
        });
    }

    function createSlipTableRow(order) {
        // Determine payment status name from the nested object
        const paymentStatusName = order.paymentStatus?.paymentStatusName || 'unknown';
        const orderStatusName = order.orderStatusType?.orderStatusName || 'unknown'; // Use orderStatusType

        // Construct full image URL for slip (assuming API_BASE_URL is like http://localhost:8081/api)
        // Need to remove '/api' part for accessing /uploads
        const baseUrlForUploads = API_BASE_URL.replace('/api', '');
        const slipUrl = `${baseUrlForUploads}/uploads/${order.slipFilePath}`;

        const isVerified = paymentStatusName === 'verified';

        return `
            <tr>
                <td>${order.id}</td>
                <td>
                    ${escapeHtml(order.customerName || 'N/A')}<br>
                    <small>${escapeHtml(order.customerEmail || 'N/A')}</small>
                </td>
                <td>
                    ${order.slipFilePath ? `
                        <a href="${slipUrl}" target="_blank" rel="noopener noreferrer" title="View Slip: ${escapeHtml(order.slipFileName || '')}">
                            <img src="${slipUrl}" alt="Slip for Order ${order.id}" class="slip-thumb">
                        </a>
                    ` : 'No Slip'}
                </td>
                <td>${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td>
                     <span style="font-weight: bold; color: ${isVerified ? 'green' : 'orange'};">
                        ${escapeHtml(paymentStatusName.toUpperCase())}
                     </span>
                </td>
                <td>
                    <button class="btn-small btn-verify-payment"
                            data-order-id="${order.id}"
                            data-payment-status="${paymentStatusName}"
                            data-order-status="${orderStatusName}"
                            ${isVerified ? 'disabled title="Already Verified"' : ''}>
                        ${isVerified ? 'Verified' : 'Verify'}
                    </button>
                </td>
            </tr>
        `;
    }

    // Expose the slip rendering function globally for the tab switcher
    window.renderPaymentSlips = loadAndRenderSlips;


    // --- Initial Load on Page Ready ---
    window.addEventListener('load', () => {
        loadAndRenderProducts(); // Load products for the default tab
        loadAndRenderCategories(); // Load categories for dropdown and category tab
        // Slips will be loaded when the tab is clicked (see tab switching logic in admin.html)
        // Or load them initially if the Slips tab might be default
        // loadAndRenderSlips();
    });


})();

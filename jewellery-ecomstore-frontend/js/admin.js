// jewellery-ecomstore-frontend/js/admin.js
// Refactored to use backend API instead of localStorage

(function () {
    // --- Authentication Helper ---
    // Implement this function based on how you store the token after login
    function getAuthToken() {
        return localStorage.getItem('adminToken'); // Example: Retrieve token saved during login
    }

    // --- API Helper ---
    async function apiRequest(endpoint, options = {}) {
        const token = getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: headers,
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { message: `HTTP error! status: ${response.status}` };
                }
                console.error('API Error:', errorData);
                throw new Error(errorData.message || `Request failed with status ${response.status}`);
            }

            // Handle responses that might not have a body (e.g., DELETE with 204 No Content)
            if (response.status === 204) {
                return null; // Or return an empty object/true if preferred
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error; // Re-throw the error to be handled by the caller
        }
    }


    // --- helpers ---
    function el(id) { return document.getElementById(id); }
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    // --- Image Conversion (Keep for form handling if sending data URLs) ---
    function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            if (!file) return resolve('');
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (e) => reject(e);
            try { reader.readAsDataURL(file); } catch (err) { reject(err); }
        });
    }

    // --- Tabs ---
    const tabButtons = Array.from(document.querySelectorAll('.tab-link'));
    tabButtons.forEach(btn => btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.admin-tab').forEach(p => {
            p.style.display = (p.id === tab) ? '' : 'none'; // Use id directly
        });
        // Load data for the activated tab
        if (tab === 'products') loadAndRenderProducts();
        else if (tab === 'categories') loadAndRenderCategories();
        else if (tab === 'slips') loadAndRenderSlips();
    }));

    // --- Renderers ---

    // Products
    async function loadAndRenderProducts() {
        const container = el('productsList');
        if (!container) return;
        container.innerHTML = '<div>Loading products...</div>';
        try {
            // Use AdminProductController endpoint
            const products = await apiRequest('/admin/products');
            renderProductsList(products);
        } catch (error) {
            container.innerHTML = `<div style="color:red">Error loading products: ${escapeHtml(error.message)}</div>`;
        }
    }

    function renderProductsList(products) {
        const container = el('productsList');
        if (!container) return;
        container.innerHTML = '';
        if (!Array.isArray(products) || !products.length) {
            container.innerHTML = '<div style="color:#666">No products found.</div>';
            return;
        }
        products.forEach(p => {
            const item = document.createElement('div');
            item.className = 'admin-item';
            // Adjust image source based on ProductDto structure (assuming images[0]?.imageUrl)
            const imageUrl = (p.images && p.images.length > 0) ? p.images[0].imageUrl : 'images/placeholder1.jpg';
            const price = p.basePrice || 0; // Assuming basePrice is the relevant price

            item.innerHTML = `
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(p.productName)}" />
                <div class="meta">
                  <div style="font-weight:700">${escapeHtml(p.productName)}</div>
                  <div style="color:#777">LKR ${Number(price).toLocaleString()}</div>
                  <div style="color:#777; font-size: 0.8em;">SKU: ${escapeHtml(p.sku)}</div>
                </div>
                <div class="actions">
                  <button class="btn-small btn-delete" data-id="${p.productId}">Delete</button>
                </div>
            `;
            item.querySelector('.btn-delete').addEventListener('click', async (e) => {
                const productId = e.target.dataset.id;
                if (!productId || !confirm(`Are you sure you want to delete product ID ${productId}?`)) return;
                try {
                    // Use AdminProductController endpoint
                    await apiRequest(`/admin/products/${productId}`, { method: 'DELETE' });
                    loadAndRenderProducts(); // Refresh list after deleting
                } catch (error) {
                    alert(`Failed to delete product: ${error.message}`);
                }
            });
            container.appendChild(item);
        });
    }

    // Categories
    async function loadAndRenderCategories() {
        const container = el('categoriesList');
        if (!container) return;
        container.innerHTML = '<div>Loading categories...</div>';
        try {
            // Use public endpoint, assuming admin context allows viewing all
            // Or change to an admin-specific endpoint if available
            const categories = await apiRequest('/public/categories');
            renderCategoriesList(categories);
            populateProductCategoryOptions(categories); // Update dropdown after loading
        } catch (error) {
            container.innerHTML = `<div style="color:red">Error loading categories: ${escapeHtml(error.message)}</div>`;
        }
    }

    function renderCategoriesList(categories) {
        const container = el('categoriesList');
        if (!container) return;
        container.innerHTML = '';
        if (!Array.isArray(categories) || !categories.length) {
            container.innerHTML = '<div style="color:#666">No categories found.</div>';
            return;
        }
        categories.forEach(c => {
            const item = document.createElement('div');
            item.className = 'admin-item';
            // Assuming CategoryDto has categoryName and maybe an image field
            item.innerHTML = `
                <img src="${c.image || 'images/placeholder2.jpg'}" alt="" />
                <div class="meta">
                  <div style="font-weight:700">${escapeHtml(c.categoryName)}</div>
                  <div style="color:#777; font-size: 0.8em;">Slug: ${escapeHtml(c.slug)}</div>
                </div>
                <div class="actions">
                  <button class="btn-small btn-delete" data-id="${c.categoryId}">Delete</button>
                </div>
            `;
            item.querySelector('.btn-delete').addEventListener('click', async (e) => {
                const categoryId = e.target.dataset.id;
                if (!categoryId || !confirm(`Are you sure you want to delete category ID ${categoryId}?`)) return;
                try {
                    // Use CategoryController endpoint (requires ADMIN role)
                    await apiRequest(`/api/categories/${categoryId}`, { method: 'DELETE' });
                    loadAndRenderCategories(); // Refresh list after deleting
                } catch (error) {
                    alert(`Failed to delete category: ${error.message}`);
                }
            });
            container.appendChild(item);
        });
    }

    // Slips (Orders)
    async function loadAndRenderSlips() {
        const container = el('slipsContainer');
        if (!container) return;
        container.innerHTML = '<div>Loading orders/slips...</div>';
        try {
            // Fetch all orders from AdminOrderController
            const orders = await apiRequest('/api/admin/orders');
            renderPaymentSlips(orders);
        } catch (error) {
            container.innerHTML = `<div style="color:red">Error loading orders/slips: ${escapeHtml(error.message)}</div>`;
        }
    }

    function renderPaymentSlips(orders) {
        const container = document.getElementById('slipsContainer');
        if (!container) return;

        // Filter orders that have slips and maybe filter by status if needed (e.g., only pending/processing)
        const ordersWithSlips = orders.filter(order => order.slipFileName && order.slipFilePath);

        if (!ordersWithSlips.length) {
            container.innerHTML = '<div class="no-slips">No payment slips submitted or found on orders.</div>';
            return;
        }

        let html = '<table class="slips-table" aria-describedby="slips-heading">';
        html += '<thead><tr><th>Order ID</th><th>Customer</th><th>Slip</th><th>Details</th><th>Status</th><th>Verify</th><th>Download</th></tr></thead><tbody>';

        ordersWithSlips.forEach(order => {
            // Assume paymentStatus holds the verification status ('pending', 'verified', etc.)
            const isVerified = order.paymentStatus?.paymentStatusName === 'verified';
            const verifiedAttr = isVerified ? 'checked' : '';
            const safeDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : '';
            // Construct slip URL - relative if served from backend, or use full URL if stored elsewhere
            const slipUrl = `/uploads/${order.slipFilePath}`; // Adjust path based on FileStorageService config and how files are served

            html += `<tr data-order-id="${order.id}">
              <td>${escapeHtml(order.id)}</td>
              <td>${escapeHtml(order.customerName)}<br/><small>${escapeHtml(order.customerEmail)}</small></td>
              <td><img src="${escapeHtml(slipUrl)}" alt="payment slip for order ${order.id}" class="slip-thumb" /></td>
              <td>
                <div><strong>Amount:</strong> LKR ${Number(order.totalAmount).toLocaleString()}</div>
                <div><strong>Slip File:</strong> ${escapeHtml(order.slipFileName)}</div>
                <div style="margin-top:6px;color:#666;"><small>Ordered: ${safeDate}</small></div>
              </td>
              <td>
                 <div>Order: <span class="status-order-${order.orderStatusType?.orderStatusName}">${escapeHtml(order.orderStatusType?.orderStatusName)}</span></div>
                 <div>Payment: <span class="status-payment-${order.paymentStatus?.paymentStatusName}">${escapeHtml(order.paymentStatus?.paymentStatusName)}</span></div>
              </td>
              <td style="text-align:center;">
                <input type="checkbox" class="verify-toggle" ${verifiedAttr} data-order-id="${order.id}" aria-label="Toggle verify" />
              </td>
              <td style="text-align:center;">
                <a href="${escapeHtml(slipUrl)}" download="${escapeHtml(order.slipFileName || `slip-${order.id}`)}" class="download-slip btn-small">Download</a>
              </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;

        // Add event listeners for the new checkboxes
        container.querySelectorAll('.verify-toggle').forEach(toggle => {
            toggle.addEventListener('change', handleVerifyToggle);
        });
    }

    // --- Form Handlers ---

    // Product form
    const addProductForm = el('addProductForm');
    const prodImageInputUrl = el('prod-image');
    const prodImageFileInput = el('prod-image-file');
    const prodPreview = el('prod-image-preview');

    async function handleProductImageInput(e) {
        const f = e.target.files && e.target.files[0];
        if (!f) { if (prodPreview) prodPreview.innerHTML = ''; if (prodImageInputUrl) prodImageInputUrl.value = ''; return; }
        try {
            const data = await fileToDataURL(f);
            if (prodImageInputUrl) prodImageInputUrl.value = data; // Store data URL in the URL field
            if (prodPreview) prodPreview.innerHTML = `<img src="${data}" alt="preview" style="max-width:160px;max-height:120px;border-radius:6px;object-fit:cover;">`;
            console.log('prod image converted, length', data.length);
        } catch (err) {
            console.error('product image conversion failed', err);
            if (prodPreview) prodPreview.innerHTML = '<div style="color:#c00">Preview failed</div>';
        }
    }

    if (prodImageFileInput) {
        prodImageFileInput.addEventListener('change', handleProductImageInput);
    }


    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = addProductForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Adding...';

            try {
                const title = el('prod-title').value.trim();
                const price = Number(el('prod-price').value) || 0;
                const description = el('prod-desc').value.trim();
                const categoryId = el('prod-category').value; // Get selected category ID
                // Use the data URL from the URL input field (populated by file input change)
                const image = prodImageInputUrl ? prodImageInputUrl.value.trim() : '';
                // Add other fields as needed (SKU, stock, etc.) - Assuming they exist in your form
                const sku = el('prod-sku') ? el('prod-sku').value.trim() : `SKU-${Date.now()}`; // Example SKU
                const stock = el('prod-stock') ? Number(el('prod-stock').value) : 10; // Example Stock

                if (!title || price <= 0) {
                    throw new Error('Product title and a valid price are required.');
                }

                const payload = {
                    productName: title,
                    basePrice: price,
                    description: description,
                    sku: sku, // Add SKU
                    stockQuantity: stock, // Add Stock
                    // Include category if one was selected
                    productCategories: categoryId ? [{ categoryId: Number(categoryId) }] : [],
                    // Include image if provided (assuming backend handles data URL)
                    images: image ? [{ imageUrl: image, isPrimary: true }] : [],
                    // Add other Product fields from your DTO as needed
                    markupPercentage: 0, // Example
                    weight: null, // Example
                    dimensions: null, // Example
                    minStockLevel: 5, // Example
                    isActive: true, // Example
                    featured: false, // Example
                    isGold: false, // Example
                    goldWeightGrams: null, // Example
                    goldPurityKarat: null // Example
                };

                // Send to backend via API
                await apiRequest('/admin/products', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                // Reset form and refresh list
                addProductForm.reset();
                if (prodPreview) prodPreview.innerHTML = '';
                if (prodImageInputUrl) prodImageInputUrl.value = ''; // Clear URL field too
                loadAndRenderProducts(); // Refresh product list
                alert('Product added successfully!');

            } catch (error) {
                console.error('Add product failed:', error);
                alert(`Failed to add product: ${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Add product';
            }
        });
    }

    // Category form
    const addCategoryForm = el('addCategoryForm');
    const catImageInputUrl = el('cat-image-url');
    const catImageFileInput = el('cat-image-file');
    const catPreview = el('cat-image-preview');

    async function handleCatImageInput(e) {
        const f = e.target.files && e.target.files[0];
        if (!f) { if (catPreview) catPreview.innerHTML = ''; if (catImageInputUrl) catImageInputUrl.value = ''; return; }
        try {
            const data = await fileToDataURL(f);
            if (catImageInputUrl) catImageInputUrl.value = data; // Store data URL
            if (catPreview) catPreview.innerHTML = `<img src="${data}" alt="preview" style="max-width:160px;max-height:120px;border-radius:6px;object-fit:cover;">`;
            console.log('cat image converted, length', data.length);
        } catch (err) {
            console.error('category image conversion failed', err);
            if (catPreview) catPreview.innerHTML = '<div style="color:#c00">Preview failed</div>';
        }
    }

    if (catImageFileInput) {
        catImageFileInput.addEventListener('change', handleCatImageInput);
    }

    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = addCategoryForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Adding...';

            try {
                const name = el('cat-name').value.trim();
                const image = catImageInputUrl ? catImageInputUrl.value.trim() : ''; // Get data URL
                // Generate slug (simple example, backend might do this better)
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

                if (!name) {
                    throw new Error('Category name is required.');
                }

                const payload = {
                    categoryName: name,
                    slug: slug,
                    // Assuming backend handles image data URL
                    image: image // Add image field if your CategoryDto supports it
                    // Add other Category fields as needed
                };

                // Send to backend via API (Use CategoryController endpoint)
                await apiRequest('/api/categories', { // Note: Make sure this is ADMIN protected
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                // Reset form and refresh list
                addCategoryForm.reset();
                if (catPreview) catPreview.innerHTML = '';
                if (catImageInputUrl) catImageInputUrl.value = '';
                loadAndRenderCategories(); // Refresh category list
                alert('Category added successfully!');

            } catch (error) {
                console.error('Add category failed:', error);
                alert(`Failed to add category: ${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Add category';
            }
        });
    }

    // --- Slip Verification Handler ---
    async function handleVerifyToggle(event) {
        const checkbox = event.target;
        const orderId = checkbox.dataset.orderId;
        const isVerified = checkbox.checked;

        if (!orderId) return;

        checkbox.disabled = true; // Prevent rapid clicking

        try {
            // Determine the new statuses
            // If verifying, set payment to 'verified'. If un-verifying, set back to 'pending'.
            // Keep order status as is, or update based on your workflow (e.g., 'processing'?)
            const newPaymentStatus = isVerified ? 'verified' : 'pending';
            // Get current order status to send it back, or decide on a new one
            const currentOrderStatus = checkbox.closest('tr').querySelector('.status-order')?.textContent || 'processing'; // Example: default to processing

            const payload = {
                orderStatus: currentOrderStatus, // Or determine next status based on verification
                paymentStatus: newPaymentStatus
            };

            // Call the backend API to update the order status
            await apiRequest(`/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            // Refresh the slips/orders list to show the update
            loadAndRenderSlips();
            // alert(`Order ${orderId} payment status updated to ${newPaymentStatus}`);

        } catch (error) {
            console.error(`Failed to update status for order ${orderId}:`, error);
            alert(`Error updating status: ${error.message}`);
            // Revert checkbox state on failure
            checkbox.checked = !isVerified;
        } finally {
            checkbox.disabled = false;
        }
    }


    // --- Product Category Dropdown ---
    function populateProductCategoryOptions(categories = []) {
        const sel = el('prod-category');
        if (!sel) return;
        // Remember selected value if any
        const selectedValue = sel.value;
        sel.innerHTML = '<option value="">Uncategorized</option>'; // Default option
        if (Array.isArray(categories)) {
            categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = String(c.categoryId);
                opt.textContent = c.categoryName;
                sel.appendChild(opt);
            });
        }
        // Restore selected value
        sel.value = selectedValue;
    }

    // --- Logout ---
    const logoutBtn = el('adminLogoutBtn'); // Make sure this button exists in admin.html
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminToken'); // Clear the token
            window.location.href = 'admin-register.html'; // Redirect to login/register
        });
    }

    // --- Initial Load ---
    // Load data for the initially active tab (Products)
    loadAndRenderProducts();
    // Pre-populate category options (will be updated again when categories tab is loaded)
    loadAndRenderCategories(); // Also calls populateProductCategoryOptions

})(); // End IIFE
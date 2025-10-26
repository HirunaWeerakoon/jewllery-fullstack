// Catalog Page JavaScript with Backend Integration


class CatalogManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.totalPages = 0;
        this.selectedCategory = null;
        this.searchTerm = '';

 
        this.apiConfig = {
            baseUrl: API_BASE_URL

            ,
            endpoints: {
                products: '/public/products',
                categories: '/categories',
                productsByCategory: '/products/category'
            }
        };

        this.init();
    }

    init() {
        this.getSelectedCategory();
        this.bindEvents();
        this.loadProducts();
    }

    getSelectedCategory() {
        // Get category from localStorage (set by homepage category clicks)
        this.selectedCategory = localStorage.getItem('selectedCategory');
        if (this.selectedCategory) {
            // Clear the stored category after using it
            localStorage.removeItem('selectedCategory');
        }
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.querySelector('.nav-search-bar');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterProducts();
            });
        }

        // Category filter (if exists)
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.selectedCategory = e.target.value;
                this.filterProducts();
            });
        }
    }

    // API Helper Methods
    async apiRequest(url, options = {}) {
        try {
            const response = await fetch(`${this.apiConfig.baseUrl}${url}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            // Fallback to mock data for development
            return this.getMockData(url);
        }
    }

    // --- updated loadProducts() function ---
    async loadProducts() {
        try {
            const url = `${API_BASE_URL}${this.apiConfig.endpoints.products}`;
            const res = await fetch(url);
            if (!res.ok) {
                console.error('Failed to fetch products from backend', res.status);
                return this.loadProductsFromStatic(); // optional fallback
            }

            const data = await res.json();
            // If backend returns array directly, keep as is
            this.products = Array.isArray(data) ? data : (data.products || []);
            this.filteredProducts = this.products.slice();
            this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
            this.renderProducts();
        } catch (err) {
            console.error('Error loading products', err);
            this.loadProductsFromStatic(); // fallback to local JSON if backend down
        }
    }
    async loadProductsFromStatic() {
        try {
            const res = await fetch('data/products.json');
            const data = await res.json();
            this.products = data;
            this.filteredProducts = this.products.slice();
            this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
            this.renderProducts();
        } catch (e) {
            console.warn('No static products available', e);
            this.renderProducts();
        }
    }

    filterProducts() {
        this.filteredProducts = this.products.filter(product => {
            const matchesSearch = !this.searchTerm ||
                product.name.toLowerCase().includes(this.searchTerm) ||
                product.description.toLowerCase().includes(this.searchTerm);

            const matchesCategory = !this.selectedCategory ||
                product.category === this.selectedCategory;

            return matchesSearch && matchesCategory;
        });

        this.renderProducts();
    }

    renderProducts() {
        const productGrid = document.querySelector('.product-grid');
        if (!productGrid) return;

        if (this.filteredProducts.length === 0) {
            productGrid.innerHTML = `
                <div class="empty-catalog">
                    <h3>No products found</h3>
                    <p>Try adjusting your search or browse all categories</p>
                </div>
            `;
            return;
        }

        productGrid.innerHTML = this.filteredProducts.map(product => {
        const productId = product.productId || product.id;
        const productName = product.productName || product.name || 'Unknown Product'; // Adapt
        const price = product.basePrice || product.price || 0; // Adapt
        const imageUrl = (product.images && product.images.length > 0 && product.images[0].imageUrl)
            || product.image
            || 'images/placeholder1.jpg'; // Adapt based on ProductDto

        return `            
            <div class="product-card">
                 {/* Correct: uses the 'productId' variable */}
                <a href="product.html?id=${productId}" class="product-link" aria-label="View product ${productName}">
                    <div class="image-wrap">
                         {/* Correct: uses 'imageUrl' and 'productName' variables */}
                        <img src="${imageUrl}" alt="${productName}" />
                        <div class="overlay" aria-hidden="true">
                             {/* Correct: uses 'productName' and 'price' variables */}
                            <span class="overlay-name">${productName}</span>
                            {/* Correct: uses 'price' variable and LKR currency */}
                            <span class="overlay-price">LKR ${price.toFixed(2)}</span>
                        </div>
                    </div>
                </a>
                 {/* Correct: Button uses 'productId' and 'price' variables */}
                 <button class="add-to-cart-btn"
                         data-product-id="${productId}"
                         data-price="${price}">
                    ADD TO CART
                 </button>
            </div>
        `}).join('');

        productGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const pid = btn.getAttribute('data-product-id');
                const p = btn.getAttribute('data-price');
                // Assuming addToCart is globally available from script.js
                if (window.addToCart && pid && p) {
                    window.addToCart(pid, p);
                } else {
                    console.error("addToCart function not found or missing data attributes");
                    alert("Error adding to cart.");
                }
            });
        });

    }



    showLoading() {
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) {
            productGrid.innerHTML = `
                <div class="loading-catalog">
                    <div class="spinner"></div>
                    <p>Loading products...</p>
                </div>
            `;
        }
    }

    // Mock data for development (remove when backend is ready)
    getMockData(url) {
        if (url.includes('/products')) {
            return {
                products: [
                    {
                        id: 1,
                        name: 'Golden Elegance Necklace',
                        category: 'necklaces',
                        price: 40000,
                        description: 'Handcrafted in 18K gold with dazzling diamonds',
                        image: 'images/necklace_1.png'
                    },
                    {
                        id: 2,
                        name: 'Diamond Ring',
                        category: 'rings',
                        price: 950,
                        description: 'Exquisite diamond ring with platinum setting',
                        image: 'images/necklace_2.png'
                    },
                    {
                        id: 3,
                        name: 'Pearl Earrings',
                        category: 'earrings',
                        price: 780,
                        description: 'Classic pearl earrings for elegant occasions',
                        image: 'images/necklace_3.png'
                    },
                    {
                        id: 4,
                        name: 'Luxury Bracelet',
                        category: 'bracelets',
                        price: 1100,
                        description: 'Sophisticated gold bracelet with intricate design',
                        image: 'images/necklace_4.png'
                    },
                    {
                        id: 5,
                        name: 'Rose Gold Pendant',
                        category: 'necklaces',
                        price: 1250,
                        description: 'Elegant rose gold pendant with diamond accent',
                        image: 'images/necklace_3.png'
                    },
                    {
                        id: 6,
                        name: 'Sapphire Ring',
                        category: 'rings',
                        price: 950,
                        description: 'Beautiful sapphire ring in white gold',
                        image: 'images/necklace_1.png'
                    }
                ]
            };
        }
        return { products: [] };
    }

    loadMockProducts() {
        const mockData = this.getMockData('/products');
        this.products = mockData.products;
        this.filterProducts();
    }
}

// Initialize catalog manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on catalog page
    if (document.querySelector('.catalog-page')) {
        window.catalogManager = new CatalogManager();
    }
});

// --- Robust shared products loader: merges local-products and listens for updates ---
(async function loadSharedProducts() {
    async function loadAndRender() {
        console.log('[catalog] loadAndRender start');
        let products = [];
        try {
            const res = await fetch('data/products.json');
            if (res.ok) {
                products = await res.json();
                console.log('[catalog] loaded data/products.json, count=', products.length);
            } else {
                console.warn('[catalog] data/products.json not found, status=', res.status);
            }
        } catch (err) {
            console.warn('[catalog] failed to fetch data/products.json', err);
        }

        // merge local admin products (local-products) on top
        const localRaw = localStorage.getItem('local-products');
        let local = [];
        try { local = localRaw ? JSON.parse(localRaw) : []; } catch (e) { local = []; console.warn('[catalog] failed to parse local-products', e); }
        console.log('[catalog] local-products count=', local.length);

        const merged = [...local, ...products];
        console.log('[catalog] merged products count=', merged.length);

        // If CatalogManager is running on the page, give it the merged products so it can filter/render correctly
        if (window.catalogManager && typeof window.catalogManager.filterProducts === 'function') {
            try {
                window.catalogManager.products = merged;
                window.catalogManager.filterProducts();
                return;
            } catch (e) {
                console.warn('[catalog] failed to hand data to CatalogManager, falling back to DOM render', e);
            }
        }

        // Fallback renderer into common container selectors (support .product-grid too)
        const container = document.getElementById('catalogGrid') || document.querySelector('.catalog-grid') || document.querySelector('.product-grid');
        if (!container) {
            console.warn('No catalog render target found. Add #catalogGrid, .catalog-grid or .product-grid to your catalog.html.');
            return;
        }

        container.innerHTML = '';
        merged.forEach(p => {
            const card = document.createElement('article');
            card.className = 'product-card';
            const catLabel = p.category && p.category.name ? `<div class="product-category">${p.category.name}</div>` : '';
            card.innerHTML = `
        <a href="product.html?id=${encodeURIComponent(p.id)}" class="product-link">
          <img src="${p.image || 'images/placeholder.png'}" alt="${p.title}" class="product-thumb" />
          <h3 class="product-title">${p.title}</h3>
          ${catLabel}
          <div class="product-price">LKR ${Number(p.price).toLocaleString()}</div>
        </a>
      `;
            container.appendChild(card);
        });
    }

    // initial
    await loadAndRender();

    // reload when admin signals update in the same tab
    window.addEventListener('localProductsUpdated', () => {
        console.log('[catalog] received localProductsUpdated event');
        loadAndRender();
    });

    // reload when localStorage changes from another tab (cross-tab)
    window.addEventListener('storage', (e) => {
        if (e.key === 'local-products') {
            console.log('[catalog] storage event: local-products changed');
            loadAndRender();
        }
    });
})();


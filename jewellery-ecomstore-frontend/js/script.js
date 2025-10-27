document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('siteHeader');
  const hero = document.getElementById('hero');

  // Toggle header style after hero scroll
  const toggleHeader = () => {
    const threshold = Math.max(0, (hero?.offsetHeight || 120) - (header?.offsetHeight || 64));
    header.classList.toggle('is-scrolled', window.scrollY > threshold);
  };
  toggleHeader();
  document.addEventListener('scroll', toggleHeader, { passive: true });

  // Category rail controls
  const rail = document.getElementById('categoryRail');
  const prevBtn = document.getElementById('scrollPrev');
  const nextBtn = document.getElementById('scrollNext');

  const getStep = () => Math.round(rail.clientWidth / 3); // show 3 at a time
  const scrollByStep = (dir) => rail.scrollBy({ left: dir * getStep(), behavior: 'smooth' });

  prevBtn?.addEventListener('click', () => scrollByStep(-1));
  nextBtn?.addEventListener('click', () => scrollByStep(1));

  // Keyboard support
  rail?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') scrollByStep(1);
    if (e.key === 'ArrowLeft') scrollByStep(-1);
  });

  // Category click functionality
  const categoryCards = document.querySelectorAll('.category-card');
  categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      const category = card.getAttribute('data-category');
      if (category) {
        // Store selected category and redirect to catalog
        localStorage.setItem('selectedCategory', category);
        window.location.href = 'catalog.html';
      }
    });
  });

  // Cart functionality

  const cartIcon = document.getElementById('cartIcon');
  const cartSlide = document.getElementById('cartSlide');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartClose = document.getElementById('cartClose');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');
  const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');

  async function fetchCartAPI(endpoint, options = {}) {
    try {
      // Ensure API_BASE_URL is defined in config.js
      const response = await fetch(`${API_BASE_URL}/cart${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // <<< IMPORTANT: Include session cookies
        ...options,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }
      // Handle empty response for DELETE/Clear
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null; // Or return a default empty cart structure if needed
      }
      return await response.json(); // Expects CartResponseDto structure
    } catch (error) {
      console.error('Cart API Error:', error);
      alert(`Cart operation failed: ${error.message}`);
      throw error; // Re-throw to stop further processing if needed
    }
  }
  const fetchCartFromServer = async () => {
    try {
      const cartData = await fetchCartAPI(''); // GET /api/cart
      updateCartDisplay(cartData);
    } catch (error) {
      // Handle error (e.g., show empty cart or error message)
      if (cartItemsEl) cartItemsEl.innerHTML = '<div class="empty-cart"><p>Could not load cart.</p></div>';
      if (cartTotalEl) cartTotalEl.textContent = 'Total: $0.00';
    }
  };

  // Open cart
  const openCart = () => {
    //fetchCartFromServer(); // Refresh cart content when opening
    cartSlide.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  // Close cart
  const closeCart = () => {
    cartSlide.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  // Add to cart - Calls Backend
  const addToCart = async (productId, price, attributeValueId = null, quantity = 1) => {
    const payload = {
      productId: parseInt(productId, 10),
      attributeValueId: attributeValueId ? parseInt(attributeValueId, 10) : null,
      quantity: quantity
    };

    // Find the button to show feedback
    const btn = event ? event.target : null;
    const originalText = btn ? btn.textContent : 'ADD TO CART';
    if(btn) {
      btn.disabled = true;
      btn.textContent = 'Adding...';
    }

    try {
      const updatedCartData = await fetchCartAPI('/add', { // POST /api/cart/add
        method: 'POST',
        body: JSON.stringify(payload)
      });
      updateCartDisplay(updatedCartData); // Update UI with response

      // Show success animation on button
      if (btn) {
        btn.textContent = 'Added!';
        btn.style.background = '#28a745'; // Green background
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = ''; // Revert background
          btn.disabled = false;
        }, 1000);
      }
      //openCart();  Optionally open cart after adding

    } catch (error) {
      if (btn) {
        btn.textContent = originalText; // Revert text on error
        btn.disabled = false;
      }
      // Error already alerted in fetchCartAPI
    }
  };

  // Remove from cart
  const removeFromCart = async (itemKey) => {
    if (!itemKey) {
      console.error("removeFromCart called without itemKey");
      return;
    }
    try {
      // Use DELETE /api/cart/item/{itemKey}
      const updatedCartData = await fetchCartAPI(`/item/${encodeURIComponent(itemKey)}`, {
        method: 'DELETE'
      });
      // If DELETE returns updated cart, use it. Otherwise, refetch.
      if (updatedCartData) {
        updateCartDisplay(updatedCartData);
      } else {
        fetchCartFromServer(); // Refetch the cart state
      }
    } catch (error) {
      // Error already alerted in fetchCartAPI
    }
  };

  // Update cart display
  const updateCartDisplay = (cartData) => {
    if (!cartItemsEl || !cartTotalEl) return;
    if (!cartData || !cartData.items || cartData.items.length === 0) {
      cartItemsEl.innerHTML = '<div class="empty-cart"><p>Your cart is empty</p></div>';
      cartTotalEl.textContent = 'Total: LKR 0.00'; // Update currency
    } else {
      cartItemsEl.innerHTML = cartData.items.map(item => {
        // Construct the itemKey needed for removal
        //const itemKey = `${item.productId}:${item.attributeValueId || '0'}`; // Generate key here
        return `
                <div class="cart-item">
                  <img src="${item.imageUrl || 'images/placeholder1.jpg'}" alt="${item.productName}" class="cart-item-image">
                  <div class="cart-item-details">
                    <div class="cart-item-name">${item.productName}</div>
                    <div class="cart-item-price">LKR ${item.unitPrice.toFixed(2)} x ${item.quantity} = LKR ${item.totalPrice.toFixed(2)}</div>
                  </div>
                  <button class="cart-item-remove" data-item-key="${item.itemKey}">&times;</button> </div>
              `;
      }).join('');

      // Add event listeners to newly created remove buttons
      cartItemsEl.querySelectorAll('.cart-item-remove').forEach(button => {
        button.addEventListener('click', () => {
          removeFromCart(button.getAttribute('data-item-key'));
        });
      });

      cartTotalEl.textContent = `Total: LKR ${cartData.cartTotal.toFixed(2)}`; // Update currency
    }
  };

  // Generic cart handling so it works on any page (catalog, product, index, ...)
  const CART_OPEN_CLASS = 'cart-open';
  const body = document.body;
  const cartPanel = document.querySelector('.cart-panel'); // optional panel element

  function setCartOpen(open) {
    if (cartPanel) {
      cartPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    body.classList.toggle(CART_OPEN_CLASS, !!open);
  }

  // Attach direct listeners to any existing toggles
  document.querySelectorAll('.cart-toggle, [data-action="toggle-cart"]').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      setCartOpen(!body.classList.contains(CART_OPEN_CLASS));
    });
  });

  // Delegated listener - covers dynamically added icons and icons on any page
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.cart-toggle, [data-action="open-cart"], [data-action="toggle-cart"]');
    if (!btn) return;
    ev.preventDefault();
    if (btn.matches('[data-action="open-cart"]')) {
      setCartOpen(true);
    } else if (btn.matches('[data-action="close-cart"]')) {
      setCartOpen(false);
    } else {
      setCartOpen(!body.classList.contains(CART_OPEN_CLASS));
    }
  });

  // Close cart on Escape
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') setCartOpen(false);
  });

  // Event listeners
  cartIcon?.addEventListener('click', openCart);
  cartClose?.addEventListener('click', closeCart);
  cartOverlay?.addEventListener('click', closeCart);

  cartCheckoutBtn?.addEventListener('click', () => {

    // Bypass the cart check and go directly to checkout
    console.warn("DEMO FIX: Bypassing cart check for checkout.");
    window.location.href = 'checkout.html';


    /* // Original code (commented out):
    fetchCartAPI('').then(cartData => {
      if (cartData && cartData.items && cartData.items.length > 0) {
        window.location.href = 'checkout.html';
      } else {
        alert("Your cart is empty.");
        closeCart();
      }
    }).catch(() => {
      alert("Could not verify cart status. Please try again.");
    });
    */
  });

  addToCartBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // --- IMPORTANT: Get Product ID and Price ---
      // Modify product.html and catalog.html generation to include product ID
      // For now, assuming product ID might be in URL or a data attribute
      let productId = btn.getAttribute('data-product-id'); // Add this attribute to your buttons
      if (!productId) {
        // Fallback: try getting from URL on product page
        const urlParams = new URLSearchParams(window.location.search);
        productId = urlParams.get('id');
      }

      const price = btn.getAttribute('data-price');
      // const attributeValueId = btn.getAttribute('data-attribute-id'); // Add if you have variants

      if (!productId || !price) {
        console.error("Missing product ID or price on button:", btn);
        alert("Could not add item to cart (missing info).");
        return;
      }

      addToCart(productId, price /*, attributeValueId */); // Pass relevant data
    });
  });
  // Initial cart load when the page is ready
  fetchCartFromServer();

  // Make removeFromCart globally available
  window.removeFromCart = removeFromCart;
});
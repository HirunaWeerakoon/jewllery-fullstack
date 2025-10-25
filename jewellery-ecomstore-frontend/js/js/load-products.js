document.addEventListener("DOMContentLoaded", async () => {
    const productsContainer = document.createElement("section");
    productsContainer.className = "product-list";
    productsContainer.innerHTML = `<h2>Our Products</h2><div id="productGrid" class="product-grid"></div>`;
    document.querySelector("main").appendChild(productsContainer);

    const grid = document.getElementById("productGrid");

    try {
        // 👇 Fetch from your backend (port 8081)
        const response = await fetch("http://localhost:8081/api/public/products");
        if (!response.ok) throw new Error("Failed to load products");

        const products = await response.json();

        if (products.length === 0) {
            grid.innerHTML = "<p>No products found.</p>";
            return;
        }

        // Render each product card
        products.forEach(p => {
            const card = document.createElement("div");
            card.className = "product-card";
            const imageUrl =
                (p.images && p.images.length > 0 && p.images[0].imageUrl) ||
                "images/placeholder.jpg"; // fallback if no image
            card.innerHTML = `
        <img src="${imageUrl}" alt="${p.productName}" class="product-image" />
        <h3>${p.productName}</h3>
        <p>${p.description || ""}</p>
        <strong>Rs. ${p.basePrice}</strong>
      `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading products:", error);
        grid.innerHTML = "<p>Could not load products. Please try again later.</p>";
    }
});

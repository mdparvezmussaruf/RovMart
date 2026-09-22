document.addEventListener("DOMContentLoaded", () => {
  cleanCart();
  renderCartUI();
  renderProductGrid();
  bindGlobalEvents();
  initReveal();
  initCursor();

  const imagePath = new URLSearchParams(location.search).get("id");
  if (document.getElementById("productDetail") && imagePath) {
    // product.html has an inline call to renderProductDetail().
  }
});

function renderProductGrid() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const available = products.filter(p => p.available);
  const count = document.getElementById("productCount");
  if (count) count.textContent = `${available.length} pieces`;

  grid.innerHTML = available.map((product, index) => `
    <article class="product-card reveal" style="--delay:${index * 70}ms">
      <a class="product-image-wrap zoom-image" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${escapeHtml(product.name)}">
        <span class="product-index">${String(index + 1).padStart(2, "0")}</span>
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
        <span class="image-hover-label">View piece <b>↗</b></span>
        <span class="zoom-lens" aria-hidden="true"></span>
      </a>
      <div class="product-card-info">
        <div class="product-copy">
          <span class="product-category">${escapeHtml(product.category)}</span>
          <a class="product-title" href="product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a>
          <span class="product-price">${formatBDT(product.price)}</span>
        </div>
        <button class="button button-small button-outline" type="button" data-add="${product.id}"><span>Add</span><b>+</b></button>
      </div>
    </article>
  `).join("");

  setupZoomImages();
}

function renderProductDetail() {
  const container = document.getElementById("productDetail");
  if (!container) return;

  const id = new URLSearchParams(location.search).get("id");
  const product = products.find(p => p.id === id);

  if (!product) {
    container.innerHTML = `
      <div class="not-found">
        <p class="eyebrow">NOT FOUND</p>
        <h1>That piece doesn't exist.</h1>
        <a class="button button-dark" href="index.html#shop">Back to collection</a>
      </div>
    `;
    return;
  }

  document.title = `${product.name} — NOIRÉ`;

  container.innerHTML = `
    <div class="detail-media-column">
      <div class="detail-image zoom-image">
        <span class="detail-index">NOIRÉ / ${escapeHtml(product.id)}</span>
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
        <span class="zoom-lens" aria-hidden="true"></span>
      </div>
      <p class="media-caption">Hover to inspect the texture and finish.</p>
    </div>
    <div class="detail-copy">
      <p class="eyebrow">${escapeHtml(product.category)}</p>
      <h1>${escapeHtml(product.name)}</h1>
      <div class="price-line">
        <strong>${formatBDT(product.price)}</strong>
        ${product.oldPrice ? `<del>${formatBDT(product.oldPrice)}</del>` : ""}
      </div>
      <p class="detail-description">${escapeHtml(product.description)}</p>
      <ul class="detail-list">
        ${product.details.map(detail => `<li>${escapeHtml(detail)}</li>`).join("")}
      </ul>
      <div class="purchase-row">
        <label class="quantity-selector">
          <span>Qty</span>
          <button type="button" data-detail-minus>−</button>
          <input id="detailQuantity" type="number" min="1" max="99" value="1" aria-label="Quantity">
          <button type="button" data-detail-plus>+</button>
        </label>
        <button class="button button-dark" type="button" data-detail-add="${product.id}">
          ${product.available ? "Add to cart" : "Unavailable"}
        </button>
      </div>
      <p class="availability">${product.available ? "In stock" : "Currently unavailable"}</p>
    </div>
  `;

  setupZoomImages();
  initReveal();

  const qtyInput = document.getElementById("detailQuantity");
  const addButton = container.querySelector("[data-detail-add]");
  container.querySelector("[data-detail-minus]")?.addEventListener("click", () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
  });
  container.querySelector("[data-detail-plus]")?.addEventListener("click", () => {
    qtyInput.value = Math.min(99, Number(qtyInput.value) + 1);
  });
  addButton?.addEventListener("click", () => addToCart(product.id, Number(qtyInput.value)));
}

function setupZoomImages() {
  document.querySelectorAll(".zoom-image").forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const lens = wrapper.querySelector(".zoom-lens");
    if (!img || !lens) return;

    const move = event => {
      if (event.pointerType === "touch") return;
      const rect = wrapper.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      img.style.transformOrigin = `${x * 100}% ${y * 100}%`;
      img.style.transform = "scale(2.15)";
      lens.style.left = `${x * 100}%`;
      lens.style.top = `${y * 100}%`;
      lens.classList.add("active");
    };

    const reset = () => {
      img.style.transform = "";
      img.style.transformOrigin = "";
      lens.classList.remove("active");
    };

    wrapper.addEventListener("pointermove", move);
    wrapper.addEventListener("pointerleave", reset);
  });
}

function bindGlobalEvents() {
  document.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    if (add) addToCart(add.dataset.add);

    const plus = event.target.closest("[data-cart-plus]");
    if (plus) {
      const item = getCart().find(i => i.id === plus.dataset.cartPlus);
      if (item) updateCartQuantity(item.id, item.quantity + 1);
    }

    const minus = event.target.closest("[data-cart-minus]");
    if (minus) {
      const item = getCart().find(i => i.id === minus.dataset.cartMinus);
      if (item) updateCartQuantity(item.id, item.quantity - 1);
    }

    const remove = event.target.closest("[data-cart-remove]");
    if (remove) removeFromCart(remove.dataset.cartRemove);
  });

  document.getElementById("cartLink")?.addEventListener("click", openCartDrawer);
  document.getElementById("closeCartBtn")?.addEventListener("click", closeCartDrawer);
  document.getElementById("cartDrawer")?.addEventListener("click", e => {
    if (e.target.id === "cartDrawer") closeCartDrawer();
  });

  document.getElementById("confirmOrderBtn")?.addEventListener("click", openOrderModal);
  document.getElementById("drawerConfirmBtn")?.addEventListener("click", () => {
    closeCartDrawer();
    openOrderModal();
  });

  document.getElementById("closeOrderBtn")?.addEventListener("click", closeOrderModal);
  document.getElementById("orderModal")?.addEventListener("click", e => {
    if (e.target.id === "orderModal") closeOrderModal();
  });
  document.getElementById("orderForm")?.addEventListener("submit", submitOrder);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeCartDrawer();
      closeOrderModal();
    }
  });
}

function openCartDrawer() {
  renderCartUI();
  const drawer = document.getElementById("cartDrawer");
  if (!drawer) return;
  drawer.classList.remove("hidden");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  if (!drawer) return;
  drawer.classList.add("hidden");
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { items.forEach(el => el.classList.add("is-visible")); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), {threshold:.12});
  items.forEach(el => observer.observe(el));
}

function initCursor() {
  const dot=document.getElementById("cursorDot");
  if(!dot || window.matchMedia("(pointer: coarse)").matches) return;
  document.addEventListener("pointermove", e => { dot.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`; });
  document.addEventListener("pointerover", e => dot.classList.toggle("cursor-active", !!e.target.closest("a,button,.zoom-image")));
}

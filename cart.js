const CART_KEY = "noire_fashion_cart";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const cart = raw ? JSON.parse(raw) : [];
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartUI();
}

function cleanCart() {
  const validIds = new Set(products.map(p => p.id));
  const cleaned = getCart().filter(item =>
    validIds.has(item.id) &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
  if (JSON.stringify(cleaned) !== JSON.stringify(getCart())) saveCart(cleaned);
  return cleaned;
}

function addToCart(productId, quantity = 1) {
  const product = products.find(p => p.id === productId);
  if (!product || !product.available) return;

  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if (existing) existing.quantity += Math.max(1, quantity);
  else cart.push({ id: productId, quantity: Math.max(1, quantity) });
  saveCart(cart);
  showToast(`${product.name} added to cart`);
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.quantity = Math.max(0, Math.floor(quantity));
  saveCart(cart.filter(i => i.quantity > 0));
}

function removeFromCart(productId) {
  saveCart(getCart().filter(i => i.id !== productId));
}

function getDetailedCart() {
  return cleanCart().map(item => {
    const product = products.find(p => p.id === item.id);
    return product ? {
      ...product,
      quantity: item.quantity,
      subtotal: product.price * item.quantity
    } : null;
  }).filter(Boolean);
}

function getCartQuantity() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal() {
  return getDetailedCart().reduce((sum, item) => sum + item.subtotal, 0);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  renderCartUI();
}

function formatBDT(value) {
  return `৳${Number(value).toLocaleString("en-BD")}`;
}

function renderCartUI() {
  const quantity = getCartQuantity();
  const total = getCartTotal();

  document.querySelectorAll("#headerCartCount").forEach(el => el.textContent = quantity);
  const floating = document.getElementById("floatingCart");
  if (floating) {
    floating.classList.toggle("hidden", quantity === 0);
    const q = document.getElementById("floatingQuantity");
    const t = document.getElementById("floatingTotal");
    if (q) q.textContent = quantity;
    if (t) t.textContent = formatBDT(total);
  }

  const drawerTotal = document.getElementById("drawerTotal");
  if (drawerTotal) drawerTotal.textContent = formatBDT(total);

  const container = document.getElementById("cartItems");
  if (!container) return;

  const items = getDetailedCart();
  container.innerHTML = items.length ? items.map(item => `
    <article class="cart-item">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
      <div class="cart-item-info">
        <a href="product.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.name)}</a>
        <span>${formatBDT(item.price)}</span>
        <div class="quantity-controls">
          <button type="button" data-cart-minus="${item.id}" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-cart-plus="${item.id}" aria-label="Increase quantity">+</button>
          <button class="remove-button" type="button" data-cart-remove="${item.id}">Remove</button>
        </div>
      </div>
    </article>
  `).join("") : `<p class="empty-state">Your cart is empty.</p>`;

  const confirm = document.getElementById("drawerConfirmBtn");
  if (confirm) confirm.disabled = items.length === 0;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}
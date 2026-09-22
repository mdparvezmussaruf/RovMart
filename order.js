function openOrderModal() {
  if (getCartQuantity() === 0) {
    showToast("Your cart is empty");
    return;
  }
  renderOrderSummary();
  const modal = document.getElementById("orderModal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeOrderModal() {
  const modal = document.getElementById("orderModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

function renderOrderSummary() {
  const container = document.getElementById("orderSummary");
  if (!container) return;
  const items = getDetailedCart();

  container.innerHTML = `
    <div class="summary-list">
      ${items.map(item => `
        <div class="summary-product">
          <img src="${escapeHtml(item.image)}" alt="">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span>Qty ${item.quantity} × ${formatBDT(item.price)}</span>
          </div>
          <strong>${formatBDT(item.subtotal)}</strong>
        </div>
      `).join("")}
    </div>
    <div class="summary-row total-row">
      <span>Total</span>
      <strong>${formatBDT(getCartTotal())}</strong>
    </div>
  `;
}

function validateOrderForm() {
  const name = document.getElementById("customerName");
  const phone = document.getElementById("phone");
  const address = document.getElementById("address");
  let valid = true;

  [name, phone, address].forEach(el => el.classList.remove("invalid"));
  document.querySelectorAll(".error").forEach(el => el.textContent = "");

  if (!name.value.trim() || name.value.trim().length < 2) {
    name.classList.add("invalid");
    document.getElementById("customerNameError").textContent = "Please enter your full name.";
    valid = false;
  }

  const normalizedPhone = phone.value.replace(/[\s-]/g, "");
  if (!/^(\+8801|01)\d{9}$/.test(normalizedPhone)) {
    phone.classList.add("invalid");
    document.getElementById("phoneError").textContent = "Enter a valid Bangladesh mobile number.";
    valid = false;
  }

  if (!address.value.trim() || address.value.trim().length < 8) {
    address.classList.add("invalid");
    document.getElementById("addressError").textContent = "Please enter your delivery address.";
    valid = false;
  }

  return valid;
}

async function submitOrder(event) {
  event.preventDefault();

  if (!validateOrderForm()) return;
  if (getCartQuantity() === 0) {
    showFormMessage("Your cart is empty.", true);
    return;
  }

  if (!CONFIG.GOOGLE_SCRIPT_URL || CONFIG.GOOGLE_SCRIPT_URL.includes("PASTE_YOUR")) {
    showFormMessage("Google Sheets is not connected yet. Add your Apps Script Web App URL in config.js.", true);
    return;
  }

  const button = document.getElementById("submitOrderBtn");
  const form = document.getElementById("orderForm");
  const items = getDetailedCart();

  const orderData = {
    customerName: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    address: document.getElementById("address").value.trim(),
    note: document.getElementById("note").value.trim(),
    items: items.map(item => ({
      id: item.id,
      quantity: item.quantity
    }))
  };

  button.disabled = true;
  button.textContent = "Submitting...";
  showFormMessage("");

  try {
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Unable to submit order.");
    }

    clearCart();
    form.reset();
    showOrderSuccess(result.orderId);
  } catch (error) {
    showFormMessage("Something went wrong while placing your order. Please try again.", true);
    button.disabled = false;
    button.textContent = "Submit order";
  }
}

function showFormMessage(message, isError = false) {
  const el = document.getElementById("formMessage");
  if (!el) return;
  el.textContent = message;
  el.className = `form-message ${isError ? "error-message" : ""}`;
}

function showOrderSuccess(orderId) {
  const content = document.getElementById("orderContent");
  content.innerHTML = `
    <div class="success-screen">
      <div class="success-mark">✓</div>
      <p class="eyebrow">ORDER RECEIVED</p>
      <h2>Thank you for your order.</h2>
      <p>Your order has been successfully submitted.</p>
      <div class="order-id-box">
        <span>Order ID</span>
        <strong>${escapeHtml(orderId)}</strong>
      </div>
      <button class="button button-dark full" type="button" id="continueShoppingBtn">Continue shopping</button>
    </div>
  `;
  document.getElementById("continueShoppingBtn").addEventListener("click", () => {
    closeOrderModal();
    location.href = "index.html#shop";
  });
}
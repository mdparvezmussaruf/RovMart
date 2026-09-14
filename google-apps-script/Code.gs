/*
  NOIRÉ Fashion Store - Google Apps Script backend

  Google Sheet:
  Create a spreadsheet and a sheet named "Orders".
  The first row should contain:
  Order ID | Date | Time | Customer Name | Phone | Delivery Address |
  Product IDs | Product Names | Quantities | Unit Prices | Subtotal |
  Total Amount | Order Status | Additional Note

  IMPORTANT:
  The backend keeps the authoritative product prices here.
  Update this catalog whenever you change prices in products.js.
*/

const CONFIG = {
  SHEET_NAME: "Orders",
  TIMEZONE: "Asia/Dhaka",
  CURRENCY: "BDT",
  PRODUCTS: {
    P001: { name: "Noir Oversized Tee", price: 1290, available: true },
    P002: { name: "Studio Linen Shirt", price: 1890, available: true },
    P003: { name: "Essential Denim Jacket", price: 2490, available: true },
    P004: { name: "Minimal Cargo Trouser", price: 2190, available: true },
    P005: { name: "Quiet Form Hoodie", price: 1990, available: true },
    P006: { name: "Monochrome Polo", price: 1490, available: true },
    P007: { name: "Relaxed Chino", price: 1790, available: true },
    P008: { name: "Signature Overshirt", price: 2290, available: true }
  }
};

function doGet() {
  return jsonResponse_({ success: true, message: "NOIRÉ order API is running." });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ success: false, message: "Invalid request." });
    }

    const data = JSON.parse(e.postData.contents);
    const validated = validateAndCalculate_(data);
    const sheet = getOrdersSheet_();

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
      const now = new Date();
      const orderId = createOrderId_(now, sheet);
      const date = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd");
      const time = Utilities.formatDate(now, CONFIG.TIMEZONE, "HH:mm:ss");

      sheet.appendRow([
        orderId,
        date,
        time,
        validated.customerName,
        validated.phone,
        validated.address,
        validated.productIds,
        validated.productNames,
        validated.quantities,
        validated.unitPrices,
        validated.subtotal,
        validated.total,
        "Pending",
        validated.note
      ]);

      return jsonResponse_({
        success: true,
        orderId: orderId,
        total: validated.total
      });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return jsonResponse_({
      success: false,
      message: "Unable to submit order."
    });
  }
}

function validateAndCalculate_(data) {
  const customerName = String(data.customerName || "").trim();
  const phone = String(data.phone || "").trim();
  const address = String(data.address || "").trim();
  const note = String(data.note || "").trim();
  const items = Array.isArray(data.items) ? data.items : [];

  if (customerName.length < 2 || customerName.length > 100) {
    throw new Error("Invalid customer name.");
  }

  // Accept common Bangladesh formats: 01XXXXXXXXX or +8801XXXXXXXXX.
  if (!/^(01\d{9}|\+8801\d{9})$/.test(phone.replace(/[\s-]/g, ""))) {
    throw new Error("Invalid phone number.");
  }

  if (address.length < 8 || address.length > 1000) {
    throw new Error("Invalid address.");
  }

  if (!items.length || items.length > 50) {
    throw new Error("Invalid cart.");
  }

  let subtotal = 0;
  const productIds = [];
  const productNames = [];
  const quantities = [];
  const unitPrices = [];

  items.forEach(item => {
    const id = String(item.id || "").trim();
    const quantity = Number(item.quantity);
    const product = CONFIG.PRODUCTS[id];

    if (!product || !product.available) {
      throw new Error("Invalid product.");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error("Invalid quantity.");
    }

    productIds.push(id);
    productNames.push(product.name);
    quantities.push(quantity);
    unitPrices.push(product.price);
    subtotal += product.price * quantity;
  });

  return {
    customerName,
    phone,
    address,
    note: note.slice(0, 1000),
    productIds: productIds.join(", "),
    productNames: productNames.join(", "),
    quantities: quantities.join(", "),
    unitPrices: unitPrices.join(", "),
    subtotal,
    total: subtotal
  };
}

function getOrdersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("No active spreadsheet.");
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Order ID", "Date", "Time", "Customer Name", "Phone",
      "Delivery Address", "Product IDs", "Product Names", "Quantities",
      "Unit Prices", "Subtotal", "Total Amount", "Order Status",
      "Additional Note"
    ]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function createOrderId_(date, sheet) {
  const datePart = Utilities.formatDate(date, CONFIG.TIMEZONE, "yyyyMMdd");
  const prefix = "ORD-" + datePart + "-";
  const lastRow = sheet.getLastRow();
  let sequence = 1;

  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const todayNumbers = values
      .filter(v => String(v).indexOf(prefix) === 0)
      .map(v => Number(String(v).split("-").pop()))
      .filter(n => Number.isFinite(n));
    if (todayNumbers.length) sequence = Math.max.apply(null, todayNumbers) + 1;
  }

  return prefix + String(sequence).padStart(4, "0");
}

function jsonResponse_(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
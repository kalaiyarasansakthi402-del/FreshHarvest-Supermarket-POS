/* ==========================================================================
   FRESHHARVEST SUPERMARKET - BILLING / POS ENGINE
   ========================================================================== */

// STATE
let currentCart = [];
let activeCategory = "All";
let selectedPaymentMethod = "Cash";

// STORAGE DATA GETTERS
function getProducts() {
  return JSON.parse(localStorage.getItem("pos_products") || "[]");
}

function saveProducts(products) {
  localStorage.setItem("pos_products", JSON.stringify(products));
}

function getCategories() {
  return JSON.parse(localStorage.getItem("pos_categories") || "[]");
}

function getCustomers() {
  return JSON.parse(localStorage.getItem("pos_customers") || "[]");
}

function getBills() {
  return JSON.parse(localStorage.getItem("pos_bills") || "[]");
}

function saveBills(bills) {
  localStorage.setItem("pos_bills", JSON.stringify(bills));
}

function getHeldBills() {
  return JSON.parse(localStorage.getItem("heldBillsList") || "[]");
}

function saveHeldBills(list) {
  localStorage.setItem("heldBillsList", JSON.stringify(list));
  updateHeldCount();
}

function saveCurrentCart() {
  localStorage.setItem("currentCart", JSON.stringify(currentCart));
}

function loadCurrentCart() {
  currentCart = JSON.parse(localStorage.getItem("currentCart") || "[]");
}

// RENDER CATEGORY PILLS
function renderCategoryPills() {
  const categories = getCategories();
  const container = document.getElementById("posCategoryPills");
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedCat = urlParams.get("cat");
  if (preselectedCat) {
    activeCategory = preselectedCat;
  }

  let html = `<button class="cat-pill ${activeCategory === 'All' ? 'active' : ''}" onclick="filterCategory('All')">All Items</button>`;
  categories.forEach(cat => {
    const visual = cat.image
      ? `<img src="${cat.image}" style="width:18px;height:18px;border-radius:4px;object-fit:cover;vertical-align:middle;margin-right:4px;">`
      : (cat.icon || cat.emoji || '🏷️');
    html += `
      <button class="cat-pill ${activeCategory === cat.name ? 'active' : ''}" onclick="filterCategory('${cat.name.replace(/'/g, "\\'")}')">
        ${visual} ${cat.name}
      </button>
    `;
  });

  container.innerHTML = html;
}

function filterCategory(catName) {
  activeCategory = catName;
  renderCategoryPills();
  renderProducts();
}

// RENDER PRODUCTS CATALOG
function renderProducts() {
  const products = getProducts();
  const container = document.getElementById("posProductsGrid");
  const searchVal = (document.getElementById("posSearchInput")?.value || "").toLowerCase().trim();
  if (!container) return;

  let filtered = products;

  if (activeCategory !== "All") {
    filtered = filtered.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());
  }

  if (searchVal) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchVal) ||
      p.category.toLowerCase().includes(searchVal)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <p>No products found matching criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isLowStock = p.stock <= (p.minStock || 10);
    return `
      <div class="pos-product-card" onclick="addToBill(${p.id})">
        <span class="stock-pill ${isLowStock ? 'low' : ''}">Stock: ${p.stock}</span>
        <div class="pos-product-img">
          <img src="${p.image}" alt="${p.name}">
        </div>
        <div class="pos-product-details">
          <h4>${p.name}</h4>
          <span class="unit">${p.unit || "1 unit"}</span>
          <div class="pos-card-footer">
            <span class="pos-price">₹${p.price}</span>
            <button class="btn-card-add" onclick="event.stopPropagation(); addToBill(${p.id})">
              + Add
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// BILL / CART OPERATIONS
function addToBill(productId) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (product.stock <= 0) {
    alert(`"${product.name}" is currently out of stock!`);
    return;
  }

  const existing = currentCart.find(item => item.id === productId);
  if (existing) {
    if (existing.qty + 1 > product.stock) {
      alert(`Cannot add more than available stock (${product.stock})!`);
      return;
    }
    existing.qty += 1;
  } else {
    currentCart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      cost: product.cost || 0,
      unit: product.unit || "1 unit",
      qty: 1
    });
  }

  saveCurrentCart();
  renderBillItems();
}

function updateItemQuantity(productId, delta) {
  const itemIndex = currentCart.findIndex(item => item.id === productId);
  if (itemIndex === -1) return;

  const products = getProducts();
  const product = products.find(p => p.id === productId);

  currentCart[itemIndex].qty += delta;

  if (product && currentCart[itemIndex].qty > product.stock) {
    alert(`Cannot exceed available stock of ${product.stock}`);
    currentCart[itemIndex].qty = product.stock;
  }

  if (currentCart[itemIndex].qty <= 0) {
    currentCart.splice(itemIndex, 1);
  }

  saveCurrentCart();
  renderBillItems();
}

function removeItemFromBill(productId) {
  currentCart = currentCart.filter(item => item.id !== productId);
  saveCurrentCart();
  renderBillItems();
}

function clearCurrentBill() {
  if (currentCart.length === 0) return;
  if (confirm("Are you sure you want to clear the current bill?")) {
    currentCart = [];
    saveCurrentCart();
    renderBillItems();
  }
}

// RENDER BILL ITEMS & TOTALS
function renderBillItems() {
  const container = document.getElementById("billItemsContainer");
  const countBadge = document.getElementById("billCountBadge");
  if (!container) return;

  const totalItemCount = currentCart.reduce((sum, item) => sum + item.qty, 0);
  if (countBadge) countBadge.textContent = totalItemCount;

  if (currentCart.length === 0) {
    container.innerHTML = `
      <div class="empty-bill-msg">
        <span>🛒</span>
        <p>Current Bill is Empty</p>
        <small>Click products on the left to add items.</small>
      </div>
    `;
    calculateTotals();
    return;
  }

  container.innerHTML = currentCart.map(item => {
    const itemTotal = item.price * item.qty;
    return `
      <div class="bill-item-row">
        <div class="bill-item-left">
          <span class="bill-item-name">${item.name}</span>
          <span class="bill-item-unit-price">₹${item.price} × ${item.qty}</span>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="updateItemQuantity(${item.id}, -1)">-</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="updateItemQuantity(${item.id}, 1)">+</button>
        </div>
        <span class="bill-item-total">₹${itemTotal.toFixed(2)}</span>
        <button class="btn-remove-item" onclick="removeItemFromBill(${item.id})" title="Remove item">✕</button>
      </div>
    `;
  }).join("");

  calculateTotals();
}

// CALCULATE SUBTOTAL, DISCOUNT, TAX, TOTAL
function calculateTotals() {
  const subtotalEl = document.getElementById("billSubtotal");
  const discountAmountEl = document.getElementById("billDiscountAmount");
  const taxAmountEl = document.getElementById("billTaxAmount");
  const grandTotalEl = document.getElementById("billGrandTotal");

  const discountPercent = parseFloat(document.getElementById("billDiscountInput")?.value || 0) || 0;
  const taxPercent = parseFloat(document.getElementById("billTaxInput")?.value || 0) || 0;

  const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const grandTotal = taxableAmount + taxAmount;

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
  if (discountAmountEl) discountAmountEl.textContent = `- ₹${discountAmount.toFixed(2)}`;
  if (taxAmountEl) taxAmountEl.textContent = `+ ₹${taxAmount.toFixed(2)}`;
  if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal.toFixed(2)}`;

  return { subtotal, discountPercent, discountAmount, taxPercent, taxAmount, grandTotal };
}

// HOLD CURRENT BILL
function holdCurrentBill() {
  if (currentCart.length === 0) {
    alert("Cannot hold an empty bill!");
    return;
  }

  const customerSelect = document.getElementById("billCustomerSelect");
  const customerName = customerSelect ? customerSelect.value : "Walk-in Customer";
  const totals = calculateTotals();

  const heldBills = getHeldBills();
  const newHeld = {
    id: "HOLD-" + Date.now(),
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    customer: customerName,
    items: [...currentCart],
    total: totals.grandTotal
  };

  heldBills.push(newHeld);
  saveHeldBills(heldBills);

  currentCart = [];
  saveCurrentCart();
  renderBillItems();

  alert(`Bill held successfully! (ID: ${newHeld.id})`);
}

function updateHeldCount() {
  const held = getHeldBills();
  const countEl = document.getElementById("heldCount");
  if (countEl) countEl.textContent = held.length;
}

function openHeldBillsModal() {
  const heldBills = getHeldBills();
  const container = document.getElementById("heldBillsListContainer");
  const modal = document.getElementById("heldBillsModal");
  if (!container || !modal) return;

  if (heldBills.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--text-muted);">No held bills in queue.</p>`;
  } else {
    container.innerHTML = heldBills.map((b, idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f8fafc; border:1px solid var(--border-color); border-radius:8px; margin-bottom:8px;">
        <div>
          <strong>${b.customer}</strong> (${b.items.length} items)
          <small style="display:block; color:var(--text-muted);">${b.date} • ₹${b.total.toFixed(2)}</small>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-primary" onclick="resumeHeldBill(${idx})">Resume</button>
          <button class="btn-secondary" onclick="deleteHeldBill(${idx})">✕</button>
        </div>
      </div>
    `).join("");
  }

  modal.classList.add("active");
}

function closeHeldBillsModal() {
  document.getElementById("heldBillsModal")?.classList.remove("active");
}

function resumeHeldBill(index) {
  const heldBills = getHeldBills();
  if (!heldBills[index]) return;

  if (currentCart.length > 0) {
    if (!confirm("Current active cart items will be replaced. Continue?")) return;
  }

  currentCart = [...heldBills[index].items];
  heldBills.splice(index, 1);
  saveHeldBills(heldBills);
  saveCurrentCart();
  renderBillItems();
  closeHeldBillsModal();
}

function deleteHeldBill(index) {
  const heldBills = getHeldBills();
  heldBills.splice(index, 1);
  saveHeldBills(heldBills);
  openHeldBillsModal();
}

// PAYMENT MODAL & COMPLETION
function openPaymentModal() {
  if (currentCart.length === 0) {
    alert("Please add items to bill before proceeding to payment!");
    return;
  }

  const totals = calculateTotals();
  const payModalTotal = document.getElementById("payModalTotal");
  if (payModalTotal) payModalTotal.textContent = `₹${totals.grandTotal.toFixed(2)}`;

  const receivedInput = document.getElementById("cashReceivedInput");
  if (receivedInput) {
    receivedInput.value = "";
  }
  calculateChange();

  document.getElementById("paymentModal")?.classList.add("active");
}

function closePaymentModal() {
  document.getElementById("paymentModal")?.classList.remove("active");
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  document.querySelectorAll(".pay-method-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`btnPay${method}`)?.classList.add("active");

  const cashSec = document.getElementById("cashCalcSection");
  const upiSec = document.getElementById("upiSection");
  const cardSec = document.getElementById("cardSection");

  if (cashSec) cashSec.style.display = method === "Cash" ? "block" : "none";
  if (upiSec) upiSec.style.display = method === "UPI" ? "block" : "none";
  if (cardSec) cardSec.style.display = method === "Card" ? "block" : "none";
}

function calculateChange() {
  const totals = calculateTotals();
  const received = parseFloat(document.getElementById("cashReceivedInput")?.value || 0) || 0;
  const changeDue = Math.max(0, received - totals.grandTotal);
  const changeDueEl = document.getElementById("changeDueAmount");
  if (changeDueEl) changeDueEl.textContent = `₹${changeDue.toFixed(2)}`;
}

function completeSaleTransaction() {
  const totals = calculateTotals();
  const customerSelect = document.getElementById("billCustomerSelect");
  const customerName = customerSelect ? customerSelect.value : "Walk-in Customer";

  // Check cash if Cash method
  if (selectedPaymentMethod === "Cash") {
    const received = parseFloat(document.getElementById("cashReceivedInput")?.value || 0) || 0;
    if (received > 0 && received < totals.grandTotal) {
      alert("Amount received is less than total payable amount!");
      return;
    }
  }

  // Generate Invoice Number
  const invoiceNo = "INV-" + (1000 + getBills().length + 1);
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Update Product Stocks
  const products = getProducts();
  currentCart.forEach(cartItem => {
    const p = products.find(prod => prod.id === cartItem.id);
    if (p) {
      p.stock = Math.max(0, p.stock - cartItem.qty);
    }
  });
  saveProducts(products);

  // 2. Save Completed Bill
  const newBill = {
    id: invoiceNo,
    invoiceNo: invoiceNo,
    date: dateStr,
    time: timeStr,
    customerName: customerName,
    items: [...currentCart],
    subtotal: totals.subtotal,
    discount: totals.discountAmount,
    tax: totals.taxAmount,
    total: totals.grandTotal,
    paymentMethod: selectedPaymentMethod,
    status: "Paid"
  };

  const bills = getBills();
  bills.unshift(newBill);
  saveBills(bills);

  // 3. Show Receipt Modal
  populateReceipt(newBill);
  closePaymentModal();
  document.getElementById("receiptModal")?.classList.add("active");

  // 4. Reset Cart
  currentCart = [];
  saveCurrentCart();
  renderBillItems();
  renderProducts(); // refresh stock badges
}

function populateReceipt(bill) {
  document.getElementById("recInvoiceNo").textContent = bill.invoiceNo;
  document.getElementById("recDateTime").textContent = `${bill.date} ${bill.time}`;
  document.getElementById("recCustomerName").textContent = bill.customerName;
  document.getElementById("recPayMethod").textContent = bill.paymentMethod;
  document.getElementById("recSubtotal").textContent = `₹${bill.subtotal.toFixed(2)}`;
  document.getElementById("recDiscount").textContent = `- ₹${bill.discount.toFixed(2)}`;
  document.getElementById("recTax").textContent = `+ ₹${bill.tax.toFixed(2)}`;
  document.getElementById("recTotal").textContent = `₹${bill.total.toFixed(2)}`;

  const itemsBody = document.getElementById("recItemsBody");
  if (itemsBody) {
    itemsBody.innerHTML = bill.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>₹${item.price}</td>
        <td>₹${(item.price * item.qty).toFixed(2)}</td>
      </tr>
    `).join("");
  }
}

function closeReceiptModal() {
  document.getElementById("receiptModal")?.classList.remove("active");
}

function populateCustomerSelect() {
  const customers = getCustomers();
  const select = document.getElementById("billCustomerSelect");
  if (!select) return;

  select.innerHTML = `<option value="Walk-in Customer">Walk-in Customer</option>` +
    customers.map(c => `<option value="${c.name}">${c.name} (${c.phone})</option>`).join("");
}

function setupQuickSearch() {
  const searchInput = document.getElementById("posSearchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    renderProducts();
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const val = searchInput.value.trim().toLowerCase();
      if (!val) return;
      const products = getProducts();
      const match = products.find(p => p.name.toLowerCase() === val || p.name.toLowerCase().includes(val));
      if (match) {
        addToBill(match.id);
        searchInput.value = "";
        renderProducts();
      }
    }
  });
}

// INITIALIZE ON LOAD
document.addEventListener("DOMContentLoaded", () => {
  loadCurrentCart();
  renderCategoryPills();
  renderProducts();
  renderBillItems();
  populateCustomerSelect();
  updateHeldCount();
  setupQuickSearch();
});

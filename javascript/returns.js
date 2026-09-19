/* ==========================================================================
   FRESHHARVEST SUPERMARKET - RETURNS SCRIPT
   ========================================================================== */

function getReturns() {
  return JSON.parse(localStorage.getItem("pos_returns") || "[]");
}

function saveReturns(list) {
  localStorage.setItem("pos_returns", JSON.stringify(list));
}

function getBills() {
  return JSON.parse(localStorage.getItem("pos_bills") || "[]");
}

function getProducts() {
  return JSON.parse(localStorage.getItem("pos_products") || "[]");
}

function saveProducts(products) {
  localStorage.setItem("pos_products", JSON.stringify(products));
}

function updateMetrics() {
  const returns = getReturns();
  const totalCount = returns.length;
  const totalRefund = returns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

  document.getElementById("metricTotalReturns").textContent = totalCount;
  document.getElementById("metricTotalRefunds").textContent = `₹${totalRefund.toFixed(2)}`;
}

function renderReturnsTable() {
  const returns = getReturns();
  const tbody = document.getElementById("returnsTableBody");
  const searchVal = (document.getElementById("returnSearchInput")?.value || "").toLowerCase().trim();

  if (!tbody) return;

  let filtered = returns;
  if (searchVal) {
    filtered = filtered.filter(r =>
      r.id.toLowerCase().includes(searchVal) ||
      (r.invoiceNo && r.invoiceNo.toLowerCase().includes(searchVal)) ||
      (r.customerName && r.customerName.toLowerCase().includes(searchVal)) ||
      (r.productName && r.productName.toLowerCase().includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No return records found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td><code>${r.invoiceNo}</code></td>
      <td>${r.date}</td>
      <td>${r.customerName || 'Walk-in'}</td>
      <td><strong>${r.productName}</strong></td>
      <td>${r.quantity}</td>
      <td style="color:var(--color-danger); font-weight:800;">₹${Number(r.refundAmount).toFixed(2)}</td>
      <td><small>${r.reason || 'Damaged'}</small></td>
      <td><span style="background:#dcfce7; color:#15803d; font-weight:700; font-size:0.75rem; padding:3px 8px; border-radius:99px;">${r.status || 'Completed'}</span></td>
    </tr>
  `).join("");
}

function openProcessReturnModal() {
  const bills = getBills();
  const select = document.getElementById("retInvoiceSelect");
  if (!select) return;

  select.innerHTML = bills.map(b => `
    <option value="${b.invoiceNo}">${b.invoiceNo} - ${b.customerName || 'Walk-in'} (₹${b.total.toFixed(2)})</option>
  `).join("");

  populateInvoiceItems();
  document.getElementById("returnModal")?.classList.add("active");
}

function populateInvoiceItems() {
  const bills = getBills();
  const selInv = document.getElementById("retInvoiceSelect")?.value;
  const bill = bills.find(b => b.invoiceNo === selInv);
  const itemSelect = document.getElementById("retItemSelect");

  if (!bill || !itemSelect || !bill.items) return;

  itemSelect.innerHTML = bill.items.map(item => `
    <option value="${item.id}" data-name="${item.name}" data-price="${item.price}" data-maxqty="${item.qty}">
      ${item.name} (Bought: ${item.qty} @ ₹${item.price})
    </option>
  `).join("");

  calculateRefundAmount();
}

function calculateRefundAmount() {
  const itemSelect = document.getElementById("retItemSelect");
  const selectedOpt = itemSelect?.options[itemSelect.selectedIndex];
  if (!selectedOpt) return;

  const price = parseFloat(selectedOpt.dataset.price) || 0;
  const qty = parseInt(document.getElementById("retQty")?.value, 10) || 0;
  const refund = price * qty;

  const refundEl = document.getElementById("retRefundAmount");
  if (refundEl) refundEl.value = refund.toFixed(2);
}

function closeReturnModal() {
  document.getElementById("returnModal")?.classList.remove("active");
}

function handleReturnSubmit(e) {
  e.preventDefault();
  const returns = getReturns();
  const bills = getBills();
  const products = getProducts();

  const invNo = document.getElementById("retInvoiceSelect").value;
  const bill = bills.find(b => b.invoiceNo === invNo);

  const itemSelect = document.getElementById("retItemSelect");
  const selectedOpt = itemSelect.options[itemSelect.selectedIndex];
  const prodId = parseInt(selectedOpt.value, 10);
  const prodName = selectedOpt.dataset.name;
  const price = parseFloat(selectedOpt.dataset.price) || 0;
  const qty = parseInt(document.getElementById("retQty").value, 10) || 1;
  const reason = document.getElementById("retReason").value;
  const refundAmount = price * qty;

  const retId = "RET-" + (100 + returns.length + 1);
  const dateStr = new Date().toISOString().split("T")[0];

  // 1. Add to return records
  returns.unshift({
    id: retId,
    invoiceNo: invNo,
    date: dateStr,
    customerName: bill ? bill.customerName : "Customer",
    productId: prodId,
    productName: prodName,
    quantity: qty,
    refundAmount: refundAmount,
    reason: reason,
    status: "Completed"
  });
  saveReturns(returns);

  // 2. Increase product stock in pos_products
  const prod = products.find(p => p.id === prodId || p.name.toLowerCase() === prodName.toLowerCase());
  if (prod) {
    prod.stock += qty;
    if (prod.stock > (prod.minStock || 10)) prod.status = "In Stock";
    saveProducts(products);
  }

  closeReturnModal();
  updateMetrics();
  renderReturnsTable();

  alert(`Return processed successfully! Refund of ₹${refundAmount.toFixed(2)} recorded and ${qty} units returned to stock.`);
}

document.addEventListener("DOMContentLoaded", () => {
  updateMetrics();
  renderReturnsTable();
  document.getElementById("returnSearchInput")?.addEventListener("input", renderReturnsTable);
});

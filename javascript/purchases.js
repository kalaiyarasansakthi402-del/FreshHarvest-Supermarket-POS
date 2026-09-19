/* ==========================================================================
   FRESHHARVEST SUPERMARKET - PURCHASES & PO SCRIPT
   ========================================================================== */

function getPurchases() {
  return JSON.parse(localStorage.getItem("purchasesList") || "[]");
}

function savePurchases(list) {
  localStorage.setItem("purchasesList", JSON.stringify(list));
}

function getSuppliers() {
  return JSON.parse(localStorage.getItem("suppliersList") || "[]");
}

function getProducts() {
  return JSON.parse(localStorage.getItem("pos_products") || "[]");
}

function saveProducts(products) {
  localStorage.setItem("pos_products", JSON.stringify(products));
}

function updateMetrics() {
  const purchases = getPurchases();
  const totalPO = purchases.length;
  const pendingPO = purchases.filter(p => p.status === "Pending").length;
  const receivedPO = purchases.filter(p => p.status === "Received").length;
  const totalCost = purchases.reduce((sum, p) => sum + Number(p.totalCost || 0), 0);

  document.getElementById("metricTotalPO").textContent = totalPO;
  document.getElementById("metricPendingPO").textContent = pendingPO;
  document.getElementById("metricReceivedPO").textContent = receivedPO;
  document.getElementById("metricTotalCost").textContent = `₹${totalCost.toFixed(2)}`;
}

function renderPurchasesTable() {
  const purchases = getPurchases();
  const tbody = document.getElementById("purchasesTableBody");
  const searchVal = (document.getElementById("poSearchInput")?.value || "").toLowerCase().trim();

  if (!tbody) return;

  let filtered = purchases;
  if (searchVal) {
    filtered = filtered.filter(p =>
      p.id.toLowerCase().includes(searchVal) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(searchVal)) ||
      (p.productName && p.productName.toLowerCase().includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No purchase orders found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isPending = p.status === "Pending";

    return `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td>${p.date}</td>
        <td><strong>${p.supplierName}</strong></td>
        <td>${p.productName}</td>
        <td>${p.quantity} units</td>
        <td><strong>₹${Number(p.totalCost).toFixed(2)}</strong></td>
        <td>
          <span class="status-badge ${isPending ? 'pending' : 'received'}">
            ${p.status}
          </span>
        </td>
        <td>
          <div class="action-btns">
            ${isPending ? `<button class="btn-receive" onclick="receiveStock('${p.id}')">Receive Stock</button>` : `<span style="font-size:0.75rem; color:#15803d; font-weight:700;">✓ In Stock</span>`}
            <button class="btn-del-po" onclick="deletePO('${p.id}')">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openNewPOModal() {
  const suppliers = getSuppliers();
  const products = getProducts();

  const supSelect = document.getElementById("poSupplier");
  const prodSelect = document.getElementById("poProduct");

  if (supSelect) {
    supSelect.innerHTML = suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
  }

  if (prodSelect) {
    prodSelect.innerHTML = products.map(p => `<option value="${p.id}">${p.name} (Current: ${p.stock})</option>`).join("");
    autoFillProductCost();
  }

  calculatePOTotal();
  document.getElementById("poModal")?.classList.add("active");
}

function autoFillProductCost() {
  const products = getProducts();
  const prodId = parseInt(document.getElementById("poProduct")?.value, 10);
  const prod = products.find(p => p.id === prodId);
  const costInput = document.getElementById("poUnitCost");
  if (prod && costInput) {
    costInput.value = prod.cost || (prod.price * 0.7).toFixed(2);
  }
  calculatePOTotal();
}

function calculatePOTotal() {
  const qty = parseInt(document.getElementById("poQuantity")?.value, 10) || 0;
  const unitCost = parseFloat(document.getElementById("poUnitCost")?.value) || 0;
  const total = qty * unitCost;

  const totalEl = document.getElementById("poEstimatedTotal");
  if (totalEl) {
    totalEl.textContent = `₹${total.toFixed(2)}`;
  }
}

function closePOModal() {
  document.getElementById("poModal")?.classList.remove("active");
}

function handlePOSubmit(e) {
  e.preventDefault();
  const purchases = getPurchases();
  const products = getProducts();

  const supplierName = document.getElementById("poSupplier").value;
  const prodId = parseInt(document.getElementById("poProduct").value, 10);
  const prod = products.find(p => p.id === prodId);
  const qty = parseInt(document.getElementById("poQuantity").value, 10) || 0;
  const unitCost = parseFloat(document.getElementById("poUnitCost").value) || 0;
  const totalCost = qty * unitCost;

  const poNumber = "PO-" + (1000 + purchases.length + 1);
  const dateStr = new Date().toISOString().split("T")[0];

  purchases.unshift({
    id: poNumber,
    date: dateStr,
    supplierName,
    productId: prodId,
    productName: prod ? prod.name : "Grocery Items",
    quantity: qty,
    unitCost,
    totalCost,
    status: "Pending"
  });

  savePurchases(purchases);
  closePOModal();
  updateMetrics();
  renderPurchasesTable();
}

function receiveStock(poId) {
  const purchases = getPurchases();
  const po = purchases.find(p => p.id === poId);
  if (!po) return;

  if (po.status === "Received") {
    alert("This purchase order has already been received.");
    return;
  }

  // Automatically update stock in pos_products
  const products = getProducts();
  const prod = products.find(p => p.id === po.productId || p.name.toLowerCase() === po.productName.toLowerCase());

  if (prod) {
    prod.stock += Number(po.quantity || 0);
    if (prod.stock > (prod.minStock || 10)) prod.status = "In Stock";
    else if (prod.stock > 0) prod.status = "Low Stock";
    saveProducts(products);
  }

  po.status = "Received";
  savePurchases(purchases);
  updateMetrics();
  renderPurchasesTable();

  alert(`Shipment received! Added ${po.quantity} units to inventory for "${po.productName}".`);
}

function deletePO(poId) {
  const purchases = getPurchases();
  if (confirm(`Are you sure you want to delete purchase order ${poId}?`)) {
    const updated = purchases.filter(p => p.id !== poId);
    savePurchases(updated);
    updateMetrics();
    renderPurchasesTable();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateMetrics();
  renderPurchasesTable();
  document.getElementById("poSearchInput")?.addEventListener("input", renderPurchasesTable);
});

/* ==========================================================================
   FRESHHARVEST SUPERMARKET - STOCK CONTROL SCRIPT
   ========================================================================== */

let currentFilter = "All";

function getProducts() {
  return JSON.parse(localStorage.getItem("pos_products") || "[]");
}

function saveProducts(products) {
  localStorage.setItem("pos_products", JSON.stringify(products));
}

function updateMetrics() {
  const products = getProducts();
  const totalUnits = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const inStock = products.filter(p => p.stock > (p.minStock || 10)).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 10)).length;
  const outOfStock = products.filter(p => p.stock <= 0).length;

  document.getElementById("metricTotalUnits").textContent = totalUnits;
  document.getElementById("metricInStock").textContent = inStock;
  document.getElementById("metricLowStock").textContent = lowStock;
  document.getElementById("metricOutOfStock").textContent = outOfStock;
}

function renderStockTable() {
  const products = getProducts();
  const tbody = document.getElementById("stockTableBody");
  const searchVal = (document.getElementById("stockSearchInput")?.value || "").toLowerCase().trim();
  if (!tbody) return;

  let filtered = products;

  if (currentFilter === "Low") {
    filtered = filtered.filter(p => p.stock > 0 && p.stock <= (p.minStock || 10));
  } else if (currentFilter === "Out") {
    filtered = filtered.filter(p => p.stock <= 0);
  }

  if (searchVal) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchVal) ||
      p.category.toLowerCase().includes(searchVal)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No products found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const min = p.minStock || 10;
    const pct = Math.min(100, Math.max(0, (p.stock / (min * 3)) * 100));
    let color = "#16a34a";
    if (p.stock <= 0) color = "#dc2626";
    else if (p.stock <= min) color = "#f59e0b";

    return `
      <tr>
        <td>
          <div class="prod-cell">
            <img src="${p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}" class="prod-thumb" alt="${p.name}">
            <div>
              <strong>${p.name}</strong>
              <small style="display:block; color:var(--text-muted);">${p.unit || '1 unit'}</small>
            </div>
          </div>
        </td>
        <td>${p.category}</td>
        <td><strong style="font-size: 1rem;">${p.stock}</strong></td>
        <td><span style="color: var(--text-muted);">${min}</span></td>
        <td>
          <div class="stock-meter-wrap">
            <div class="stock-meter-fill" style="width: ${pct}%; background: ${color};"></div>
          </div>
          <small style="color:${color}; font-weight:700;">${p.stock <= 0 ? 'Out of Stock' : (p.stock <= min ? 'Low Stock' : 'Good')}</small>
        </td>
        <td>
          <div class="quick-stock-btns">
            <button class="btn-stock-quick" onclick="quickAdjustStock(${p.id}, 10)">+10</button>
            <button class="btn-stock-quick" onclick="quickAdjustStock(${p.id}, 50)">+50</button>
            <button class="btn-stock-quick" onclick="quickAdjustStock(${p.id}, -10)">-10</button>
          </div>
        </td>
        <td>
          <button class="btn-adjust-link" onclick="openStockAdjustModal(${p.id})">Adjust</button>
        </td>
      </tr>
    `;
  }).join("");
}

function setStockFilter(type) {
  currentFilter = type;
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  event.target.classList.add("active");
  renderStockTable();
}

function quickAdjustStock(id, amount) {
  const products = getProducts();
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  prod.stock = Math.max(0, prod.stock + amount);
  if (prod.stock <= 0) prod.status = "Out of Stock";
  else if (prod.stock <= (prod.minStock || 10)) prod.status = "Low Stock";
  else prod.status = "In Stock";

  saveProducts(products);
  updateMetrics();
  renderStockTable();
}

function openStockAdjustModal(preselectedId = null) {
  const products = getProducts();
  const select = document.getElementById("adjustProductId");
  if (!select) return;

  select.innerHTML = products.map(p => `
    <option value="${p.id}" ${preselectedId === p.id ? 'selected' : ''}>
      ${p.name} (Current: ${p.stock})
    </option>
  `).join("");

  updateCurrentStockDisplay();
  document.getElementById("adjustQuantity").value = "";
  document.getElementById("stockAdjustModal")?.classList.add("active");
}

function updateCurrentStockDisplay() {
  const products = getProducts();
  const selId = parseInt(document.getElementById("adjustProductId")?.value, 10);
  const prod = products.find(p => p.id === selId);
  const display = document.getElementById("currentStockDisplay");
  if (display && prod) {
    display.textContent = `${prod.stock} ${prod.unit || 'units'}`;
  }
}

function closeStockAdjustModal() {
  document.getElementById("stockAdjustModal")?.classList.remove("active");
}

function handleStockAdjustment(e) {
  e.preventDefault();
  const products = getProducts();
  const selId = parseInt(document.getElementById("adjustProductId").value, 10);
  const type = document.getElementById("adjustType").value;
  const qty = parseInt(document.getElementById("adjustQuantity").value, 10) || 0;
  const prod = products.find(p => p.id === selId);

  if (!prod) return;

  if (type === "IN") {
    prod.stock += qty;
  } else if (type === "OUT") {
    prod.stock = Math.max(0, prod.stock - qty);
  } else if (type === "SET") {
    prod.stock = Math.max(0, qty);
  }

  if (prod.stock <= 0) prod.status = "Out of Stock";
  else if (prod.stock <= (prod.minStock || 10)) prod.status = "Low Stock";
  else prod.status = "In Stock";

  saveProducts(products);
  closeStockAdjustModal();
  updateMetrics();
  renderStockTable();
}

document.addEventListener("DOMContentLoaded", () => {
  updateMetrics();
  renderStockTable();
  document.getElementById("stockSearchInput")?.addEventListener("input", renderStockTable);
});

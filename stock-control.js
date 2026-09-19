/**
 * FreshHarvest Supermarket - Stock Control & Inventory Alerts Logic
 * Integrates with DataStore for stock transition alerts, expiry tracking, and restock actions.
 */

(function() {
  'use strict';

  let currentFilter = 'All';

  function initStock() {
    updateMetrics();
    renderStockTable();
    updateAlertsBadge();

    window.addEventListener('freshHarvestDataUpdated', () => {
      updateMetrics();
      renderStockTable();
      updateAlertsBadge();
    });

    window.addEventListener('freshHarvestStockAlert', () => {
      updateMetrics();
      renderStockTable();
      updateAlertsBadge();
    });

    document.getElementById('stockSearchInput')?.addEventListener('input', renderStockTable);
  }

  function updateMetrics() {
    if (!window.DataStore) return;
    const products = DataStore.getProducts();
    const settings = DataStore.getSettings();
    const defaultThreshold = settings.lowStockDefaultThreshold || 5;

    let totalUnits = 0;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach(p => {
      const stock = Number(p.stock) || 0;
      const thr = p.minStock || defaultThreshold;
      totalUnits += stock;

      if (stock <= 0) outOfStock++;
      else if (stock <= thr) lowStock++;
      else inStock++;
    });

    const elTotal = document.getElementById('metricTotalUnits');
    const elIn = document.getElementById('metricInStock');
    const elLow = document.getElementById('metricLowStock');
    const elOut = document.getElementById('metricOutOfStock');

    if (elTotal) elTotal.textContent = totalUnits;
    if (elIn) elIn.textContent = inStock;
    if (elLow) elLow.textContent = lowStock;
    if (elOut) elOut.textContent = outOfStock;
  }

  function getExpiryStatus(expiryDateStr) {
    if (!expiryDateStr) return { label: '🟢 Good', class: 'good' };
    const exp = new Date(expiryDateStr);
    if (isNaN(exp.getTime())) return { label: '🟢 Good', class: 'good' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: '🔴 Expired', class: 'expired', days: diffDays };
    } else if (diffDays <= 7) {
      return { label: `🟡 Expiring (${diffDays}d)`, class: 'warning', days: diffDays };
    }
    return { label: '🟢 Good', class: 'good', days: diffDays };
  }

  function renderStockTable() {
    if (!window.DataStore) return;
    const products = DataStore.getProducts();
    const settings = DataStore.getSettings();
    const defaultThreshold = settings.lowStockDefaultThreshold || 5;
    const tbody = document.getElementById('stockTableBody');
    const searchVal = (document.getElementById('stockSearchInput')?.value || '').toLowerCase().trim();
    if (!tbody) return;

    let filtered = products;

    if (currentFilter === 'Low') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock <= (p.minStock || defaultThreshold));
    } else if (currentFilter === 'Out') {
      filtered = filtered.filter(p => p.stock <= 0);
    } else if (currentFilter === 'Expiring') {
      filtered = filtered.filter(p => {
        const stat = getExpiryStatus(p.expiryDate);
        return stat.class === 'expired' || stat.class === 'warning';
      });
    }

    if (searchVal) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchVal) ||
        (p.category && p.category.toLowerCase().includes(searchVal)) ||
        (p.brand && p.brand.toLowerCase().includes(searchVal))
      );
    }

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 3rem; margin-bottom: 12px;">📊</div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main, #1e293b); margin-bottom: 8px;">No Stock Records</h3>
            <p style="color: var(--text-muted, #64748b); font-size: 0.92rem; max-width: 440px; margin: 0 auto 20px auto;">
              Add products to your catalog to monitor stock levels, threshold warnings, and expiry schedules.
            </p>
            <a href="products.html" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-weight: 700; text-decoration: none;">
              + Add Product
            </a>
          </td>
        </tr>
      `;
      return;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 48px 20px;">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">🔍</div>
            <h4 style="font-weight: 700; color: var(--text-main, #334155); margin-bottom: 6px;">No inventory items found</h4>
            <p style="color: var(--text-muted, #94a3b8); font-size: 0.88rem;">No items match the selected filter or search keywords.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const min = p.minStock || defaultThreshold;
      const pct = Math.min(100, Math.max(0, (p.stock / (min * 3)) * 100));
      let color = '#16a34a';
      if (p.stock <= 0) color = '#dc2626';
      else if (p.stock <= min) color = '#f59e0b';

      const expStatus = getExpiryStatus(p.expiryDate);

      return `
        <tr>
          <td>
            <div class="prod-cell" style="display: flex; align-items: center; gap: 10px;">
              <img src="${p.image || 'assets/placeholder.png'}" class="prod-thumb" alt="${p.name}" style="width: 42px; height: 42px; border-radius: 6px; object-fit: cover; background: #e2e8f0;" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'">
              <div>
                <strong>${p.name}</strong>
                <small style="display: block; color: #64748b;">${p.unit || '1 unit'} • ${p.brand || 'FreshHarvest'}</small>
              </div>
            </div>
          </td>
          <td>${p.category || 'Grocery'}</td>
          <td><strong style="font-size: 1.05rem; color: ${color};">${p.stock}</strong></td>
          <td><span style="color: #64748b;">${min}</span></td>
          <td>
            <div class="stock-meter-wrap" style="width: 100px; height: 7px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 4px;">
              <div class="stock-meter-fill" style="width: ${pct}%; height: 100%; background: ${color};"></div>
            </div>
            <small style="color:${color}; font-weight:700;">${p.stock <= 0 ? '🛑 Out of Stock' : (p.stock <= min ? '⚠️ Low Stock' : '🟢 Optimal')}</small>
          </td>
          <td>
            <span style="font-size: 0.8rem; font-weight: 700;">${expStatus.label}</span>
            ${p.expiryDate ? `<small style="display: block; color: #94a3b8;">${formatDateOnly(p.expiryDate)}</small>` : ''}
          </td>
          <td>
            <div class="quick-stock-btns" style="display: flex; gap: 4px;">
              <button class="btn-stock-quick" onclick="quickAdjustStock('${p.id}', 5)">+5</button>
              <button class="btn-stock-quick" onclick="quickAdjustStock('${p.id}', 10)">+10</button>
              <button class="btn-stock-quick" onclick="quickAdjustStock('${p.id}', 25)">+25</button>
              <button class="btn-stock-quick" onclick="quickAdjustStock('${p.id}', -5)">-5</button>
            </div>
          </td>
          <td>
            <button class="btn-adjust-link" onclick="openStockAdjustModal('${p.id}')">Adjust</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.setStockFilter = function(type) {
    currentFilter = type;
    document.getElementById('pillStockAll')?.classList.toggle('active', type === 'All');
    document.getElementById('pillStockLow')?.classList.toggle('active', type === 'Low');
    document.getElementById('pillStockOut')?.classList.toggle('active', type === 'Out');
    document.getElementById('pillStockExp')?.classList.toggle('active', type === 'Expiring');
    renderStockTable();
  };

  window.quickAdjustStock = function(id, amount) {
    if (!window.DataStore) return;
    DataStore.adjustStock(id, amount, true, 'Quick Stock Button');
    updateMetrics();
    renderStockTable();
    updateAlertsBadge();
  };

  window.openStockAdjustModal = function(preselectedId = null) {
    if (!window.DataStore) return;
    const products = DataStore.getProducts();
    const select = document.getElementById('adjustProductId');
    if (!select) return;

    select.innerHTML = products.map(p => `
      <option value="${p.id}" ${preselectedId === p.id ? 'selected' : ''}>
        ${p.name} (Current: ${p.stock} ${p.unit || 'units'})
      </option>
    `).join('');

    updateCurrentStockDisplay();
    const qtyInput = document.getElementById('adjustQuantity');
    if (qtyInput) qtyInput.value = '10';
    document.getElementById('stockAdjustModal')?.classList.add('active');
  };

  window.updateCurrentStockDisplay = function() {
    if (!window.DataStore) return;
    const selId = document.getElementById('adjustProductId')?.value;
    const prod = DataStore.getProductById(selId);
    const display = document.getElementById('currentStockDisplay');
    if (display && prod) {
      display.textContent = `${prod.stock} ${prod.unit || 'units'}`;
    }
  };

  window.closeStockAdjustModal = function() {
    document.getElementById('stockAdjustModal')?.classList.remove('active');
  };

  window.handleStockAdjustment = function(e) {
    e.preventDefault();
    if (!window.DataStore) return;

    const selId = document.getElementById('adjustProductId').value;
    const type = document.getElementById('adjustType').value;
    const qty = parseInt(document.getElementById('adjustQuantity').value, 10) || 0;
    const reason = document.getElementById('adjustReason').value;

    const prod = DataStore.getProductById(selId);
    if (!prod) return;

    if (type === 'IN') {
      DataStore.adjustStock(selId, qty, true, reason);
    } else if (type === 'OUT') {
      DataStore.adjustStock(selId, -qty, true, reason);
    } else if (type === 'SET') {
      DataStore.adjustStock(selId, qty, false, reason);
    }

    closeStockAdjustModal();
    updateMetrics();
    renderStockTable();
    updateAlertsBadge();
  };

  // ALERTS LOG
  function updateAlertsBadge() {
    if (!window.DataStore) return;
    const alerts = DataStore.getAlerts();
    const badge = document.getElementById('alertBadgeCount');
    if (badge) badge.textContent = alerts.length;
  }

  window.openAlertsHistoryModal = function() {
    if (!window.DataStore) return;
    const alerts = DataStore.getAlerts();
    const container = document.getElementById('alertsLogBody');
    if (!container) return;

    if (alerts.length === 0) {
      container.innerHTML = `<p style="text-align: center; padding: 20px; color: #94a3b8;">No recent stock alerts logged.</p>`;
    } else {
      container.innerHTML = alerts.map(alt => `
        <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 1.2rem;">${alt.type === 'out_of_stock' ? '🛑' : (alt.type === 'low_stock' ? '⚠️' : '✅')}</span>
          <div style="flex: 1;">
            <strong style="display: block; font-size: 0.88rem; color: #0f172a;">${alt.productName || 'Product'}</strong>
            <p style="font-size: 0.8rem; color: #475569; margin: 2px 0;">${alt.message}</p>
            <small style="color: #94a3b8;">${alt.formattedTime || formatDateTime(alt.timestamp)}</small>
          </div>
        </div>
      `).join('');
    }

    document.getElementById('alertsLogModal')?.classList.add('active');
  };

  window.closeAlertsHistoryModal = function() {
    document.getElementById('alertsLogModal')?.classList.remove('active');
  };

  // Auto initialize
  document.addEventListener('DOMContentLoaded', initStock);

})();

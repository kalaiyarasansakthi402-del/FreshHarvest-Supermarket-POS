/**
 * FreshHarvest Supermarket - Home & Dashboard Logic
 * Integrates with DataStore for real-time income calculations,
 * stock alert management, quick restock, and date-wise drill-downs.
 */

(function() {
  'use strict';

  let currentAlertFilter = 'all';

  function initHome() {
    renderIncomeDashboard();
    renderStockAlerts();
    renderDateWiseBreakdown();
    renderCategories();
    renderProductSections();
    renderSideCart();
    startCountdown();
    setupSearch();

    // Listen for data updates
    window.addEventListener('freshHarvestDataUpdated', onDataChanged);
    window.addEventListener('freshHarvestStockAlert', onDataChanged);
    window.addEventListener('freshHarvestBillCreated', onDataChanged);
  }

  function onDataChanged() {
    renderIncomeDashboard();
    renderStockAlerts();
    renderDateWiseBreakdown();
    renderProductSections();
    renderSideCart();
  }

  // 1. INCOME DASHBOARD & 5 PERIOD CARDS
  function renderIncomeDashboard() {
    if (!window.DataStore) return;
    const analytics = DataStore.getIncomeAnalytics();

    // Hero Today's Stats
    const heroToday = document.getElementById('heroTodayIncome');
    const heroBills = document.getElementById('heroBillCount');
    const heroCusts = document.getElementById('heroCustomerCount');
    const heroRef = document.getElementById('heroRefundAmount');
    const heroNet = document.getElementById('heroNetIncome');
    const heroCash = document.getElementById('heroCashIncome');
    const heroUpi = document.getElementById('heroUpiIncome');
    const heroCard = document.getElementById('heroCardIncome');
    const growthBadge = document.getElementById('heroGrowthBadge');
    const growthText = document.getElementById('heroGrowthText');

    if (heroToday) heroToday.textContent = formatCurrency(analytics.today.grossIncome);
    if (heroBills) heroBills.textContent = analytics.today.billCount;
    if (heroCusts) heroCusts.textContent = analytics.today.customerCount;
    if (heroRef) heroRef.textContent = formatCurrency(analytics.today.refunds);
    if (heroNet) heroNet.textContent = formatCurrency(analytics.today.netIncome);

    if (heroCash) heroCash.textContent = formatCurrency(analytics.today.cash);
    if (heroUpi) heroUpi.textContent = formatCurrency(analytics.today.upi);
    if (heroCard) heroCard.textContent = formatCurrency(analytics.today.card);

    if (growthBadge && growthText) {
      if (analytics.today.isPositiveChange) {
        growthBadge.className = 'hero-growth-badge';
        growthBadge.querySelector('.growth-icon').textContent = '▲';
        growthText.textContent = `+${analytics.today.percentageChange}% vs Yesterday`;
      } else {
        growthBadge.className = 'hero-growth-badge negative';
        growthBadge.querySelector('.growth-icon').textContent = '▼';
        growthText.textContent = `-${analytics.today.percentageChange}% vs Yesterday`;
      }
    }

    // 5 Multi-Period Cards
    const cardToday = document.getElementById('cardTodayIncome');
    const cardWeekly = document.getElementById('cardWeeklyIncome');
    const cardMonthly = document.getElementById('cardMonthlyIncome');
    const cardYearly = document.getElementById('cardYearlyIncome');
    const cardTotal = document.getElementById('cardTotalIncome');

    if (cardToday) cardToday.textContent = formatCurrency(analytics.periods.today);
    if (cardWeekly) cardWeekly.textContent = formatCurrency(analytics.periods.weekly);
    if (cardMonthly) cardMonthly.textContent = formatCurrency(analytics.periods.monthly);
    if (cardYearly) cardYearly.textContent = formatCurrency(analytics.periods.yearly);
    if (cardTotal) cardTotal.textContent = formatCurrency(analytics.periods.totalNet || analytics.periods.total);
  }

  // 2. STOCK ALERTS SECTION
  function renderStockAlerts() {
    if (!window.DataStore) return;
    const products = DataStore.getProducts();
    const settings = DataStore.getSettings();
    const defaultThreshold = settings.lowStockDefaultThreshold || 5;

    let lowCount = 0;
    let outCount = 0;

    products.forEach(p => {
      const thr = p.minStock || defaultThreshold;
      if (p.stock <= 0) outCount++;
      else if (p.stock <= thr) lowCount++;
    });

    const lowCountEl = document.getElementById('countLowStock');
    const outCountEl = document.getElementById('countOutStock');
    if (lowCountEl) lowCountEl.textContent = lowCount;
    if (outCountEl) outCountEl.textContent = outCount;

    const grid = document.getElementById('stockAlertsGrid');
    if (!grid) return;

    let filtered = products;
    if (currentAlertFilter === 'low') {
      filtered = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || defaultThreshold));
    } else if (currentAlertFilter === 'out') {
      filtered = products.filter(p => p.stock <= 0);
    } else {
      // Show alerts first, then others
      filtered = [...products].sort((a, b) => a.stock - b.stock);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 12px;">
          <span style="font-size: 2rem;">✅</span>
          <p style="margin-top: 6px; font-weight: 600;">No items found matching the selected stock filter.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.slice(0, 8).map(p => {
      const thr = p.minStock || defaultThreshold;
      let cardClass = '';
      let badgeHtml = '';

      if (p.stock <= 0) {
        cardClass = 'out-of-stock';
        badgeHtml = '<span style="color: #dc2626; font-weight: 800;">🛑 Out of Stock</span>';
      } else if (p.stock <= thr) {
        cardClass = 'low-stock';
        badgeHtml = `<span style="color: #d97706; font-weight: 800;">⚠️ Low Stock (${p.stock} left)</span>`;
      } else {
        badgeHtml = `<span style="color: #16a34a; font-weight: 700;">🟢 In Stock (${p.stock})</span>`;
      }

      return `
        <div class="alert-product-card ${cardClass}">
          <div class="ap-header">
            <img src="${p.image || 'assets/placeholder.png'}" alt="${p.name}" class="ap-img" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150&q=80'">
            <div class="ap-info">
              <h4>${p.name}</h4>
              <span>${p.category || 'Grocery'} • ${p.unit || 'Unit'}</span>
            </div>
          </div>
          <div class="ap-status-row">
            <span>Stock: <strong>${p.stock}</strong> (Min: ${thr})</span>
            ${badgeHtml}
          </div>
          <button class="btn-quick-restock" onclick="openQuickRestockModal('${p.id}')">
            ⚡ Quick Restock
          </button>
        </div>
      `;
    }).join('');
  }

  window.filterStockAlerts = function(type) {
    currentAlertFilter = type;
    document.getElementById('tabAlertsAll')?.classList.toggle('active', type === 'all');
    document.getElementById('tabAlertsLow')?.classList.toggle('active', type === 'low');
    document.getElementById('tabAlertsOut')?.classList.toggle('active', type === 'out');
    renderStockAlerts();
  };

  // 3. DATE-WISE BREAKDOWN TABLE
  function renderDateWiseBreakdown() {
    if (!window.DataStore) return;
    const breakdown = DataStore.getDateWiseBreakdown();
    const tbody = document.getElementById('dateWiseTableBody');
    if (!tbody) return;

    if (breakdown.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No billing records available yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = breakdown.map(row => `
      <tr>
        <td><strong>${row.formattedDate}</strong></td>
        <td><span class="badge" style="background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 700;">${row.billsCount}</span></td>
        <td>${formatCurrency(row.cash)}</td>
        <td>${formatCurrency(row.upi)}</td>
        <td>${formatCurrency(row.card)}</td>
        <td><strong>${formatCurrency(row.grossIncome)}</strong></td>
        <td style="color: ${row.refunds > 0 ? '#ef4444' : '#94a3b8'};">${formatCurrency(row.refunds)}</td>
        <td><strong style="color: #16a34a;">${formatCurrency(row.netIncome)}</strong></td>
        <td>
          <button class="btn-drill-down" onclick="openDrillDownModal('${row.dateStr}')">
            🔍 View Bills (${row.billsCount})
          </button>
        </td>
      </tr>
    `).join('');
  }

  // 4. DRILL DOWN MODAL
  window.openDrillDownModal = function(dateStr) {
    if (!window.DataStore) return;
    const bills = DataStore.getBills().filter(b => b.date && b.date.startsWith(dateStr));
    const modal = document.getElementById('drillDownModalBackdrop');
    const title = document.getElementById('drillDownModalTitle');
    const subtitle = document.getElementById('drillDownModalSubtitle');
    const tbody = document.getElementById('drillDownBillsBody');

    if (!modal || !tbody) return;

    title.textContent = `Bills for ${formatDateOnly(dateStr)}`;
    subtitle.textContent = `Total ${bills.length} transactions processed on this day`;

    if (bills.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 18px;">No bills recorded on this date.</td></tr>`;
    } else {
      tbody.innerHTML = bills.map(b => `
        <tr>
          <td><strong>${b.billNumber || b.id}</strong></td>
          <td>${b.date ? b.date.split('T')[1]?.substring(0, 5) || '—' : '—'}</td>
          <td>${b.customerName || 'Walk-in Customer'} ${b.customerPhone ? `<br><small style="color:#64748b;">${b.customerPhone}</small>` : ''}</td>
          <td><span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 0.78rem; font-weight: 700;">${b.paymentMethod || 'Cash'}</span></td>
          <td>${b.items ? b.items.length : 0} items</td>
          <td><strong>${formatCurrency(b.grandTotal)}</strong></td>
          <td><small>${b.cashier || 'Cashier'}</small></td>
        </tr>
      `).join('');
    }

    modal.classList.add('active');
  };

  window.closeDrillDownModal = function() {
    document.getElementById('drillDownModalBackdrop')?.classList.remove('active');
  };

  // 5. QUICK RESTOCK MODAL
  window.openQuickRestockModal = function(productId) {
    if (!window.DataStore) return;
    const prod = DataStore.getProductById(productId);
    if (!prod) return;

    document.getElementById('restockProdId').value = prod.id;
    document.getElementById('restockProdName').textContent = `${prod.name} (${prod.unit || 'Units'})`;
    document.getElementById('restockCurrentQty').textContent = `${prod.stock} ${prod.unit || 'units'}`;
    document.getElementById('restockAddQty').value = '10';

    document.getElementById('quickRestockModalBackdrop')?.classList.add('active');
  };

  window.closeQuickRestockModal = function() {
    document.getElementById('quickRestockModalBackdrop')?.classList.remove('active');
  };

  window.submitQuickRestock = function() {
    if (!window.DataStore) return;
    const prodId = document.getElementById('restockProdId').value;
    const addQty = parseInt(document.getElementById('restockAddQty').value, 10);

    if (isNaN(addQty) || addQty <= 0) {
      alert('Please enter a valid quantity to add.');
      return;
    }

    const updated = DataStore.adjustStock(prodId, addQty, true, 'Quick Restock from Home Dashboard');
    if (updated) {
      closeQuickRestockModal();
      renderStockAlerts();
      renderProductSections();
    }
  };

  // 6. CATEGORIES & PRODUCTS
  function renderCategories() {
    if (!window.DataStore) return;
    const cats = DataStore.getCategories();
    const container = document.getElementById('homeCategoryGrid');
    if (!container) return;

    container.innerHTML = cats.map(cat => {
      const visual = cat.image
        ? `<img src="${cat.image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : (cat.icon || cat.emoji || '🏷️');
      return `
        <a href="billing.html?cat=${encodeURIComponent(cat.name)}" class="category-card">
          <div class="cat-icon-circle">${visual}</div>
          <span>${cat.name}</span>
        </a>
      `;
    }).join('');
  }

  function renderProductSections(query = '') {
    if (!window.DataStore) return;
    let products = DataStore.getProducts();

    if (query) {
      const q = query.toLowerCase().trim();
      products = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // Flash Deals
    const flashGrid = document.getElementById('flashDealsGrid');
    if (flashGrid) {
      const flashItems = products.filter(p => p.isFlashDeal || p.discount > 0).slice(0, 4);
      flashGrid.innerHTML = flashItems.map(p => renderProductCard(p)).join('') || '<p style="color:#94a3b8;padding:12px;">No active deals currently.</p>';
    }

    // Featured
    const featGrid = document.getElementById('featuredGrid');
    if (featGrid) {
      const featItems = products.filter(p => p.isFeatured).slice(0, 4);
      featGrid.innerHTML = featItems.map(p => renderProductCard(p)).join('') || '<p style="color:#94a3b8;padding:12px;">No featured groceries available.</p>';
    }

    // Recommended
    const recGrid = document.getElementById('recommendedGrid');
    if (recGrid) {
      const recItems = products.filter(p => !p.isFeatured && !p.isFlashDeal).slice(0, 4);
      const itemsToRender = recItems.length > 0 ? recItems : products.slice(0, 4);
      recGrid.innerHTML = itemsToRender.map(p => renderProductCard(p)).join('');
    }
  }

  function renderProductCard(p) {
    const isOut = p.stock <= 0;
    return `
      <div class="product-card pos-product-card" data-product-id="${p.id}">
        ${p.discount ? `<span class="discount-badge">-${p.discount}%</span>` : ''}
        <div class="product-img-wrap">
          <img src="${p.image || 'assets/placeholder.png'}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'">
        </div>
        <div class="product-info">
          <h4>${p.name}</h4>
          <span class="unit">${p.unit || '1 unit'} • Stock: ${p.stock}</span>
          <div class="price-row">
            <span class="current-price">${formatCurrency(p.price)}</span>
            ${p.discount ? `<span class="old-price">${formatCurrency(p.price * (1 + p.discount/100))}</span>` : ''}
          </div>
        </div>
        <button class="btn-add-cart btn-card-add add-to-bill add-btn" data-product-id="${p.id}" data-action="add-to-bill" onclick="event.stopPropagation(); addToPOSCart('${p.id}')" ${isOut ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : ''}>
          ${isOut ? '🛑 Out of Stock' : '+ Add'}
        </button>
      </div>
    `;
  }

  // 7. POS CART SYNC
  window.addToPOSCart = function(productId) {
    if (!window.DataStore) {
      console.error('DataStore not loaded');
      return;
    }
    const res = DataStore.addToCart(productId, 1);
    if (res && res.success) {
      renderSideCart();
    }
  };
  window.addToBill = window.addToPOSCart;
  window.addProductToBill = window.addToPOSCart;
  window.addToCart = window.addToPOSCart;

  function renderSideCart() {
    const cart = window.DataStore ? DataStore.getCart() : JSON.parse(localStorage.getItem('currentCart') || '[]');
    const badge = document.getElementById('headerCartCount');
    const sideCount = document.getElementById('sideCartCount');
    const container = document.getElementById('sideCartItems');
    const subtotalEl = document.getElementById('sideCartSubtotal');

    const totalCount = cart.reduce((sum, i) => sum + (Number(i.quantity || i.qty) || 1), 0);
    if (badge) badge.textContent = totalCount;
    if (sideCount) sideCount.textContent = totalCount;

    if (!container || !subtotalEl) return;

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-msg">
          <span>🛒</span>
          <p>No active items in bill.</p>
          <small>Select products to add to current bill.</small>
        </div>
      `;
      subtotalEl.textContent = '₹0.00';
      return;
    }

    let subtotal = 0;
    container.innerHTML = cart.map(item => {
      const q = Number(item.quantity || item.qty) || 1;
      const total = (Number(item.price) || 0) * q;
      const unitText = item.unit ? ` (${item.unit})` : '';
      subtotal += total;
      return `
        <div class="cart-item-row" data-product-id="${item.productId || item.id}">
          <div style="display:flex;flex-direction:column;">
            <strong>${item.name}</strong>
            <small style="color:#64748b;">${formatCurrency(item.price)} × ${q}${unitText}</small>
          </div>
          <strong style="color:#16a34a;">${formatCurrency(total)}</strong>
        </div>
      `;
    }).join('');

    subtotalEl.textContent = formatCurrency(subtotal);
  }

  // 8. SEARCH & TIMER
  function setupSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      renderProductSections(e.target.value);
    });
  }

  function startCountdown() {
    let seconds = 8 * 3600 + 14 * 60 + 36;
    setInterval(() => {
      seconds--;
      if (seconds <= 0) seconds = 24 * 3600;
      const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');

      const hEl = document.getElementById('timerHours');
      const mEl = document.getElementById('timerMins');
      const sEl = document.getElementById('timerSecs');
      if (hEl && mEl && sEl) {
        hEl.textContent = h;
        mEl.textContent = m;
        sEl.textContent = s;
      }
    }, 1000);
  }

  // Event delegation on document for all + Add button clicks
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.add-to-bill, .btn-card-add, .btn-add-cart, .add-btn, [data-action="add-to-bill"]');
    if (btn) {
      const pId = btn.dataset.productId || btn.getAttribute('data-product-id');
      if (pId) {
        if (btn._homeClicked) return;
        btn._homeClicked = true;
        setTimeout(() => { btn._homeClicked = false; }, 250);
        window.addToPOSCart(pId);
      }
    }
  });

  // Reactive listeners
  window.addEventListener('freshHarvestCartUpdated', renderSideCart);
  window.addEventListener('storage', function(e) {
    if (e.key === 'currentCart' || e.key === 'pos_cart' || e.key === 'freshHarvestCart') {
      renderSideCart();
    }
  });

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome);
  } else {
    initHome();
  }

})();

/**
 * FreshHarvest Supermarket - Reports & Financial Analytics
 * Fully dynamic calculations from DataStore (Bills, Returns, Products, Messaging Log)
 */

(function() {
  'use strict';

  let currentMsgFilter = 'All';

  function initReports() {
    renderIncomeOverview();
    renderDateWiseBreakdown();
    renderMessagingHistory();
    renderPLAndTopProducts();

    window.addEventListener('freshHarvestDataUpdated', () => {
      renderIncomeOverview();
      renderDateWiseBreakdown();
      renderMessagingHistory();
      renderPLAndTopProducts();
    });

    window.addEventListener('freshHarvestBillCreated', () => {
      renderIncomeOverview();
      renderDateWiseBreakdown();
      renderMessagingHistory();
      renderPLAndTopProducts();
    });
  }

  // 1. TODAY'S INCOME HERO & 5 PERIODS
  function renderIncomeOverview() {
    if (!window.DataStore) return;
    const analytics = DataStore.getIncomeAnalytics();

    // Today's Hero Stats
    const todayInc = document.getElementById('repTodayIncome');
    const todayBills = document.getElementById('repTodayBills');
    const todayCusts = document.getElementById('repTodayCusts');
    const todayRef = document.getElementById('repTodayRefunds');
    const todayNet = document.getElementById('repTodayNet');
    const todayCash = document.getElementById('repTodayCash');
    const todayUpi = document.getElementById('repTodayUpi');
    const todayCard = document.getElementById('repTodayCard');
    const growthBadge = document.getElementById('repGrowthBadge');
    const growthText = document.getElementById('repGrowthText');

    if (todayInc) todayInc.textContent = formatCurrency(analytics.today.grossIncome);
    if (todayBills) todayBills.textContent = analytics.today.billCount;
    if (todayCusts) todayCusts.textContent = analytics.today.customerCount;
    if (todayRef) todayRef.textContent = formatCurrency(analytics.today.refunds);
    if (todayNet) todayNet.textContent = formatCurrency(analytics.today.netIncome);

    if (todayCash) todayCash.textContent = formatCurrency(analytics.today.cash);
    if (todayUpi) todayUpi.textContent = formatCurrency(analytics.today.upi);
    if (todayCard) todayCard.textContent = formatCurrency(analytics.today.card);

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

    // 5 Period Cards
    const cardToday = document.getElementById('repCardToday');
    const cardWeekly = document.getElementById('repCardWeekly');
    const cardMonthly = document.getElementById('repCardMonthly');
    const cardYearly = document.getElementById('repCardYearly');
    const cardTotal = document.getElementById('repCardTotal');

    if (cardToday) cardToday.textContent = formatCurrency(analytics.periods.today);
    if (cardWeekly) cardWeekly.textContent = formatCurrency(analytics.periods.weekly);
    if (cardMonthly) cardMonthly.textContent = formatCurrency(analytics.periods.monthly);
    if (cardYearly) cardYearly.textContent = formatCurrency(analytics.periods.yearly);
    if (cardTotal) cardTotal.textContent = formatCurrency(analytics.periods.totalNet || analytics.periods.total);
  }

  // 2. DATE-WISE BREAKDOWN TABLE
  function renderDateWiseBreakdown() {
    if (!window.DataStore) return;
    const breakdown = DataStore.getDateWiseBreakdown();
    const tbody = document.getElementById('repDateWiseTableBody');
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

  // 3. DRILL DOWN MODAL
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

  // 4. MESSAGING HISTORY
  function renderMessagingHistory() {
    if (!window.DataStore) return;
    const messages = DataStore.getMessages();
    const tbody = document.getElementById('messagesTableBody');
    if (!tbody) return;

    let filtered = messages;
    if (currentMsgFilter !== 'All') {
      filtered = messages.filter(m => m.channel && m.channel.toLowerCase() === currentMsgFilter.toLowerCase());
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No messages sent yet under this filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(m => `
      <tr>
        <td><strong>${m.formattedTime || formatDateTime(m.timestamp)}</strong></td>
        <td>
          <span style="background: ${m.channel === 'WhatsApp' ? '#dcfce7' : '#e0f2fe'}; color: ${m.channel === 'WhatsApp' ? '#15803d' : '#0369a1'}; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 0.8rem;">
            ${m.channel === 'WhatsApp' ? '📱 WhatsApp' : '💬 SMS'}
          </span>
        </td>
        <td><strong>${m.phone || '—'}</strong></td>
        <td>${m.customerName || 'Valued Customer'}</td>
        <td><small style="font-weight: 700;">${m.billId || '—'}</small></td>
        <td><strong>${formatCurrency(m.amount)}</strong></td>
        <td><span style="color: #16a34a; font-weight: 700;">✅ ${m.status || 'Sent'}</span></td>
      </tr>
    `).join('');
  }

  window.filterMessages = function(type) {
    currentMsgFilter = type;
    document.getElementById('pillMsgAll')?.classList.toggle('active', type === 'All');
    document.getElementById('pillMsgWA')?.classList.toggle('active', type === 'WhatsApp');
    document.getElementById('pillMsgSMS')?.classList.toggle('active', type === 'SMS');
    renderMessagingHistory();
  };

  // 5. P&L & TOP PRODUCTS
  function renderPLAndTopProducts() {
    if (!window.DataStore) return;
    const bills = DataStore.getBills();
    const products = DataStore.getProducts();
    const returns = DataStore.getReturns();

    let totalRevenue = 0;
    let totalCost = 0;
    const prodSalesMap = {};
    const catRevenueMap = {};

    bills.forEach(b => {
      const bTotal = Number(b.grandTotal) || 0;
      totalRevenue += bTotal;

      if (Array.isArray(b.items)) {
        b.items.forEach(item => {
          const p = products.find(prod => String(prod.id) === String(item.productId || item.id) || prod.name === item.name);
          const rawCost = p ? (p.cost !== undefined && p.cost !== null ? p.cost : p.costPrice) : null;
          const cost = rawCost !== null && !isNaN(Number(rawCost)) ? Number(rawCost) : (item.price * 0.7);
          const qty = Number(item.quantity || item.qty || 1);
          totalCost += cost * qty;

          // Prod sales map
          const pKey = item.name || 'Item';
          if (!prodSalesMap[pKey]) {
            prodSalesMap[pKey] = {
              name: item.name,
              category: p?.category || 'General',
              price: item.price,
              unitsSold: 0,
              totalRevenue: 0
            };
          }
          prodSalesMap[pKey].unitsSold += qty;
          prodSalesMap[pKey].totalRevenue += item.price * qty;

          // Cat map
          const catKey = p?.category || 'General';
          catRevenueMap[catKey] = (catRevenueMap[catKey] || 0) + (item.price * qty);
        });
      }
    });

    const totalRefunds = returns.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);
    const netRevenue = Math.max(0, totalRevenue - totalRefunds);
    const netProfit = Math.max(0, netRevenue - totalCost);
    const marginPct = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(1) : '0.0';

    const elRev = document.getElementById('repTotalRevenue');
    const elCost = document.getElementById('repTotalCost');
    const elProf = document.getElementById('repNetProfit');
    const elMarg = document.getElementById('repMarginPct');

    if (elRev) elRev.textContent = formatCurrency(totalRevenue);
    if (elCost) elCost.textContent = formatCurrency(totalCost);
    if (elProf) elProf.textContent = formatCurrency(netProfit);
    if (elMarg) elMarg.textContent = `${marginPct}%`;

    // Top Products
    const topBody = document.getElementById('topProductsBody');
    if (topBody) {
      const topList = Object.values(prodSalesMap).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
      if (topList.length === 0) {
        topBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 14px;">No product sales recorded yet.</td></tr>`;
      } else {
        topBody.innerHTML = topList.map(tp => `
          <tr>
            <td><strong>${tp.name}</strong></td>
            <td>${formatCurrency(tp.price)}</td>
            <td><span class="badge" style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${tp.unitsSold}</span></td>
            <td><strong style="color: #16a34a;">${formatCurrency(tp.totalRevenue)}</strong></td>
          </tr>
        `).join('');
      }
    }

    // Category breakdown
    const catContainer = document.getElementById('categoryRevenueList');
    if (catContainer) {
      const catList = Object.entries(catRevenueMap).sort((a, b) => b[1] - a[1]);
      if (catList.length === 0) {
        catContainer.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem;">No department sales yet.</p>`;
      } else {
        catContainer.innerHTML = catList.map(([cat, rev]) => {
          const pct = totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
          return `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                <strong>${cat}</strong>
                <span>${formatCurrency(rev)} (${pct}%)</span>
              </div>
              <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: #16a34a;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // Auto initialize
  document.addEventListener('DOMContentLoaded', initReports);

})();

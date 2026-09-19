/**
 * FreshHarvest Supermarket - Cashier Desk & Shift Reconciliation Logic
 */

(function() {
  'use strict';

  function formatCurrency(amt) {
    if (window.formatCurrency && window.formatCurrency !== formatCurrency) {
      return window.formatCurrency(amt);
    }
    const val = Number(amt) || 0;
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showToast(msg, type, title) {
    if (window.showToast) {
      return window.showToast(msg, type, title);
    }
    console.log(`[Toast] ${title ? title + ': ' : ''}${msg}`);
  }

  const OPENING_FLOAT = 2000.00;

  const DEFAULT_SHIFTS = [
    { id: 'SHF-101', date: '2026-09-17', time: '08:00 AM - 04:00 PM', cashier: 'Vikram Singh', openingFloat: 2000, totalSales: 1432.26, countedCash: 2324.90, variance: 0, status: 'Closed & Balanced' },
    { id: 'SHF-100', date: '2026-09-16', time: '08:00 AM - 04:00 PM', cashier: 'Priya Cashier', openingFloat: 2000, totalSales: 1845.50, countedCash: 2450.00, variance: 0, status: 'Closed & Balanced' }
  ];

  function initCashier() {
    renderShiftMetrics();
    renderShiftHistory();
    calcDenominations();

    window.addEventListener('freshHarvestBillCreated', renderShiftMetrics);
    window.addEventListener('freshHarvestDataUpdated', renderShiftMetrics);
  }

  function renderShiftMetrics() {
    if (!window.DataStore) return;
    const analytics = DataStore.getIncomeAnalytics();

    const cashSales = analytics.today.cash;
    const digitalSales = analytics.today.upi + analytics.today.card;
    const totalSales = analytics.today.grossIncome;
    const expectedCashInTill = OPENING_FLOAT + cashSales - analytics.today.refunds;

    const elExp = document.getElementById('shiftExpectedCash');
    const elFloat = document.getElementById('shiftOpeningFloat');
    const elCash = document.getElementById('shiftCashSales');
    const elDig = document.getElementById('shiftDigitalSales');
    const elTot = document.getElementById('shiftTotalSales');
    const elCount = document.getElementById('shiftBillsCount');
    const elExpTill = document.getElementById('expectedDrawerTotal');

    if (elExp) elExp.textContent = formatCurrency(expectedCashInTill);
    if (elFloat) elFloat.textContent = formatCurrency(OPENING_FLOAT);
    if (elCash) elCash.textContent = formatCurrency(cashSales);
    if (elDig) elDig.textContent = formatCurrency(digitalSales);
    if (elTot) elTot.textContent = formatCurrency(totalSales);
    if (elCount) elCount.textContent = analytics.today.billCount;
    if (elExpTill) elExpTill.textContent = formatCurrency(expectedCashInTill);

    calcDenominations();
  }

  window.calcDenominations = function() {
    const q500 = parseInt(document.getElementById('d500')?.value, 10) || 0;
    const q200 = parseInt(document.getElementById('d200')?.value, 10) || 0;
    const q100 = parseInt(document.getElementById('d100')?.value, 10) || 0;
    const q50 = parseInt(document.getElementById('d50')?.value, 10) || 0;
    const q20 = parseInt(document.getElementById('d20')?.value, 10) || 0;
    const q10 = parseInt(document.getElementById('d10')?.value, 10) || 0;
    const qCoins = parseFloat(document.getElementById('dCoins')?.value) || 0;

    const t500 = q500 * 500;
    const t200 = q200 * 200;
    const t100 = q100 * 100;
    const t50 = q50 * 50;
    const t20 = q20 * 20;
    const t10 = q10 * 10;
    const tCoins = qCoins;

    const totalCounted = t500 + t200 + t100 + t50 + t20 + t10 + tCoins;

    document.getElementById('d500Total').textContent = formatCurrency(t500);
    document.getElementById('d200Total').textContent = formatCurrency(t200);
    document.getElementById('d100Total').textContent = formatCurrency(t100);
    document.getElementById('d50Total').textContent = formatCurrency(t50);
    document.getElementById('d20Total').textContent = formatCurrency(t20);
    document.getElementById('d10Total').textContent = formatCurrency(t10);
    document.getElementById('dCoinsTotal').textContent = formatCurrency(tCoins);

    const actualCountedEl = document.getElementById('actualCountedTotal');
    if (actualCountedEl) actualCountedEl.textContent = formatCurrency(totalCounted);

    // Calculate variance
    if (window.DataStore) {
      const analytics = DataStore.getIncomeAnalytics();
      const expectedCash = OPENING_FLOAT + analytics.today.cash - analytics.today.refunds;
      const variance = totalCounted - expectedCash;
      const varianceEl = document.getElementById('drawerVariance');
      const statusEl = document.getElementById('reconcileStatusBadge');

      if (varianceEl) {
        if (totalCounted === 0) {
          varianceEl.textContent = '₹0.00';
          if (statusEl) {
            statusEl.textContent = 'Counting in progress...';
            statusEl.style.color = '#64748b';
          }
        } else if (Math.abs(variance) < 0.01) {
          varianceEl.textContent = '₹0.00';
          varianceEl.style.color = '#16a34a';
          if (statusEl) {
            statusEl.textContent = '✅ Balanced';
            statusEl.style.color = '#16a34a';
          }
        } else if (variance > 0) {
          varianceEl.textContent = `+${formatCurrency(variance)}`;
          varianceEl.style.color = '#f59e0b';
          if (statusEl) {
            statusEl.textContent = '⚠️ Excess';
            statusEl.style.color = '#f59e0b';
          }
        } else {
          varianceEl.textContent = `${formatCurrency(variance)}`;
          varianceEl.style.color = '#ef4444';
          if (statusEl) {
            statusEl.textContent = '🛑 Shortage';
            statusEl.style.color = '#ef4444';
          }
        }
      }
    }
  };

  window.resetDenominations = function() {
    const ids = ['d500', 'd200', 'd100', 'd50', 'd20', 'd10', 'dCoins'];
    const hasValues = ids.some(id => {
      const val = parseFloat(document.getElementById(id)?.value) || 0;
      return val > 0;
    });

    if (hasValues) {
      if (!confirm('Are you sure you want to reset all cash denomination counts to 0?')) {
        return;
      }
    }

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 0;
    });
    calcDenominations();
    showToast('Denomination counts reset to 0', 'info', 'Cash Drawer');
  };

  // SHIFT SETTLEMENT & HISTORY
  function getShiftHistory() {
    const saved = localStorage.getItem('freshHarvestShifts');
    return saved ? JSON.parse(saved) : DEFAULT_SHIFTS;
  }

  function renderShiftHistory() {
    const shifts = getShiftHistory();
    const tbody = document.getElementById('shiftHistoryBody');
    if (!tbody) return;

    tbody.innerHTML = shifts.map(s => `
      <tr>
        <td><strong>${s.id}</strong></td>
        <td>${s.date} <small style="display:block; color:#64748b;">${s.time}</small></td>
        <td><strong>${s.cashier}</strong></td>
        <td>${formatCurrency(s.openingFloat)}</td>
        <td><strong>${formatCurrency(s.totalSales)}</strong></td>
        <td>${formatCurrency(s.countedCash)}</td>
        <td style="color: ${s.variance === 0 ? '#16a34a' : '#ef4444'}; font-weight: 700;">
          ${s.variance === 0 ? '₹0.00' : formatCurrency(s.variance)}
        </td>
        <td><span style="background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 700;">${s.status}</span></td>
      </tr>
    `).join('');
  }

  window.openCloseShiftModal = function() {
    document.getElementById('closeShiftModal')?.classList.add('active');
  };

  window.closeCloseShiftModal = function() {
    document.getElementById('closeShiftModal')?.classList.remove('active');
  };

  window.confirmCloseShift = function() {
    if (!window.DataStore) return;
    const analytics = DataStore.getIncomeAnalytics();
    const notes = document.getElementById('shiftClosingNotes')?.value || 'Shift closed';

    const q500 = parseInt(document.getElementById('d500')?.value, 10) || 0;
    const q200 = parseInt(document.getElementById('d200')?.value, 10) || 0;
    const q100 = parseInt(document.getElementById('d100')?.value, 10) || 0;
    const q50 = parseInt(document.getElementById('d50')?.value, 10) || 0;
    const q20 = parseInt(document.getElementById('d20')?.value, 10) || 0;
    const q10 = parseInt(document.getElementById('d10')?.value, 10) || 0;
    const qCoins = parseFloat(document.getElementById('dCoins')?.value) || 0;
    const totalCounted = (q500*500) + (q200*200) + (q100*100) + (q50*50) + (q20*20) + (q10*10) + qCoins;

    const expectedCash = OPENING_FLOAT + analytics.today.cash - analytics.today.refunds;
    const variance = totalCounted > 0 ? (totalCounted - expectedCash) : 0;

    const newShift = {
      id: 'SHF-' + (100 + getShiftHistory().length + 1),
      date: new Date().toISOString().split('T')[0],
      time: '08:00 AM - ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cashier: 'Priya Cashier',
      openingFloat: OPENING_FLOAT,
      totalSales: analytics.today.grossIncome,
      countedCash: totalCounted > 0 ? totalCounted : expectedCash,
      variance,
      status: Math.abs(variance) < 0.01 ? 'Closed & Balanced' : 'Closed with Variance',
      notes
    };

    const shifts = getShiftHistory();
    shifts.unshift(newShift);
    localStorage.setItem('freshHarvestShifts', JSON.stringify(shifts));

    closeCloseShiftModal();
    renderShiftHistory();
    showToast(`Shift #${newShift.id} closed and settled successfully!`, 'success', 'Shift Closed');
  };

  // Auto initialize
  document.addEventListener('DOMContentLoaded', initCashier);

})();

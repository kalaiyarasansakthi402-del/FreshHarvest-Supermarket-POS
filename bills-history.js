/**
 * FreshHarvest Supermarket - Bills History & Invoices Script
 * Integrates with DataStore, WhatsApp messaging, and refund actions.
 */

(function() {
  'use strict';

  let activeViewedBill = null;

  function initBills() {
    updateMetrics();
    renderBillsTable();

    window.addEventListener('freshHarvestBillCreated', () => {
      updateMetrics();
      renderBillsTable();
    });

    document.getElementById('billSearchInput')?.addEventListener('input', renderBillsTable);
  }

  function updateMetrics() {
    if (!window.DataStore) return;
    const bills = DataStore.getBills();

    const totalSales = bills.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);
    const totalInvoices = bills.length;
    const avgVal = totalInvoices > 0 ? (totalSales / totalInvoices) : 0;
    const totalDiscounts = bills.reduce((sum, b) => sum + (Number(b.discount) || 0), 0);

    const elSales = document.getElementById('metricTotalSales');
    const elInvoices = document.getElementById('metricTotalInvoices');
    const elAvg = document.getElementById('metricAvgValue');
    const elDisc = document.getElementById('metricTotalDiscounts');

    if (elSales) elSales.textContent = formatCurrency(totalSales);
    if (elInvoices) elInvoices.textContent = totalInvoices;
    if (elAvg) elAvg.textContent = formatCurrency(avgVal);
    if (elDisc) elDisc.textContent = formatCurrency(totalDiscounts);
  }

  function renderBillsTable() {
    if (!window.DataStore) return;
    const bills = DataStore.getBills();
    const tbody = document.getElementById('billsTableBody');
    const searchVal = (document.getElementById('billSearchInput')?.value || '').toLowerCase().trim();
    const payFilter = document.getElementById('paymentMethodFilter')?.value || 'All';

    if (!tbody) return;

    let filtered = bills;

    if (payFilter !== 'All') {
      filtered = filtered.filter(b => (b.paymentMethod || 'Cash').toLowerCase() === payFilter.toLowerCase());
    }

    if (searchVal) {
      filtered = filtered.filter(b =>
        (b.billNumber && b.billNumber.toLowerCase().includes(searchVal)) ||
        (b.id && b.id.toLowerCase().includes(searchVal)) ||
        (b.customerName && b.customerName.toLowerCase().includes(searchVal)) ||
        (b.customerPhone && b.customerPhone.includes(searchVal))
      );
    }

    if (bills.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 3rem; margin-bottom: 12px;">▤</div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main, #1e293b); margin-bottom: 8px;">No Bills Generated Yet</h3>
            <p style="color: var(--text-muted, #64748b); font-size: 0.92rem; max-width: 440px; margin: 0 auto 20px auto;">
              Complete your first customer checkout in the Billing / POS terminal to record sales and view receipts.
            </p>
            <a href="billing.html" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-weight: 700; text-decoration: none;">
              Go to Billing / POS
            </a>
          </td>
        </tr>
      `;
      return;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 48px 20px;">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">🔍</div>
            <h4 style="font-weight: 700; color: var(--text-main, #334155); margin-bottom: 6px;">No bills found</h4>
            <p style="color: var(--text-muted, #94a3b8); font-size: 0.88rem;">No bills match "${searchVal}". Try searching with a different bill number or customer name.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(b => {
      const itemsCount = b.items ? b.items.length : 0;
      const totalUnits = b.items ? b.items.reduce((s, i) => s + (i.quantity || i.qty || 1), 0) : 0;
      const payMethod = b.paymentMethod || 'Cash';
      const isUPI = payMethod.toLowerCase().includes('upi');
      const isCard = payMethod.toLowerCase().includes('card');

      let badgeStyle = 'background: #f1f5f9; color: #334155;';
      if (isUPI) badgeStyle = 'background: #dcfce7; color: #15803d;';
      else if (isCard) badgeStyle = 'background: #e0f2fe; color: #0369a1;';

      return `
        <tr>
          <td><strong>${b.billNumber || b.id}</strong></td>
          <td>${formatDateTime(b.date)}</td>
          <td><strong>${b.customerName || 'Walk-in Customer'}</strong></td>
          <td><small style="color: #64748b;">${b.customerPhone || '—'}</small></td>
          <td>${itemsCount} items (${totalUnits} pcs)</td>
          <td><strong style="color: #16a34a; font-size: 0.95rem;">${formatCurrency(b.grandTotal)}</strong></td>
          <td><span style="${badgeStyle} padding: 2px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 700;">${payMethod}</span></td>
          <td><small>${b.cashier || 'Cashier'}</small></td>
          <td>
            <button class="btn-view-invoice" onclick="openInvoiceModal('${b.id || b.billNumber}')">
              🔍 View / Share
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.openInvoiceModal = function(billId) {
    if (!window.DataStore) return;
    const bills = DataStore.getBills();
    const bill = bills.find(b => b.id === billId || b.billNumber === billId);
    if (!bill) return;

    activeViewedBill = bill;

    const settings = (window.DataStore && typeof DataStore.getSettings === 'function')
      ? DataStore.getSettings()
      : (typeof getStoreSettings === 'function' ? getStoreSettings() : {});
    const storeName = settings.supermarketName || settings.storeName || 'FreshHarvest Supermarket';
    const storeAddress = settings.address || 'Shop #14, Green Valley High Street, Bengaluru';
    const storeContact = `Phone: ${settings.contactPhone || settings.phone || '+91 98765 43210'} | GST: ${settings.gstin || settings.gstNumber || '29ABCDE1234F1Z5'}`;
    const storeSlogan = settings.slogan || settings.tagline || 'Fresh Products • Smart Billing • Better Shopping 🌱';
    const storeFooter = settings.receiptFooter || settings.receiptFooterMessage || `Thank you for shopping at ${storeName}!`;

    const invStoreName = document.getElementById('invStoreName');
    if (invStoreName) invStoreName.textContent = storeName;
    const invStoreAddress = document.getElementById('invStoreAddress');
    if (invStoreAddress) invStoreAddress.textContent = storeAddress;
    const invStoreContact = document.getElementById('invStoreContact');
    if (invStoreContact) invStoreContact.textContent = storeContact;
    const invFooterMsg = document.getElementById('invFooterMsg');
    if (invFooterMsg) invFooterMsg.textContent = storeFooter;
    const invFooterSub = document.getElementById('invFooterSub');
    if (invFooterSub) invFooterSub.textContent = storeSlogan;

    document.getElementById('invNo').textContent = bill.billNumber || bill.id;
    document.getElementById('invDateTime').textContent = formatDateTime(bill.date);
    document.getElementById('invCustomer').textContent = bill.customerName || 'Walk-in Customer';
    document.getElementById('invMethod').textContent = bill.paymentMethod || 'Cash';

    const phoneRow = document.getElementById('invPhoneRow');
    const phoneEl = document.getElementById('invPhone');
    if (bill.customerPhone && bill.customerPhone.trim() && bill.customerPhone.replace(/[^0-9]/g, '').length >= 10) {
      if (phoneRow) phoneRow.style.display = 'flex';
      if (phoneEl) phoneEl.textContent = bill.customerPhone;
    } else {
      if (phoneRow) phoneRow.style.display = 'none';
    }

    document.getElementById('invSubtotal').textContent = formatCurrency(bill.subtotal);
    document.getElementById('invDiscount').textContent = `- ${formatCurrency(bill.discount)}`;
    document.getElementById('invTax').textContent = `+ ${formatCurrency(bill.tax)}`;
    document.getElementById('invGrandTotal').textContent = formatCurrency(bill.grandTotal);

    const waAmount = document.getElementById('invWaAmount');
    if (waAmount) waAmount.textContent = formatCurrency(bill.grandTotal);

    const itemsBody = document.getElementById('invItemsBody');
    if (itemsBody && bill.items) {
      itemsBody.innerHTML = bill.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity || item.qty || 1}</td>
          <td>${formatCurrency(item.price ?? item.sellingPrice ?? 0)}</td>
          <td>${formatCurrency(((item.price ?? item.sellingPrice ?? 0) * (item.quantity || item.qty || 1)))}</td>
        </tr>
      `).join('');
    }

    document.getElementById('viewInvoiceModal')?.classList.add('active');
  };

  window.closeInvoiceModal = function() {
    document.getElementById('viewInvoiceModal')?.classList.remove('active');
    activeViewedBill = null;
  };

  window.downloadInvoicePdf = function() {
    if (!activeViewedBill) {
      showToast('⚠️ No invoice available to download.', 'warning', 'Download PDF');
      return;
    }

    const prevTitle = document.title;
    const billNum = activeViewedBill.billNumber || activeViewedBill.id || 'Invoice';
    document.title = `${billNum}-receipt`;

    const printStyles = document.createElement('style');
    printStyles.id = 'temp-invoice-pdf-styles';
    printStyles.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #viewInvoiceModal, #viewInvoiceModal *, #printableInvoice, #printableInvoice * { visibility: visible !important; }
        #viewInvoiceModal {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: white !important;
          display: flex !important;
          justify-content: center !important;
          align-items: flex-start !important;
          padding-top: 10px !important;
          box-shadow: none !important;
        }
        .modal-header, .receipt-messaging-actions, .modal-footer {
          display: none !important;
        }
        #printableInvoice {
          position: absolute !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: 320px !important;
          max-width: 100% !important;
          box-shadow: none !important;
          border: none !important;
        }
      }
    `;
    document.head.appendChild(printStyles);

    window.print();

    setTimeout(() => {
      document.title = prevTitle;
      const el = document.getElementById('temp-invoice-pdf-styles');
      if (el) el.remove();
    }, 1000);
  };

  window.sendInvoiceWhatsApp = function() {
    if (!activeViewedBill) return;
    const bill = activeViewedBill;

    let phone = bill.customerPhone || '';
    let cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 10) {
      const promptPhone = prompt('Enter customer WhatsApp mobile number (with country code):', '+91 ');
      if (!promptPhone) return;
      phone = promptPhone;
      cleanPhone = phone.replace(/[^0-9]/g, '');
    }

    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const settings = (window.DataStore && typeof DataStore.getSettings === 'function')
      ? DataStore.getSettings()
      : (typeof getStoreSettings === 'function' ? getStoreSettings() : {});
    const storeName = settings.supermarketName || settings.storeName || 'FreshHarvest Supermarket';
    const storeSlogan = settings.slogan || settings.tagline || 'Fresh Products • Smart Billing • Better Shopping';
    const storeFooter = settings.receiptFooter || settings.receiptFooterMessage || `Thank you for shopping at ${storeName}! 🌱`;

    let itemsText = bill.items.map(i => `• ${i.name} × ${i.quantity || i.qty || 1} = ${formatCurrency((i.price ?? i.sellingPrice ?? 0) * (i.quantity || i.qty || 1))}`).join('\n');
    
    const message = `🧾 *${storeName}*\n` +
      `*Invoice:* ${bill.billNumber || bill.id}\n` +
      `*Date:* ${formatDateTime(bill.date)}\n` +
      `*Customer:* ${bill.customerName}\n` +
      `--------------------------------\n` +
      `${itemsText}\n` +
      `--------------------------------\n` +
      `*Grand Total:* ${formatCurrency(bill.grandTotal)}\n` +
      `*Payment Mode:* ${bill.paymentMethod}\n\n` +
      `${storeFooter}\n` +
      `${storeSlogan}`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    if (window.DataStore) {
      DataStore.logMessage({
        channel: 'WhatsApp',
        phone: '+' + cleanPhone,
        customerName: bill.customerName,
        billId: bill.billNumber || bill.id,
        amount: bill.grandTotal,
        text: message,
        status: 'Sent'
      });
    }

    showToast(`WhatsApp receipt sent to +${cleanPhone} (${formatCurrency(bill.grandTotal)})!`, 'success', 'WhatsApp Sent');
  };

  window.sendInvoiceSMS = function() {
    if (!activeViewedBill) return;
    const bill = activeViewedBill;

    let phone = bill.customerPhone || '';
    let cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 10) {
      const promptPhone = prompt('Enter customer phone number for SMS:', '+91 ');
      if (!promptPhone) return;
      phone = promptPhone;
      cleanPhone = phone.replace(/[^0-9]/g, '');
    }

    const settings = (window.DataStore && typeof DataStore.getSettings === 'function')
      ? DataStore.getSettings()
      : (typeof getStoreSettings === 'function' ? getStoreSettings() : {});
    const storeName = settings.supermarketName || settings.storeName || 'FreshHarvest Supermarket';

    const smsText = `${storeName} Bill #${bill.billNumber || bill.id}: Total ${formatCurrency(bill.grandTotal)} paid via ${bill.paymentMethod}. Thank you for shopping with us!`;
    window.open(`sms:${cleanPhone}?body=${encodeURIComponent(smsText)}`, '_blank');

    if (window.DataStore) {
      DataStore.logMessage({
        channel: 'SMS',
        phone: '+' + cleanPhone,
        customerName: bill.customerName,
        billId: bill.billNumber || bill.id,
        amount: bill.grandTotal,
        text: smsText,
        status: 'OPENED_COMPOSER'
      });
    }

    showToast('ℹ️ SMS app opened. Please review and send the message.', 'info', 'SMS Invoice');
  };

  window.processReturnForActiveBill = function() {
    if (!activeViewedBill) return;
    const bill = activeViewedBill;

    if (!confirm(`Are you sure you want to issue a refund for Bill #${bill.billNumber || bill.id} (${formatCurrency(bill.grandTotal)})?`)) {
      return;
    }

    if (window.DataStore) {
      DataStore.createReturn({
        billId: bill.billNumber || bill.id,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        items: bill.items,
        refundAmount: bill.grandTotal,
        reason: 'Customer Requested Refund / Return',
        action: 'Stock Restocked'
      });

      showToast(`Refund of ${formatCurrency(bill.grandTotal)} processed for Bill #${bill.billNumber || bill.id}!`, 'success', 'Refund Processed');
      closeInvoiceModal();
      updateMetrics();
      renderBillsTable();
    }
  };

  // Auto initialize
  document.addEventListener('DOMContentLoaded', initBills);

})();

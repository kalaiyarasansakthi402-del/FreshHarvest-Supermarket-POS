/**
 * FreshHarvest Supermarket - POS Billing Engine
 * Complete integration with DataStore, Real-time stock alerts,
 * WhatsApp & SMS customer messaging with explicit amount display.
 */

(function() {
  'use strict';

  let currentCart = [];
  let activeCategory = 'All';
  let selectedPaymentMethod = 'Cash';
  let lastCompletedBill = null;

  // INITIALIZATION
  function initPOS() {
    loadCurrentCart();
    renderCategoryPills();
    renderProducts();
    populateCustomerSelect();
    renderBillItems();
    updateHeldCount();
    setupSearch();
    setupEventDelegation();

    const selectEl = document.getElementById('posCustomerSelect');
    if (selectEl) {
      selectEl.addEventListener('change', onCustomerSelectChange);
    }

    window.addEventListener('freshHarvestDataUpdated', onDataChanged);
    window.addEventListener('freshHarvestStockAlert', onDataChanged);
  }

  function onDataChanged() {
    renderProducts();
    populateCustomerSelect();
  }

  // PHONE NUMBER NORMALIZATION
  function normalizeIndianMobileNumber(value) {
    if (window.DataStore && typeof DataStore.normalizeIndianMobileNumber === 'function') {
      return DataStore.normalizeIndianMobileNumber(value);
    }
    const raw = String(value || '').trim();
    if (!raw) return '';
    let digits = raw.replace(/[^\d+]/g, '');
    if (digits.startsWith('+91')) digits = digits.slice(3);
    else if (digits.startsWith('0')) digits = digits.slice(1);
    else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    const raw10 = digits.replace(/\D/g, '');
    if (/^[6-9]\d{9}$/.test(raw10)) {
      return `+91${raw10}`;
    }
    return '';
  }

  function getPhoneInputElement() {
    return document.getElementById('posCustomerPhone') || document.getElementById('posCustomerMobile');
  }

  function getCurrentCustomerPhone() {
    const phoneInput = getPhoneInputElement();
    const selectEl = document.getElementById('posCustomerSelect');
    let phone = phoneInput ? phoneInput.value.trim() : '';
    if (!phone && selectEl) {
      const selectedOpt = selectEl.selectedOptions && selectEl.selectedOptions[0];
      phone = selectedOpt ? (selectedOpt.getAttribute('data-phone') || '') : '';
    }
    return phone;
  }

  // CUSTOMER DROPDOWN & PHONE POPULATION
  function populateCustomerSelect() {
    const select = document.getElementById('posCustomerSelect');
    if (!select || !window.DataStore) return;
    const currentVal = select.value || 'Walk-in Customer';
    const customers = DataStore.getCustomers ? DataStore.getCustomers() : [];

    let html = `<option value="Walk-in Customer" data-phone="">👤 Walk-in Customer</option>`;
    customers.forEach(c => {
      const phoneText = c.phone ? ` (${c.phone})` : '';
      html += `<option value="${c.name.replace(/"/g, '&quot;')}" data-phone="${c.phone || ''}" data-id="${c.id}">👤 ${c.name}${phoneText}</option>`;
    });

    select.innerHTML = html;
    if (currentVal) {
      select.value = currentVal;
    }
    onCustomerSelectChange();
  }

  function onCustomerSelectChange() {
    const select = document.getElementById('posCustomerSelect');
    const phoneInput = getPhoneInputElement();
    if (!select || !phoneInput) return;
    const selectedOpt = select.selectedOptions && select.selectedOptions[0];
    const savedPhone = selectedOpt ? (selectedOpt.getAttribute('data-phone') || '') : '';
    if (select.value === 'Walk-in Customer') {
      phoneInput.value = '';
    } else {
      phoneInput.value = savedPhone;
    }
  }

  function getSelectedCustomerInfo() {
    const selectEl = document.getElementById('posCustomerSelect');
    const name = selectEl ? (selectEl.value || 'Walk-in Customer') : 'Walk-in Customer';
    const phoneRaw = getCurrentCustomerPhone();
    const normalizedPhone = normalizeIndianMobileNumber(phoneRaw);
    return { name, phone: phoneRaw, normalizedPhone };
  }

  // CART PERSISTENCE (DUAL KEY COMPATIBILITY)
  function loadCurrentCart() {
    try {
      if (window.DataStore && typeof DataStore.getCart === 'function') {
        currentCart = DataStore.getCart();
        return;
      }
      const saved = localStorage.getItem('freshHarvestCurrentCart') || localStorage.getItem('currentCart');
      currentCart = saved ? JSON.parse(saved) : [];
    } catch(e) {
      currentCart = [];
    }
  }

  function saveCurrentCart() {
    if (window.DataStore && typeof DataStore.saveCart === 'function') {
      DataStore.saveCart(currentCart);
      return;
    }
    const s = JSON.stringify(currentCart);
    localStorage.setItem('freshHarvestCurrentCart', s);
    localStorage.setItem('currentCart', s);
  }

  // CATEGORY PILLS
  function renderCategoryPills() {
    if (!window.DataStore) return;
    const categories = DataStore.getCategories();
    const container = document.getElementById('posCategoryPills');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const preselectedCat = urlParams.get('cat');
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

  window.filterCategory = function(catName) {
    activeCategory = catName;
    renderCategoryPills();
    renderProducts();
  };

  // PRODUCTS CATALOG
  function renderProducts() {
    if (!window.DataStore) return;
    const products = DataStore.getProducts();
    const container = document.getElementById('posProductsGrid');
    const searchVal = (document.getElementById('posSearchInput')?.value || '').toLowerCase().trim();
    if (!container) return;

    let filtered = products;

    if (activeCategory !== 'All') {
      filtered = filtered.filter(p => p.category && p.category.toLowerCase() === activeCategory.toLowerCase());
    }

    if (searchVal) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchVal) ||
        (p.category && p.category.toLowerCase().includes(searchVal)) ||
        (p.brand && p.brand.toLowerCase().includes(searchVal))
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
      const stockVal = Number(p.stock ?? p.stockQty ?? 0);
      const isOut = stockVal <= 0;
      const isLow = !isOut && stockVal <= (p.minStock || 5);
      
      let stockClass = '';
      let stockLabel = `Stock: ${stockVal}`;
      if (isOut) {
        stockClass = 'out';
        stockLabel = 'Out of Stock';
      } else if (isLow) {
        stockClass = 'low';
        stockLabel = `Low: ${stockVal}`;
      }

      const displayPrice = Number(p.sellingPrice ?? p.price ?? 0);

      return `
        <div class="pos-product-card product-card" data-product-id="${p.id}" style="${isOut ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
          <span class="stock-pill ${stockClass}">${stockLabel}</span>
          <div class="pos-product-img">
            <img src="${p.image || 'assets/placeholder.png'}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80'">
          </div>
          <div class="pos-product-details">
            <h4>${p.name}</h4>
            <span class="unit">${p.unit || '1 unit'}</span>
            <div class="pos-card-footer">
              <span class="pos-price">${formatCurrency(displayPrice)}</span>
              <button
                type="button"
                class="add-to-cart-btn btn-card-add add-to-bill add-btn"
                data-product-id="${p.id}"
                data-action="add-to-bill"
                onclick="event.stopPropagation(); if (!${isOut}) { addToCart('${p.id}'); }"
                ${isOut ? 'disabled' : ''}>
                ${isOut ? 'Sold Out' : '+ Add'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // BILL / CART OPERATIONS
  window.addToCart = function(productId) {
    if (!productId) {
      if (window.showToast) showToast('❌ Product ID missing', 'danger');
      return { success: false, reason: 'missing_id' };
    }

    if (window.DataStore && typeof DataStore.addToCart === 'function') {
      const res = DataStore.addToCart(productId, 1);
      loadCurrentCart();
      renderBillItems();
      calculateTotals();
      return res;
    }

    // Direct fallback if DataStore not attached
    loadCurrentCart();
    const products = JSON.parse(localStorage.getItem('freshHarvestProducts') || localStorage.getItem('pos_products') || '[]');
    const product = products.find(p => String(p.id) === String(productId));

    if (!product) {
      if (window.showToast) showToast('❌ Product not found', 'danger');
      return { success: false, reason: 'not_found' };
    }

    const stock = Number(product.stock ?? product.stockQty ?? 0);
    if (stock <= 0) {
      if (window.showToast) showToast('⚠️ Product is out of stock', 'warning');
      return { success: false, reason: 'out_of_stock' };
    }

    const existing = currentCart.find(item => String(item.productId || item.id) === String(product.id));
    if (existing) {
      const curQ = Number(existing.quantity || existing.qty || 1);
      if (curQ >= stock) {
        if (window.showToast) showToast('⚠️ Maximum available stock reached', 'warning');
        return { success: false, reason: 'stock_limit' };
      }
      existing.quantity = curQ + 1;
      existing.qty = existing.quantity;
    } else {
      currentCart.push({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: Number(product.sellingPrice ?? product.price ?? 0),
        costPrice: Number(product.costPrice ?? product.cost ?? 0),
        quantity: 1,
        qty: 1,
        unit: product.unit || '1 unit',
        image: product.image || ''
      });
    }

    saveCurrentCart();
    renderBillItems();
    calculateTotals();

    if (window.showToast) {
      showToast(`✅ ${product.name} added to bill`, 'success', 'Cart Updated');
    }

    return { success: true, cart: currentCart, product };
  };

  window.addToBill = window.addToCart;
  window.addProductToBill = window.addToCart;
  window.addToPOSCart = window.addToCart;

  window.updateItemQuantity = function(productId, delta) {
    if (window.DataStore && typeof DataStore.updateCartItemQty === 'function') {
      const res = DataStore.updateCartItemQty(productId, delta);
      loadCurrentCart();
      renderBillItems();
      calculateTotals();
      return res;
    }

    loadCurrentCart();
    const pIdStr = String(productId);
    const itemIndex = currentCart.findIndex(item => String(item.productId || item.id) === pIdStr);
    if (itemIndex === -1) return { success: false };

    const item = currentCart[itemIndex];
    const curQ = Number(item.quantity || item.qty || 1);
    const newQ = curQ + Number(delta);

    if (newQ <= 0) {
      currentCart.splice(itemIndex, 1);
    } else {
      item.quantity = newQ;
      item.qty = newQ;
    }

    saveCurrentCart();
    renderBillItems();
    calculateTotals();
    return { success: true, cart: currentCart };
  };

  window.removeItemFromBill = function(productId) {
    if (window.DataStore && typeof DataStore.removeCartItem === 'function') {
      DataStore.removeCartItem(productId);
    } else {
      loadCurrentCart();
      const pIdStr = String(productId);
      currentCart = currentCart.filter(item => String(item.productId || item.id) !== pIdStr);
      saveCurrentCart();
    }
    loadCurrentCart();
    renderBillItems();
    calculateTotals();
  };

  window.clearCurrentBill = function() {
    if (currentCart.length === 0) return;
    if (confirm('Clear all items from the current bill?')) {
      if (window.DataStore && typeof DataStore.clearCart === 'function') {
        DataStore.clearCart();
      } else {
        currentCart = [];
        saveCurrentCart();
      }
      loadCurrentCart();
      renderBillItems();
      calculateTotals();
      const selectEl = document.getElementById('posCustomerSelect');
      if (selectEl) selectEl.value = 'Walk-in Customer';
      const phoneInput = getPhoneInputElement();
      if (phoneInput) phoneInput.value = '';
    }
  };

  function renderBillItems() {
    const container = document.getElementById('billItemsContainer');
    const badge = document.getElementById('billCountBadge');
    if (!container) return;

    loadCurrentCart();
    const totalCount = currentCart.reduce((sum, item) => sum + (Number(item.quantity || item.qty) || 1), 0);
    if (badge) badge.textContent = totalCount;

    if (currentCart.length === 0) {
      container.innerHTML = `
        <div class="empty-bill-msg">
          <span>🛒</span>
          <p>Current bill is empty.</p>
          <small>Click products or scan to add to bill.</small>
        </div>
      `;
      calculateTotals();
      return;
    }

    container.innerHTML = currentCart.map(item => {
      const q = Number(item.quantity || item.qty) || 1;
      const unitPrice = Number(item.price ?? item.sellingPrice) || 0;
      const total = unitPrice * q;
      const pId = item.productId || item.id;
      const unitText = item.unit ? ` • ${item.unit}` : '';

      return `
        <div class="bill-item-row" data-product-id="${pId}">
          <div class="bill-item-thumb">
            <img src="${item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'">
          </div>
          <div class="bill-item-info">
            <strong>${item.name}</strong>
            <small>${formatCurrency(unitPrice)}${unitText}</small>
          </div>
          <div class="qty-controls">
            <button type="button" class="qty-btn" onclick="updateItemQuantity('${pId}', -1)" aria-label="Decrease Quantity">−</button>
            <span class="qty-num">${q}</span>
            <button type="button" class="qty-btn" onclick="updateItemQuantity('${pId}', 1)" aria-label="Increase Quantity">+</button>
          </div>
          <span class="bill-item-total">${formatCurrency(total)}</span>
          <button type="button" class="btn-remove-item" onclick="removeItemFromBill('${pId}')" title="Remove Item">✕</button>
        </div>
      `;
    }).join('');

    calculateTotals();
  }

  window.calculateTotals = function() {
    let subtotal = 0;
    currentCart.forEach(item => {
      const pr = Number(item.price ?? item.sellingPrice) || 0;
      subtotal += pr * (item.quantity || item.qty || 1);
    });

    const discountPercent = Math.min(100, Math.max(0, parseFloat(document.getElementById('billDiscountInput')?.value || 0) || 0));
    const taxPercent = Math.min(100, Math.max(0, parseFloat(document.getElementById('billTaxInput')?.value || 0) || 0));

    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableAmount * (taxPercent / 100);
    const grandTotal = Math.max(0, taxableAmount + taxAmount);

    const subEl = document.getElementById('billSubtotal');
    const discEl = document.getElementById('billDiscountAmount');
    const taxEl = document.getElementById('billTaxAmount');
    const grandEl = document.getElementById('billGrandTotal');

    if (subEl) subEl.textContent = formatCurrency(subtotal);
    if (discEl) discEl.textContent = `- ${formatCurrency(discountAmount)}`;
    if (taxEl) taxEl.textContent = `+ ${formatCurrency(taxAmount)}`;
    if (grandEl) grandEl.textContent = formatCurrency(grandTotal);

    const waBtnAmount = document.getElementById('waBtnAmount');
    if (waBtnAmount) waBtnAmount.textContent = formatCurrency(grandTotal);
    const smsBtnAmount = document.getElementById('smsBtnAmount');
    if (smsBtnAmount) smsBtnAmount.textContent = formatCurrency(grandTotal);
    const posSmsBtnAmount = document.getElementById('posSmsBtnAmount');
    if (posSmsBtnAmount) posSmsBtnAmount.textContent = formatCurrency(grandTotal);

    return { subtotal, discountPercent, discountAmount, taxPercent, taxAmount, grandTotal };
  };

  // PAYMENT MODAL & SALE COMPLETION
  window.openPaymentModal = function() {
    if (currentCart.length === 0) {
      showToast('Please add items to bill before checkout!', 'warning', 'Empty Bill');
      return;
    }

    const totals = calculateTotals();
    const payModalTotal = document.getElementById('payModalTotal');
    if (payModalTotal) payModalTotal.textContent = formatCurrency(totals.grandTotal);

    const custInfo = getSelectedCustomerInfo();
    const payCustInfo = document.getElementById('payModalCustomerInfo');
    if (payCustInfo) payCustInfo.textContent = `Customer: ${custInfo.name} ${custInfo.phone ? '(' + custInfo.phone + ')' : ''}`;

    const receivedInput = document.getElementById('cashReceivedInput');
    if (receivedInput) receivedInput.value = '';
    calculateChange();

    document.getElementById('paymentModal')?.classList.add('active');
  };

  window.closePaymentModal = function() {
    document.getElementById('paymentModal')?.classList.remove('active');
  };

  window.selectPaymentMethod = function(method) {
    selectedPaymentMethod = method;
    document.querySelectorAll('.pay-method-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btnPay${method}`)?.classList.add('active');

    const cashSec = document.getElementById('cashCalcSection');
    const upiSec = document.getElementById('upiSection');
    const cardSec = document.getElementById('cardSection');

    if (cashSec) cashSec.style.display = method === 'Cash' ? 'block' : 'none';
    if (upiSec) upiSec.style.display = method === 'UPI' ? 'block' : 'none';
    if (cardSec) cardSec.style.display = method === 'Card' ? 'block' : 'none';
  };

  window.calculateChange = function() {
    const totals = calculateTotals();
    const received = parseFloat(document.getElementById('cashReceivedInput')?.value || 0) || 0;
    const changeDue = Math.max(0, received - totals.grandTotal);
    const changeDueEl = document.getElementById('changeDueAmount');
    if (changeDueEl) changeDueEl.textContent = formatCurrency(changeDue);
  };

  window.completeSaleTransaction = function() {
    if (!window.DataStore) return;
    const totals = calculateTotals();
    const custInfo = getSelectedCustomerInfo();
    const customerName = custInfo.name;
    const customerPhone = custInfo.phone;

    if (selectedPaymentMethod === 'Cash') {
      const received = parseFloat(document.getElementById('cashReceivedInput')?.value || 0) || 0;
      if (received > 0 && received < totals.grandTotal) {
        showToast('Cash received is less than total amount payable!', 'warning', 'Payment Error');
        return;
      }
    }

    const billItems = currentCart.map(i => ({
      productId: i.productId || i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity || i.qty || 1,
      subtotal: i.price * (i.quantity || i.qty || 1)
    }));

    // Create Bill in DataStore (auto decrements stock, tracks transitions, chimes & logs customer)
    const newBill = DataStore.createBill({
      customerName,
      customerPhone,
      items: billItems,
      subtotal: totals.subtotal,
      discount: totals.discountAmount,
      tax: totals.taxAmount,
      grandTotal: totals.grandTotal,
      paymentMethod: selectedPaymentMethod,
      cashier: 'Priya Cashier'
    });

    lastCompletedBill = newBill;

    // Show Receipt Modal with WhatsApp & SMS actions
    populateReceipt(newBill);
    closePaymentModal();
    document.getElementById('receiptModal')?.classList.add('active');

    // Reset Cart
    currentCart = [];
    saveCurrentCart();
    renderBillItems();
    renderProducts();

    showToast(`Bill #${newBill.billNumber} created successfully!`, 'success', 'Transaction Done');
  };

  function populateReceipt(bill) {
    document.getElementById('recInvoiceNo').textContent = bill.billNumber || bill.id;
    document.getElementById('recDateTime').textContent = formatDateTime(bill.date);
    document.getElementById('recCustomerName').textContent = bill.customerName;
    document.getElementById('recPayMethod').textContent = bill.paymentMethod;
    
    const phoneRow = document.getElementById('recPhoneRow');
    const phoneEl = document.getElementById('recCustomerPhone');
    const normPhone = normalizeIndianMobileNumber(bill.customerPhone);
    if (bill.customerPhone && bill.customerPhone.trim() && normPhone) {
      if (phoneRow) phoneRow.style.display = 'flex';
      if (phoneEl) phoneEl.textContent = normPhone;
    } else {
      if (phoneRow) phoneRow.style.display = 'none';
    }

    document.getElementById('recSubtotal').textContent = formatCurrency(bill.subtotal);
    document.getElementById('recDiscount').textContent = `- ${formatCurrency(bill.discount)}`;
    document.getElementById('recTax').textContent = `+ ${formatCurrency(bill.tax)}`;
    document.getElementById('recTotal').textContent = formatCurrency(bill.grandTotal);

    // Update WhatsApp and SMS buttons with explicit dynamic amounts
    const waAmountEl = document.getElementById('waBtnAmount');
    if (waAmountEl) waAmountEl.textContent = formatCurrency(bill.grandTotal);

    const smsAmountEl = document.getElementById('smsBtnAmount');
    if (smsAmountEl) smsAmountEl.textContent = formatCurrency(bill.grandTotal);

    const itemsBody = document.getElementById('recItemsBody');
    if (itemsBody) {
      itemsBody.innerHTML = bill.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity || item.qty}</td>
          <td>${formatCurrency(item.price)}</td>
          <td>${formatCurrency((item.price * (item.quantity || item.qty)))}</td>
        </tr>
      `).join('');
    }
  }

  // CUSTOMER MESSAGING: WHATSAPP & SMS
  window.sendWhatsAppInvoice = function() {
    const bill = lastCompletedBill || (currentCart.length > 0 ? {
      billNumber: 'FH-DRAFT',
      id: 'FH-DRAFT',
      customerName: getSelectedCustomerInfo().name,
      customerPhone: getSelectedCustomerInfo().phone,
      grandTotal: calculateTotals().grandTotal,
      subtotal: calculateTotals().subtotal,
      discount: calculateTotals().discountAmount,
      tax: calculateTotals().taxAmount,
      paymentMethod: selectedPaymentMethod,
      items: currentCart,
      date: new Date().toISOString()
    } : null);

    if (!bill) {
      showToast('⚠️ Customer mobile number is not available.', 'warning', 'WhatsApp Invoice');
      return;
    }

    const phoneRaw = (bill.customerPhone || getCurrentCustomerPhone() || '').trim();
    if (!phoneRaw) {
      showToast('⚠️ Customer mobile number is not available.', 'warning', 'WhatsApp Invoice');
      return;
    }

    const normalizedPhone = normalizeIndianMobileNumber(phoneRaw);
    if (!normalizedPhone) {
      showToast('⚠️ Please enter a valid mobile number.', 'warning', 'WhatsApp Invoice');
      return;
    }

    const cleanDigits = normalizedPhone.replace(/\D/g, '');

    // Build receipt message
    let itemsText = (bill.items || []).map(i => `• ${i.name} × ${i.quantity || i.qty} = ${formatCurrency((Number(i.price ?? i.sellingPrice) || 0) * (i.quantity || i.qty))}`).join('\n');
    
    const message = `🧾 *FreshHarvest Supermarket*\n` +
      `*Invoice:* ${bill.billNumber || bill.id}\n` +
      `*Date:* ${formatDateTime(bill.date)}\n` +
      `*Customer:* ${bill.customerName}\n` +
      `--------------------------------\n` +
      `${itemsText}\n` +
      `--------------------------------\n` +
      `*Subtotal:* ${formatCurrency(bill.subtotal)}\n` +
      (bill.discount > 0 ? `*Discount:* -${formatCurrency(bill.discount)}\n` : '') +
      `*Tax (GST):* +${formatCurrency(bill.tax)}\n` +
      `*Grand Total:* ${formatCurrency(bill.grandTotal)}\n` +
      `*Payment Mode:* ${bill.paymentMethod}\n\n` +
      `Thank you for shopping at FreshHarvest! 🌱\n` +
      `Fresh Products • Smart Billing • Better Shopping`;

    const waUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    // Log message history
    if (window.DataStore && typeof DataStore.logMessage === 'function') {
      DataStore.logMessage({
        type: 'WhatsApp',
        channel: 'WhatsApp',
        phone: normalizedPhone,
        customerName: bill.customerName,
        billId: bill.billNumber || bill.id,
        amount: bill.grandTotal,
        text: message,
        status: 'Sent'
      });
    }

    showToast(`WhatsApp invoice dispatched (${formatCurrency(bill.grandTotal)})!`, 'success', 'WhatsApp Sent');
  };

  window.sendSMSInvoice = function() {
    const bill = lastCompletedBill || (currentCart.length > 0 ? {
      billNumber: 'FH-DRAFT',
      id: 'FH-DRAFT',
      customerName: getSelectedCustomerInfo().name,
      customerPhone: getSelectedCustomerInfo().phone,
      grandTotal: calculateTotals().grandTotal,
      paymentMethod: selectedPaymentMethod,
      date: new Date().toISOString()
    } : null);

    if (!bill) {
      showToast('⚠️ Customer mobile number is not available.', 'warning', 'SMS Invoice');
      return;
    }

    const phoneRaw = (bill.customerPhone || getCurrentCustomerPhone() || '').trim();
    if (!phoneRaw) {
      showToast('⚠️ Customer mobile number is not available.', 'warning', 'SMS Invoice');
      return;
    }

    const normalizedPhone = normalizeIndianMobileNumber(phoneRaw);
    if (!normalizedPhone) {
      showToast('⚠️ Please enter a valid mobile number.', 'warning', 'SMS Invoice');
      return;
    }

    const billDate = bill.date ? (typeof bill.date === 'string' && bill.date.includes('T') ? new Date(bill.date).toLocaleDateString('en-IN') : String(bill.date).split(',')[0]) : new Date().toLocaleDateString('en-IN');
    const billTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const smsText = `FreshHarvest Supermarket\n\n` +
      `Bill: ${bill.billNumber || bill.id}\n` +
      `Customer: ${bill.customerName}\n` +
      `Amount: ${formatCurrency(bill.grandTotal)}\n` +
      `Payment: ${bill.paymentMethod}\n` +
      `Date: ${billDate}\n` +
      `Time: ${billTime}\n\n` +
      `Thank you for shopping with FreshHarvest.`;

    const smsUrl = `sms:${normalizedPhone}?body=${encodeURIComponent(smsText)}`;
    window.open(smsUrl, '_blank');

    if (window.DataStore && typeof DataStore.logMessage === 'function') {
      DataStore.logMessage({
        type: 'SMS',
        channel: 'SMS',
        phone: normalizedPhone,
        customerName: bill.customerName,
        billId: bill.billNumber || bill.id,
        amount: bill.grandTotal,
        text: smsText,
        status: 'OPENED_COMPOSER'
      });
    }

    showToast('ℹ️ SMS app opened. Please review and send the message.', 'info', 'SMS Invoice');
  };

  window.closeReceiptModal = function() {
    document.getElementById('receiptModal')?.classList.remove('active');
    const selectEl = document.getElementById('posCustomerSelect');
    if (selectEl) selectEl.value = 'Walk-in Customer';
    const phoneInput = getPhoneInputElement();
    if (phoneInput) phoneInput.value = '';
  };

  // HELD BILLS
  window.holdCurrentBill = function() {
    if (currentCart.length === 0) {
      showToast('Cannot hold an empty bill!', 'warning', 'Hold Bill');
      return;
    }

    const totals = calculateTotals();
    const custInfo = getSelectedCustomerInfo();
    const customerName = custInfo.name;
    const customerPhone = custInfo.phone;

    const heldBills = JSON.parse(localStorage.getItem('heldBillsList') || '[]');
    const newHeld = {
      id: 'HELD-' + (100 + heldBills.length + 1),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customer: customerName,
      phone: customerPhone,
      items: [...currentCart],
      total: totals.grandTotal
    };

    heldBills.push(newHeld);
    localStorage.setItem('heldBillsList', JSON.stringify(heldBills));
    updateHeldCount();

    currentCart = [];
    saveCurrentCart();
    renderBillItems();

    const selectEl = document.getElementById('posCustomerSelect');
    if (selectEl) selectEl.value = 'Walk-in Customer';

    showToast(`Bill held successfully (ID: ${newHeld.id})`, 'info', 'Bill Held');
  };

  function updateHeldCount() {
    const held = JSON.parse(localStorage.getItem('heldBillsList') || '[]');
    const countEl = document.getElementById('heldCount');
    if (countEl) countEl.textContent = held.length;
  }

  window.openHeldBillsModal = function() {
    const heldBills = JSON.parse(localStorage.getItem('heldBillsList') || '[]');
    const container = document.getElementById('heldBillsListContainer');
    const modal = document.getElementById('heldBillsModal');
    if (!container || !modal) return;

    if (heldBills.length === 0) {
      container.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--text-muted);">No held bills in queue.</p>`;
    } else {
      container.innerHTML = heldBills.map((b, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f8fafc; border:1px solid var(--border-color); border-radius:8px; margin-bottom:8px;">
          <div>
            <strong>${b.customer}</strong> (${b.items.length} items)
            <small style="display:block; color:var(--text-muted);">${b.date} • ${formatCurrency(b.total)} ${b.phone ? '• ' + b.phone : ''}</small>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-primary" onclick="resumeHeldBill(${idx})">Resume</button>
            <button class="btn-secondary" onclick="deleteHeldBill(${idx})">✕</button>
          </div>
        </div>
      `).join('');
    }

    modal.classList.add('active');
  };

  window.closeHeldBillsModal = function() {
    document.getElementById('heldBillsModal')?.classList.remove('active');
  };

  window.resumeHeldBill = function(index) {
    const heldBills = JSON.parse(localStorage.getItem('heldBillsList') || '[]');
    if (!heldBills[index]) return;

    if (currentCart.length > 0) {
      if (!confirm('Current active bill items will be replaced. Continue?')) return;
    }

    currentCart = [...heldBills[index].items];
    const customer = heldBills[index].customer;
    const phone = heldBills[index].phone;

    const selectEl = document.getElementById('posCustomerSelect');
    if (selectEl && customer) {
      let found = false;
      for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value === customer) {
          selectEl.selectedIndex = i;
          found = true;
          break;
        }
      }
      if (!found) {
        const opt = document.createElement('option');
        opt.value = customer;
        opt.textContent = `👤 ${customer}${phone ? ' (' + phone + ')' : ''}`;
        if (phone) opt.setAttribute('data-phone', phone);
        selectEl.appendChild(opt);
        selectEl.value = customer;
      }
    }

    heldBills.splice(index, 1);
    localStorage.setItem('heldBillsList', JSON.stringify(heldBills));
    updateHeldCount();
    saveCurrentCart();
    renderBillItems();
    closeHeldBillsModal();
  };

  window.deleteHeldBill = function(index) {
    const heldBills = JSON.parse(localStorage.getItem('heldBillsList') || '[]');
    heldBills.splice(index, 1);
    localStorage.setItem('heldBillsList', JSON.stringify(heldBills));
    updateHeldCount();
    openHeldBillsModal();
  };

  function setupSearch() {
    const searchInput = document.getElementById('posSearchInput');
    if (!searchInput) return;
    searchInput.addEventListener('input', () => renderProducts());
  }

  // Event delegation on products container and document
  function setupEventDelegation() {
    const productsContainer = document.getElementById('posProductsGrid');
    if (productsContainer) {
      productsContainer.addEventListener('click', function(e) {
        const btn = e.target.closest('.add-to-cart-btn, .add-to-bill, .btn-card-add, .add-btn, [data-action="add-to-bill"]');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          const pId = btn.dataset.productId || btn.getAttribute('data-product-id');
          if (pId) {
            window.addToCart(pId);
          }
          return;
        }

        const card = e.target.closest('.pos-product-card, .product-card');
        if (card && !e.target.closest('button, input, select, a, .qty-btn, .btn-remove-item')) {
          const pId = card.dataset.productId || card.getAttribute('data-product-id');
          if (pId) {
            window.addToCart(pId);
          }
        }
      });
    }

    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.add-to-cart-btn, .add-to-bill, .btn-card-add, .add-btn, [data-action="add-to-bill"]');
      if (btn) {
        const pId = btn.dataset.productId || btn.getAttribute('data-product-id');
        if (pId) {
          if (btn._justHandled) return;
          btn._justHandled = true;
          setTimeout(() => { btn._justHandled = false; }, 250);
          window.addToCart(pId);
        }
        return;
      }

      const card = e.target.closest('.pos-product-card, .product-card');
      if (card && !e.target.closest('button, input, select, a, .qty-btn, .btn-remove-item')) {
        const pId = card.dataset.productId || card.getAttribute('data-product-id');
        if (pId) {
          if (card._justHandled) return;
          card._justHandled = true;
          setTimeout(() => { card._justHandled = false; }, 250);
          window.addToCart(pId);
        }
      }
    });
  }

  // Cross-component and cross-tab reactive sync
  window.addEventListener('freshHarvestCartUpdated', function() {
    loadCurrentCart();
    renderBillItems();
  });

  window.addEventListener('storage', function(e) {
    if (e.key === 'currentCart' || e.key === 'pos_cart' || e.key === 'freshHarvestCart') {
      loadCurrentCart();
      renderBillItems();
    }
  });

  // Auto initialize robustly
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPOS);
  } else {
    initPOS();
  }

})();

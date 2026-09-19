/**
 * FreshHarvest Supermarket - Customers CRM & WhatsApp Messaging Logic
 */

(function() {
  'use strict';

  function initCustomers() {
    updateMetrics();
    renderCustomersTable();

    window.addEventListener('freshHarvestDataUpdated', () => {
      updateMetrics();
      renderCustomersTable();
    });

    document.getElementById('customerSearchInput')?.addEventListener('input', renderCustomersTable);
  }

  function updateMetrics() {
    if (!window.DataStore) return;
    const customers = DataStore.getCustomers();

    const totalCount = customers.length;
    const totalSpend = customers.reduce((sum, c) => sum + (Number(c.totalSpent) || Number(c.totalPurchases) || 0), 0);
    const totalPoints = customers.reduce((sum, c) => sum + (Number(c.points) || Number(c.loyaltyPoints) || 0), 0);
    const vipCount = customers.filter(c => (Number(c.points) || Number(c.loyaltyPoints) || 0) >= 200).length;

    const elCount = document.getElementById('metricCustomerCount');
    const elSpend = document.getElementById('metricCustomerSpend');
    const elPoints = document.getElementById('metricTotalPoints');
    const elVIP = document.getElementById('metricVIPCount');

    if (elCount) elCount.textContent = totalCount;
    if (elSpend) elSpend.textContent = formatCurrency(totalSpend);
    if (elPoints) elPoints.textContent = totalPoints;
    if (elVIP) elVIP.textContent = vipCount;
  }

  function renderCustomersTable() {
    if (!window.DataStore) return;
    const customers = DataStore.getCustomers();
    const tbody = document.getElementById('customersTableBody');
    const searchVal = (document.getElementById('customerSearchInput')?.value || '').toLowerCase().trim();

    if (!tbody) return;

    let filtered = customers;

    if (searchVal) {
      const cleanSearchDigits = searchVal.replace(/[^0-9]/g, '');
      filtered = filtered.filter(c => {
        const nameMatch = (c.name || '').toLowerCase().includes(searchVal);
        const emailMatch = (c.email || '').toLowerCase().includes(searchVal);
        const phoneRawMatch = (c.phone || '').toLowerCase().includes(searchVal);
        const phoneDigitsMatch = cleanSearchDigits.length >= 3 && (c.phone || '').replace(/[^0-9]/g, '').includes(cleanSearchDigits);
        return nameMatch || emailMatch || phoneRawMatch || phoneDigitsMatch;
      });
    }

    if (customers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 3rem; margin-bottom: 12px;">👥</div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main, #1e293b); margin-bottom: 8px;">No Customers Yet</h3>
            <p style="color: var(--text-muted, #64748b); font-size: 0.92rem; max-width: 420px; margin: 0 auto 20px auto;">
              Add your first customer to start tracking customer purchases and loyalty.
            </p>
            <button class="btn-primary" onclick="openAddCustomerModal()" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-weight: 700; cursor: pointer;">
              + Add New Customer
            </button>
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
            <h4 style="font-weight: 700; color: var(--text-main, #334155); margin-bottom: 6px;">No customers found</h4>
            <p style="color: var(--text-muted, #94a3b8); font-size: 0.88rem;">No customer matches "${searchVal.replace(/"/g, '&quot;')}". Try searching with a different name, phone, or email.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(c => {
      const initials = (c.name || 'CU').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      const points = Number(c.points) || Number(c.loyaltyPoints) || 0;
      const spent = Number(c.totalSpent) || Number(c.totalPurchases) || 0;
      let tier = 'Bronze';
      if (points >= 400) tier = 'Platinum';
      else if (points >= 200) tier = 'Gold';
      else if (points >= 100) tier = 'Silver';

      const tierClass = tier.toLowerCase();

      return `
        <tr>
          <td>
            <div class="cust-cell" style="display: flex; align-items: center; gap: 10px;">
              <div class="cust-avatar-pill" style="width: 36px; height: 36px; border-radius: 50%; background: #dcfce7; color: #15803d; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem;">${initials}</div>
              <strong>${c.name}</strong>
            </div>
          </td>
          <td><strong>${c.phone || '—'}</strong></td>
          <td>${c.email || '—'}</td>
          <td><span class="tier-badge ${tierClass}" style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.78rem;">${tier}</span></td>
          <td><strong style="color: #16a34a;">${formatCurrency(spent)}</strong></td>
          <td>⭐ ${points} pts</td>
          <td>${c.visits || 1} visits</td>
          <td>
            <div class="action-btns" style="display: flex; gap: 6px;">
              <button class="btn-icon-wa" style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 4px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 700; cursor: pointer;" onclick="openCustomerWhatsApp('${c.phone}', '${c.name.replace(/'/g, "\\'")}')">
                📱 Message
              </button>
              <button class="btn-icon-edit" onclick="openEditCustomerModal('${c.id}')">Edit</button>
              <button class="btn-icon-del" onclick="deleteCustomer('${c.id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.openCustomerWhatsApp = function(phone, name) {
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      const promptPhone = prompt('Enter customer WhatsApp phone number (with country code):', '+91 ');
      if (!promptPhone) return;
      cleanPhone = promptPhone.replace(/[^0-9]/g, '');
    }

    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const message = `Hello ${name}! 🌱 Greetings from *FreshHarvest Supermarket*.\nWe have exciting fresh farm arrivals & daily offers today! Visit us or order anytime.`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    if (window.DataStore) {
      DataStore.logMessage({
        channel: 'WhatsApp',
        phone: '+' + cleanPhone,
        customerName: name,
        billId: 'PROMO-DIRECT',
        amount: 0,
        text: message,
        status: 'Sent'
      });
    }

    showToast(`WhatsApp chat opened with ${name}!`, 'success', 'WhatsApp Direct');
  };

  window.openAddCustomerModal = function() {
    document.getElementById('custModalTitle').textContent = 'Add New Customer';
    document.getElementById('customerForm').reset();
    document.getElementById('editCustId').value = '';
    document.getElementById('custPhone').value = '+91 ';
    document.getElementById('customerModal')?.classList.add('active');
  };

  window.openEditCustomerModal = function(id) {
    if (!window.DataStore) return;
    const customers = DataStore.getCustomers();
    const cust = customers.find(c => c.id === id || c.id === parseInt(id, 10));
    if (!cust) return;

    document.getElementById('custModalTitle').textContent = 'Edit Customer';
    document.getElementById('editCustId').value = cust.id;
    document.getElementById('custName').value = cust.name;
    document.getElementById('custPhone').value = cust.phone;
    document.getElementById('custEmail').value = cust.email || '';
    document.getElementById('custTier').value = cust.tier || 'Bronze';
    document.getElementById('custPoints').value = cust.points || cust.loyaltyPoints || 0;

    document.getElementById('customerModal')?.classList.add('active');
  };

  window.closeCustomerModal = function() {
    document.getElementById('customerModal')?.classList.remove('active');
  };

  window.handleCustomerSubmit = function(e) {
    e.preventDefault();
    if (!window.DataStore) return;
    const customers = DataStore.getCustomers();
    const editId = document.getElementById('editCustId').value;

    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const tier = document.getElementById('custTier').value;
    const points = parseInt(document.getElementById('custPoints').value, 10) || 0;

    if (editId) {
      const idx = customers.findIndex(c => c.id === editId || c.id === parseInt(editId, 10));
      if (idx !== -1) {
        customers[idx] = {
          ...customers[idx],
          name, phone, email, tier, points, loyaltyPoints: points
        };
      }
    } else {
      customers.unshift({
        id: 'cust-' + Date.now(),
        name,
        phone,
        email,
        tier,
        points,
        loyaltyPoints: points,
        totalSpent: 0,
        visits: 0,
        joinDate: new Date().toISOString().split('T')[0]
      });
    }

    DataStore.set('CUSTOMERS', customers);
    closeCustomerModal();
    updateMetrics();
    renderCustomersTable();
    showToast('Customer saved successfully!', 'success', 'Customer CRM');
  };

  window.deleteCustomer = function(id) {
    if (!window.DataStore) return;
    const customers = DataStore.getCustomers();
    const cust = customers.find(c => String(c.id) === String(id) || c.id == id);
    if (!cust) return;

    const spent = Number(cust.totalSpent) || Number(cust.totalPurchases) || 0;
    const visits = cust.visits || 0;

    let confirmMsg = `Are you sure you want to delete customer "${cust.name}"?`;
    if (spent > 0 || visits > 0) {
      confirmMsg = `⚠️ WARNING: Customer "${cust.name}" has recorded purchase history (Total Spent: ${formatCurrency(spent)}, ${visits} visits).\n\nDeleting this customer profile will permanently unlink their loyalty and billing history.\n\nAre you sure you want to delete this customer?`;
    }

    if (!confirm(confirmMsg)) return;

    const updated = customers.filter(c => String(c.id) !== String(id) && c.id != id);
    DataStore.set('CUSTOMERS', updated);
    updateMetrics();
    renderCustomersTable();
    showToast('Customer deleted.', 'info', 'Customer CRM');
  };

  // Auto initialize
  document.addEventListener('DOMContentLoaded', initCustomers);

})();

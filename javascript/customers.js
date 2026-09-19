/* ==========================================================================
   FRESHHARVEST SUPERMARKET - CUSTOMERS CRM SCRIPT
   ========================================================================== */

function getCustomers() {
  return JSON.parse(localStorage.getItem("pos_customers") || "[]");
}

function saveCustomers(customers) {
  localStorage.setItem("pos_customers", JSON.stringify(customers));
}

function updateMetrics() {
  const customers = getCustomers();
  const totalCount = customers.length;
  const totalSpend = customers.reduce((sum, c) => sum + Number(c.totalPurchases || 0), 0);
  const totalPoints = customers.reduce((sum, c) => sum + Number(c.loyaltyPoints || 0), 0);
  const vipCount = customers.filter(c => c.tier === "Platinum" || c.tier === "Gold").length;

  document.getElementById("metricCustomerCount").textContent = totalCount;
  document.getElementById("metricCustomerSpend").textContent = `₹${totalSpend.toFixed(2)}`;
  document.getElementById("metricTotalPoints").textContent = totalPoints;
  document.getElementById("metricVIPCount").textContent = vipCount;
}

function renderCustomersTable() {
  const customers = getCustomers();
  const tbody = document.getElementById("customersTableBody");
  const searchVal = (document.getElementById("customerSearchInput")?.value || "").toLowerCase().trim();

  if (!tbody) return;

  let filtered = customers;

  if (searchVal) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(searchVal) ||
      (c.phone && c.phone.includes(searchVal)) ||
      (c.email && c.email.toLowerCase().includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No customers found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const initials = c.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
    const tierClass = (c.tier || "Bronze").toLowerCase();

    return `
      <tr>
        <td>
          <div class="cust-cell">
            <div class="cust-avatar-pill">${initials}</div>
            <strong>${c.name}</strong>
          </div>
        </td>
        <td>${c.phone}</td>
        <td>${c.email || 'N/A'}</td>
        <td><span class="tier-badge ${tierClass}">${c.tier || 'Bronze'}</span></td>
        <td><strong>₹${Number(c.totalPurchases || 0).toFixed(2)}</strong></td>
        <td>⭐ ${c.loyaltyPoints || 0} pts</td>
        <td>${c.lastPurchase || 'N/A'}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon-edit" onclick="openEditCustomerModal(${c.id})">Edit</button>
            <button class="btn-icon-del" onclick="deleteCustomer(${c.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openAddCustomerModal() {
  document.getElementById("custModalTitle").textContent = "Add Customer";
  document.getElementById("customerForm").reset();
  document.getElementById("editCustId").value = "";
  document.getElementById("customerModal")?.classList.add("active");
}

function openEditCustomerModal(id) {
  const customers = getCustomers();
  const cust = customers.find(c => c.id === id);
  if (!cust) return;

  document.getElementById("custModalTitle").textContent = "Edit Customer";
  document.getElementById("editCustId").value = cust.id;
  document.getElementById("custName").value = cust.name;
  document.getElementById("custPhone").value = cust.phone;
  document.getElementById("custEmail").value = cust.email || "";
  document.getElementById("custTier").value = cust.tier || "Bronze";
  document.getElementById("custPoints").value = cust.loyaltyPoints || 0;

  document.getElementById("customerModal")?.classList.add("active");
}

function closeCustomerModal() {
  document.getElementById("customerModal")?.classList.remove("active");
}

function handleCustomerSubmit(e) {
  e.preventDefault();
  const customers = getCustomers();
  const editId = document.getElementById("editCustId").value;

  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const email = document.getElementById("custEmail").value.trim();
  const tier = document.getElementById("custTier").value;
  const points = parseInt(document.getElementById("custPoints").value, 10) || 0;

  if (editId) {
    const idx = customers.findIndex(c => c.id === parseInt(editId, 10));
    if (idx !== -1) {
      customers[idx] = {
        ...customers[idx],
        name, phone, email, tier, loyaltyPoints: points
      };
    }
  } else {
    const newId = customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1;
    customers.push({
      id: newId,
      name,
      phone,
      email,
      tier,
      loyaltyPoints: points,
      totalPurchases: 0,
      lastPurchase: new Date().toISOString().split("T")[0]
    });
  }

  saveCustomers(customers);
  closeCustomerModal();
  updateMetrics();
  renderCustomersTable();
}

function deleteCustomer(id) {
  const customers = getCustomers();
  const cust = customers.find(c => c.id === id);
  if (!cust) return;

  if (confirm(`Are you sure you want to delete customer "${cust.name}"?`)) {
    const updated = customers.filter(c => c.id !== id);
    saveCustomers(updated);
    updateMetrics();
    renderCustomersTable();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateMetrics();
  renderCustomersTable();
  document.getElementById("customerSearchInput")?.addEventListener("input", renderCustomersTable);
});

/* ==========================================================================
   FRESHHARVEST SUPERMARKET - SUPPLIERS SCRIPT
   ========================================================================== */

function getSuppliers() {
  return JSON.parse(localStorage.getItem("suppliersList") || "[]");
}

function saveSuppliers(list) {
  localStorage.setItem("suppliersList", JSON.stringify(list));
}

function renderSuppliersTable() {
  const suppliers = getSuppliers();
  const tbody = document.getElementById("suppliersTableBody");
  const searchVal = (document.getElementById("supplierSearchInput")?.value || "").toLowerCase().trim();

  if (!tbody) return;

  let filtered = suppliers;
  if (searchVal) {
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(searchVal) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(searchVal)) ||
      (s.phone && s.phone.includes(searchVal)) ||
      (s.email && s.email.toLowerCase().includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No suppliers found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.contactPerson}</td>
      <td>${s.phone}</td>
      <td>${s.email || 'N/A'}</td>
      <td><small>${s.address || 'N/A'}</small></td>
      <td><span style="font-size:0.8rem; background:#f0fdf4; color:#15803d; padding:3px 8px; border-radius:99px; font-weight:700;">${s.productsSupplied || 'Groceries'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon-edit" onclick="openEditSupplierModal(${s.id})">Edit</button>
          <button class="btn-icon-del" onclick="deleteSupplier(${s.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function openAddSupplierModal() {
  document.getElementById("supModalTitle").textContent = "Add Supplier";
  document.getElementById("supplierForm").reset();
  document.getElementById("editSupplierId").value = "";
  document.getElementById("supplierModal")?.classList.add("active");
}

function openEditSupplierModal(id) {
  const suppliers = getSuppliers();
  const sup = suppliers.find(s => s.id === id);
  if (!sup) return;

  document.getElementById("supModalTitle").textContent = "Edit Supplier";
  document.getElementById("editSupplierId").value = sup.id;
  document.getElementById("supName").value = sup.name;
  document.getElementById("supPerson").value = sup.contactPerson;
  document.getElementById("supPhone").value = sup.phone;
  document.getElementById("supEmail").value = sup.email || "";
  document.getElementById("supCategory").value = sup.productsSupplied || "";
  document.getElementById("supAddress").value = sup.address || "";

  document.getElementById("supplierModal")?.classList.add("active");
}

function closeSupplierModal() {
  document.getElementById("supplierModal")?.classList.remove("active");
}

function handleSupplierSubmit(e) {
  e.preventDefault();
  const suppliers = getSuppliers();
  const editId = document.getElementById("editSupplierId").value;

  const name = document.getElementById("supName").value.trim();
  const contactPerson = document.getElementById("supPerson").value.trim();
  const phone = document.getElementById("supPhone").value.trim();
  const email = document.getElementById("supEmail").value.trim();
  const productsSupplied = document.getElementById("supCategory").value.trim() || "Groceries";
  const address = document.getElementById("supAddress").value.trim();

  if (editId) {
    const idx = suppliers.findIndex(s => s.id === parseInt(editId, 10));
    if (idx !== -1) {
      suppliers[idx] = {
        ...suppliers[idx],
        name, contactPerson, phone, email, productsSupplied, address
      };
    }
  } else {
    const newId = suppliers.length > 0 ? Math.max(...suppliers.map(s => s.id)) + 1 : 1;
    suppliers.push({
      id: newId,
      name,
      contactPerson,
      phone,
      email,
      productsSupplied,
      address
    });
  }

  saveSuppliers(suppliers);
  closeSupplierModal();
  renderSuppliersTable();
}

function deleteSupplier(id) {
  const suppliers = getSuppliers();
  const sup = suppliers.find(s => s.id === id);
  if (!sup) return;

  if (confirm(`Are you sure you want to delete supplier "${sup.name}"?`)) {
    const updated = suppliers.filter(s => s.id !== id);
    saveSuppliers(updated);
    renderSuppliersTable();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderSuppliersTable();
  document.getElementById("supplierSearchInput")?.addEventListener("input", renderSuppliersTable);
});

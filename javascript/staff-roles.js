/* ==========================================================================
   FRESHHARVEST SUPERMARKET - STAFF & ROLES SCRIPT
   ========================================================================== */

function getStaff() {
  return JSON.parse(localStorage.getItem("staffMembers") || "[]");
}

function saveStaff(list) {
  localStorage.setItem("staffMembers", JSON.stringify(list));
}

function renderStaffTable() {
  const staff = getStaff();
  const tbody = document.getElementById("staffTableBody");
  const searchVal = (document.getElementById("staffSearchInput")?.value || "").toLowerCase().trim();

  if (!tbody) return;

  let filtered = staff;
  if (searchVal) {
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(searchVal) ||
      s.role.toLowerCase().includes(searchVal) ||
      (s.email && s.email.toLowerCase().includes(searchVal)) ||
      (s.phone && s.phone.includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No staff accounts found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const roleSlug = (s.role || "Cashier").toLowerCase().replace(/\s+/g, "-");

    return `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td><span class="role-badge ${roleSlug}">${s.role}</span></td>
        <td>${s.phone}</td>
        <td>${s.email || 'N/A'}</td>
        <td><span class="pin-masked">••••</span></td>
        <td><span style="color:#15803d; font-weight:700; font-size:0.8rem;">● ${s.status || 'Active'}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-icon-edit" onclick="openEditStaffModal(${s.id})">Edit / PIN</button>
            <button class="btn-icon-del" onclick="deleteStaff(${s.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openAddStaffModal() {
  document.getElementById("staffModalTitle").textContent = "Add Staff Member";
  document.getElementById("staffForm").reset();
  document.getElementById("editStaffId").value = "";
  document.getElementById("staffPIN").value = "1234";
  document.getElementById("staffModal")?.classList.add("active");
}

function openEditStaffModal(id) {
  const staff = getStaff();
  const s = staff.find(member => member.id === id);
  if (!s) return;

  document.getElementById("staffModalTitle").textContent = "Edit Staff & Security PIN";
  document.getElementById("editStaffId").value = s.id;
  document.getElementById("staffName").value = s.name;
  document.getElementById("staffRole").value = s.role;
  document.getElementById("staffPIN").value = s.pin || "1234";
  document.getElementById("staffPhone").value = s.phone;
  document.getElementById("staffEmail").value = s.email || "";
  document.getElementById("staffStatus").value = s.status || "Active";

  document.getElementById("staffModal")?.classList.add("active");
}

function closeStaffModal() {
  document.getElementById("staffModal")?.classList.remove("active");
}

function handleStaffSubmit(e) {
  e.preventDefault();
  const staff = getStaff();
  const editId = document.getElementById("editStaffId").value;

  const name = document.getElementById("staffName").value.trim();
  const role = document.getElementById("staffRole").value;
  const pin = document.getElementById("staffPIN").value.trim() || "1234";
  const phone = document.getElementById("staffPhone").value.trim();
  const email = document.getElementById("staffEmail").value.trim();
  const status = document.getElementById("staffStatus").value;

  if (editId) {
    const idx = staff.findIndex(s => s.id === parseInt(editId, 10));
    if (idx !== -1) {
      staff[idx] = {
        ...staff[idx],
        name, role, pin, phone, email, status
      };
    }
  } else {
    const newId = staff.length > 0 ? Math.max(...staff.map(s => s.id)) + 1 : 1;
    staff.push({
      id: newId,
      name,
      role,
      pin,
      phone,
      email,
      status
    });
  }

  saveStaff(staff);
  closeStaffModal();
  renderStaffTable();
}

function deleteStaff(id) {
  const staff = getStaff();
  const s = staff.find(member => member.id === id);
  if (!s) return;

  if (confirm(`Are you sure you want to delete staff account "${s.name}"?`)) {
    const updated = staff.filter(member => member.id !== id);
    saveStaff(updated);
    renderStaffTable();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderStaffTable();
  document.getElementById("staffSearchInput")?.addEventListener("input", renderStaffTable);
});

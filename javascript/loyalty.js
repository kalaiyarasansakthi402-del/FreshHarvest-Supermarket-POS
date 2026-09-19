/* ==========================================================================
   FRESHHARVEST SUPERMARKET - LOYALTY & REWARDS SCRIPT
   ========================================================================== */

function getCustomers() {
  return JSON.parse(localStorage.getItem("pos_customers") || "[]");
}

function saveCustomers(customers) {
  localStorage.setItem("pos_customers", JSON.stringify(customers));
}

function renderLoyaltyTable() {
  const customers = getCustomers();
  const tbody = document.getElementById("loyaltyTableBody");
  const searchVal = (document.getElementById("loyaltySearchInput")?.value || "").toLowerCase().trim();

  if (!tbody) return;

  let filtered = customers;
  if (searchVal) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(searchVal) ||
      (c.phone && c.phone.includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No loyalty members found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    let tier = "Bronze";
    const pts = c.loyaltyPoints || 0;
    if (pts >= 3000) tier = "Platinum";
    else if (pts >= 1500) tier = "Gold";
    else if (pts >= 500) tier = "Silver";

    const tierClass = tier.toLowerCase();
    const cashVal = pts * 1; // 1 pt = ₹1

    return `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone}</td>
        <td><span class="tier-badge ${tierClass}">${tier}</span></td>
        <td><strong style="font-size: 1rem; color: #16a34a;">⭐ ${pts}</strong> pts</td>
        <td><strong>₹${cashVal.toFixed(2)}</strong></td>
        <td>₹${Number(c.totalPurchases || 0).toFixed(2)}</td>
        <td>
          <button class="btn-redeem" onclick="openRedeemModal(${c.id})">🎁 Redeem Points</button>
        </td>
      </tr>
    `;
  }).join("");
}

function openRedeemModal(custId) {
  const customers = getCustomers();
  const cust = customers.find(c => c.id === custId);
  if (!cust) return;

  document.getElementById("redeemCustId").value = cust.id;
  document.getElementById("redeemCustName").textContent = cust.name;
  document.getElementById("redeemAvailPoints").textContent = cust.loyaltyPoints || 0;

  const ptsInput = document.getElementById("pointsToRedeem");
  ptsInput.value = Math.min(100, cust.loyaltyPoints || 0);
  ptsInput.max = cust.loyaltyPoints || 0;

  calculateRedeemValue();
  document.getElementById("redeemModal")?.classList.add("active");
}

function calculateRedeemValue() {
  const pts = parseInt(document.getElementById("pointsToRedeem")?.value, 10) || 0;
  const cashVal = pts * 1;
  const valEl = document.getElementById("redeemCashVal");
  if (valEl) valEl.textContent = `₹${cashVal.toFixed(2)}`;
}

function closeRedeemModal() {
  document.getElementById("redeemModal")?.classList.remove("active");
}

function handleRedeemSubmit(e) {
  e.preventDefault();
  const customers = getCustomers();
  const custId = parseInt(document.getElementById("redeemCustId").value, 10);
  const ptsToRedeem = parseInt(document.getElementById("pointsToRedeem").value, 10) || 0;
  const cust = customers.find(c => c.id === custId);

  if (!cust) return;

  if (ptsToRedeem > (cust.loyaltyPoints || 0)) {
    alert("Cannot redeem more points than available in customer balance!");
    return;
  }

  cust.loyaltyPoints = Math.max(0, (cust.loyaltyPoints || 0) - ptsToRedeem);
  saveCustomers(customers);
  closeRedeemModal();
  renderLoyaltyTable();

  alert(`Redeemed ${ptsToRedeem} points successfully for ${cust.name}! Issued ₹${ptsToRedeem.toFixed(2)} Store Discount Credit.`);
}

document.addEventListener("DOMContentLoaded", () => {
  renderLoyaltyTable();
  document.getElementById("loyaltySearchInput")?.addEventListener("input", renderLoyaltyTable);
});

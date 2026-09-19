/* ==========================================================================
   FRESHHARVEST SUPERMARKET - LOYALTY & REWARDS SCRIPT
   ========================================================================== */

function getCustomers() {
  if (window.DataStore) return DataStore.getCustomers();
  return JSON.parse(localStorage.getItem("pos_customers") || localStorage.getItem("freshHarvestCustomers") || "[]");
}

function saveCustomers(customers) {
  if (window.DataStore) {
    DataStore.set("CUSTOMERS", customers);
  } else {
    localStorage.setItem("pos_customers", JSON.stringify(customers));
    localStorage.setItem("freshHarvestCustomers", JSON.stringify(customers));
  }
}

function renderLoyaltyTable() {
  const customers = getCustomers();
  const tbody = document.getElementById("loyaltyTableBody");
  const searchVal = (document.getElementById("loyaltySearchInput")?.value || "").toLowerCase().trim();

  if (!tbody) return;

  let filtered = customers;
  if (searchVal) {
    filtered = filtered.filter(c =>
      (c.name && c.name.toLowerCase().includes(searchVal)) ||
      (c.phone && c.phone.includes(searchVal))
    );
  }

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 3rem; margin-bottom: 12px;">⭐</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main, #1e293b); margin-bottom: 8px;">No Loyalty Profiles Yet</h3>
          <p style="color: var(--text-muted, #64748b); font-size: 0.92rem; max-width: 440px; margin: 0 auto 20px auto;">
            Registered customers automatically earn loyalty points with every supermarket purchase.
          </p>
          <a href="customers.html" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-weight: 700; text-decoration: none;">
            + Register Customer
          </a>
        </td>
      </tr>
    `;
    return;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 48px 20px;">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🔍</div>
          <h4 style="font-weight: 700; color: var(--text-main, #334155); margin-bottom: 6px;">No loyalty members found</h4>
          <p style="color: var(--text-muted, #94a3b8); font-size: 0.88rem;">No customer matches "${searchVal}". Try searching by name or phone.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    let tier = "Bronze";
    const pts = Number(c.points) || Number(c.loyaltyPoints) || 0;
    if (pts >= 3000) tier = "Platinum";
    else if (pts >= 1500) tier = "Gold";
    else if (pts >= 500) tier = "Silver";

    const tierClass = tier.toLowerCase();
    const cashVal = pts * 1; // 1 pt = ₹1
    const spent = Number(c.totalSpent) || Number(c.totalPurchases) || 0;

    return `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone || '—'}</td>
        <td><span class="tier-badge ${tierClass}">${tier}</span></td>
        <td><strong style="font-size: 1rem; color: #16a34a;">⭐ ${pts}</strong> pts</td>
        <td><strong>₹${cashVal.toFixed(2)}</strong></td>
        <td>₹${spent.toFixed(2)}</td>
        <td>
          <button class="btn-redeem" onclick="openRedeemModal('${c.id}')">🎁 Redeem Points</button>
        </td>
      </tr>
    `;
  }).join("");
}

function openRedeemModal(custId) {
  const customers = getCustomers();
  const cust = customers.find(c => String(c.id) === String(custId));
  if (!cust) return;

  const pts = Number(cust.points) || Number(cust.loyaltyPoints) || 0;

  document.getElementById("redeemCustId").value = cust.id;
  document.getElementById("redeemCustName").textContent = cust.name;
  document.getElementById("redeemAvailPoints").textContent = pts;

  const ptsInput = document.getElementById("pointsToRedeem");
  ptsInput.value = Math.min(100, pts);
  ptsInput.max = pts;

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
  const custId = document.getElementById("redeemCustId").value;
  const ptsToRedeem = parseInt(document.getElementById("pointsToRedeem").value, 10) || 0;
  const cust = customers.find(c => String(c.id) === String(custId));

  if (!cust) return;

  const currentPts = Number(cust.points) || Number(cust.loyaltyPoints) || 0;

  if (ptsToRedeem > currentPts) {
    alert("Cannot redeem more points than available in customer balance!");
    return;
  }

  const updatedPts = Math.max(0, currentPts - ptsToRedeem);
  cust.points = updatedPts;
  cust.loyaltyPoints = updatedPts;
  saveCustomers(customers);
  closeRedeemModal();
  renderLoyaltyTable();

  alert(`Redeemed ${ptsToRedeem} points successfully for ${cust.name}! Issued ₹${ptsToRedeem.toFixed(2)} Store Discount Credit.`);
}

document.addEventListener("DOMContentLoaded", () => {
  renderLoyaltyTable();
  document.getElementById("loyaltySearchInput")?.addEventListener("input", renderLoyaltyTable);
});

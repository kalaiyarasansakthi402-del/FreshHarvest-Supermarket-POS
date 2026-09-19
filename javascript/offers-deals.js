/* ==========================================================================
   FRESHHARVEST SUPERMARKET - OFFERS & DEALS SCRIPT
   ========================================================================== */

function getOffers() {
  return JSON.parse(localStorage.getItem("pos_offers") || "[]");
}

function saveOffers(offers) {
  localStorage.setItem("pos_offers", JSON.stringify(offers));
}

function getCategories() {
  return JSON.parse(localStorage.getItem("pos_categories") || "[]");
}

function renderOffersGrid() {
  const offers = getOffers();
  const container = document.getElementById("offersGrid");
  if (!container) return;

  if (offers.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        No active promotional campaigns found. Click "+ Create New Offer" to create one.
      </div>
    `;
    return;
  }

  container.innerHTML = offers.map(o => {
    const isActive = o.status === "Active";

    return `
      <div class="offer-card">
        <div class="offer-card-top">
          <span class="offer-discount-tag">${o.discount}% OFF</span>
          <span class="offer-status-badge ${isActive ? 'active' : 'inactive'}">${o.status}</span>
        </div>

        <h3>${o.title}</h3>

        <div class="offer-details">
          <span>🎯 Category: <strong>${o.category}</strong></span>
          <span>📅 Valid: ${o.startDate} to ${o.endDate}</span>
        </div>

        <div class="offer-code-badge">
          <span>Coupon Code:</span>
          <code>${o.code}</code>
        </div>

        <div class="offer-actions">
          <button class="btn-toggle-status" onclick="toggleOfferStatus(${o.id})">
            ${isActive ? '⏸️ Deactivate' : '▶️ Activate'}
          </button>
          <button class="btn-del-offer" onclick="deleteOffer(${o.id})">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function openAddOfferModal() {
  const categories = getCategories();
  const catSelect = document.getElementById("offerCategory");
  if (catSelect) {
    catSelect.innerHTML = `<option value="All Categories">All Categories</option>` +
      categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  }

  document.getElementById("offerForm").reset();
  document.getElementById("editOfferId").value = "";

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("offerStartDate").value = today;

  const nextMonth = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0];
  document.getElementById("offerEndDate").value = nextMonth;

  document.getElementById("offerModal")?.classList.add("active");
}

function closeOfferModal() {
  document.getElementById("offerModal")?.classList.remove("active");
}

function handleOfferSubmit(e) {
  e.preventDefault();
  const offers = getOffers();
  const editId = document.getElementById("editOfferId").value;

  const title = document.getElementById("offerTitle").value.trim();
  const code = document.getElementById("offerCode").value.trim().toUpperCase();
  const discount = parseInt(document.getElementById("offerDiscount").value, 10) || 10;
  const category = document.getElementById("offerCategory").value;
  const startDate = document.getElementById("offerStartDate").value;
  const endDate = document.getElementById("offerEndDate").value;

  if (editId) {
    const idx = offers.findIndex(o => o.id === parseInt(editId, 10));
    if (idx !== -1) {
      offers[idx] = {
        ...offers[idx],
        title, code, discount, category, startDate, endDate
      };
    }
  } else {
    const newId = offers.length > 0 ? Math.max(...offers.map(o => o.id)) + 1 : 1;
    offers.push({
      id: newId,
      title,
      code,
      discount,
      category,
      startDate,
      endDate,
      status: "Active"
    });
  }

  saveOffers(offers);
  closeOfferModal();
  renderOffersGrid();
}

function toggleOfferStatus(id) {
  const offers = getOffers();
  const offer = offers.find(o => o.id === id);
  if (!offer) return;

  offer.status = offer.status === "Active" ? "Inactive" : "Active";
  saveOffers(offers);
  renderOffersGrid();
}

function deleteOffer(id) {
  const offers = getOffers();
  if (confirm("Are you sure you want to delete this promotional offer?")) {
    const updated = offers.filter(o => o.id !== id);
    saveOffers(updated);
    renderOffersGrid();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderOffersGrid();
});

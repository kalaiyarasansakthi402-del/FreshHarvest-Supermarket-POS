/* ==========================================================================
   FRESHHARVEST SUPERMARKET - ITEMS MANAGEMENT SCRIPT
   ========================================================================== */

// STATE
let currentPage = 1;
let itemsPerPage = 25;
let filteredItems = [];

// STORAGE GETTERS & SETTERS
function getProducts() {
  if (window.DataStore && typeof DataStore.getProducts === 'function') {
    return DataStore.getProducts();
  }
  return JSON.parse(localStorage.getItem("freshHarvestProducts") || localStorage.getItem("pos_products") || "[]");
}

function saveProducts(products) {
  if (window.DataStore && typeof DataStore.set === 'function') {
    DataStore.set('PRODUCTS', products);
  } else {
    localStorage.setItem("freshHarvestProducts", JSON.stringify(products));
    localStorage.setItem("pos_products", JSON.stringify(products));
  }
}

function getCategories() {
  if (window.DataStore && typeof DataStore.getCategories === 'function') {
    return DataStore.getCategories();
  }
  return JSON.parse(localStorage.getItem("freshHarvestCategories") || localStorage.getItem("pos_categories") || "[]");
}

// POPULATE CATEGORY & BRAND FILTERS
function populateFilterDropdowns() {
  const categories = getCategories();
  const products = getProducts();

  // Category Filter
  const catFilter = document.getElementById("filterCategory");
  const modalCat = document.getElementById("inputItemCategory");

  if (catFilter) {
    const curVal = catFilter.value;
    catFilter.innerHTML = `<option value="All">All Categories</option>` +
      categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
    catFilter.value = curVal || "All";
  }

  if (modalCat) {
    modalCat.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  }

  // Brand Filter
  const brandFilter = document.getElementById("filterBrand");
  if (brandFilter) {
    const brands = [...new Set(products.map(p => p.brand || "FreshHarvest").filter(Boolean))];
    const curBrand = brandFilter.value;
    brandFilter.innerHTML = `<option value="All">All Brands</option>` +
      brands.map(b => `<option value="${b}">${b}</option>`).join("");
    brandFilter.value = curBrand || "All";
  }
}

// COMPUTE KPI SUMMARY CARDS
function updateSummaryCards() {
  const products = getProducts();
  const total = products.length;
  const active = products.filter(p => p.stock > 0 && p.status !== "Out of Stock").length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 10)).length;
  const outOfStock = products.filter(p => p.stock <= 0 || p.status === "Out of Stock").length;

  document.getElementById("statTotalItems").textContent = total;
  document.getElementById("statActiveItems").textContent = active;
  document.getElementById("statLowStockItems").textContent = lowStock;
  document.getElementById("statOutOfStockItems").textContent = outOfStock;
}

// FILTER & SEARCH PROCESSING
function applyFiltersAndSearch() {
  const products = getProducts();
  const query = (document.getElementById("itemSearchInput")?.value || "").toLowerCase().trim();
  const cat = document.getElementById("filterCategory")?.value || "All";
  const brand = document.getElementById("filterBrand")?.value || "All";
  const unit = document.getElementById("filterUnit")?.value || "All";
  const stockStatus = document.getElementById("filterStockStatus")?.value || "All";
  const availability = document.getElementById("filterAvailability")?.value || "All";

  filteredItems = products.filter(item => {
    // Search query
    if (query) {
      const matchName = item.name.toLowerCase().includes(query);
      const matchBrand = (item.brand || "FreshHarvest").toLowerCase().includes(query);
      const matchCat = item.category.toLowerCase().includes(query);

      if (!matchName && !matchBrand && !matchCat) {
        return false;
      }
    }

    // Category filter
    if (cat !== "All" && item.category.toLowerCase() !== cat.toLowerCase()) {
      return false;
    }

    // Brand filter
    if (brand !== "All") {
      const itemBrand = item.brand || "FreshHarvest";
      if (itemBrand.toLowerCase() !== brand.toLowerCase()) return false;
    }

    // Unit filter
    if (unit !== "All") {
      if ((item.unit || "").toLowerCase() !== unit.toLowerCase()) return false;
    }

    // Stock Status filter
    const isLow = item.stock > 0 && item.stock <= (item.minStock || 10);
    const isOut = item.stock <= 0;
    if (stockStatus === "In Stock" && (isOut || isLow)) return false;
    if (stockStatus === "Low Stock" && !isLow) return false;
    if (stockStatus === "Out of Stock" && !isOut) return false;

    // Availability filter
    if (availability === "Available" && item.stock <= 0) return false;
    if (availability === "Unavailable" && item.stock > 0) return false;

    return true;
  });

  // Reset to page 1 on filter change
  if (currentPage > Math.ceil(filteredItems.length / itemsPerPage)) {
    currentPage = 1;
  }

  renderTable();
  renderPagination();
}

function handleFilterChange() {
  currentPage = 1;
  applyFiltersAndSearch();
}

// RENDER ITEM TABLE
function renderTable() {
  const tbody = document.getElementById("itemsTableBody");
  if (!tbody) return;

  const products = getProducts();
  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 3rem; margin-bottom: 12px;">📋</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main, #1e293b); margin-bottom: 8px;">No Supermarket Items Yet</h3>
          <p style="color: var(--text-muted, #64748b); font-size: 0.92rem; max-width: 440px; margin: 0 auto 20px auto;">
            Add your first supermarket item to track inventory, variants, discounts and pricing.
          </p>
          <button class="btn-primary" onclick="openAddItemModal()" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-weight: 700; cursor: pointer;">
            + Add New Item
          </button>
        </td>
      </tr>
    `;
    return;
  }

  if (filteredItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; padding: 48px 20px;">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🔍</div>
          <h4 style="font-weight: 700; color: var(--text-main, #334155); margin-bottom: 6px;">No matching items found</h4>
          <p style="color: var(--text-muted, #94a3b8); font-size: 0.88rem;">Try adjusting your search keywords, category, brand, or status filters.</p>
        </td>
      </tr>
    `;
    return;
  }

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pageItems = filteredItems.slice(startIdx, endIdx);

  tbody.innerHTML = pageItems.map(p => {
    const brand = p.brand || "FreshHarvest";
    const variant = p.variant || "Standard";
    const mrp = p.mrp || p.oldPrice || (p.price * 1.2).toFixed(2);
    const discount = p.discount || (mrp > p.price ? Math.round(((mrp - p.price) / mrp) * 100) : 0);

    let statusClass = "instock";
    let statusLabel = "In Stock";
    if (p.stock <= 0) {
      statusClass = "outofstock";
      statusLabel = "Out of Stock";
    } else if (p.stock <= (p.minStock || 10)) {
      statusClass = "lowstock";
      statusLabel = "Low Stock";
    }

    const fallbackImg = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80";
    const imgSrc = p.image || fallbackImg;

    return `
      <tr>
        <td>
          <div class="item-thumb-box">
            <img src="${imgSrc}" alt="${p.name}" onerror="this.src='${fallbackImg}'">
          </div>
          <button class="btn-search-img" onclick="searchGoogleImages('${p.name.replace(/'/g, "\\'")}')" title="Search Images online">🔍 View Images</button>
        </td>
        <td>
          <div class="item-title-meta">
            <strong>${p.name}</strong>
          </div>
        </td>
        <td>${p.category}</td>
        <td><strong>${brand}</strong></td>
        <td>${variant}</td>
        <td>${p.unit || '1 unit'}</td>
        <td><strong style="color:var(--color-primary); font-size: 0.95rem;">₹${Number(p.price).toFixed(2)}</strong></td>
        <td style="color:var(--text-muted); text-decoration:line-through;">₹${Number(mrp).toFixed(2)}</td>
        <td><span style="color:#ef4444; font-weight:700;">${discount > 0 ? `${discount}%` : '0%'}</span></td>
        <td><strong>${p.stock}</strong></td>
        <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-icon-view" onclick="viewItemDetails('${p.id}')">View</button>
            <button class="btn-icon-edit" onclick="openEditItemModal('${p.id}')">Edit</button>
            <button class="btn-icon-del" onclick="deleteItem('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// PAGINATION CONTROLS
function renderPagination() {
  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  const start = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(total, currentPage * itemsPerPage);

  const infoEl = document.getElementById("paginationInfo");
  if (infoEl) {
    infoEl.textContent = `Showing ${start}–${end} of ${total} items`;
  }

  const prevBtn = document.getElementById("btnPrevPage");
  const nextBtn = document.getElementById("btnNextPage");
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

  const container = document.getElementById("pageNumbersContainer");
  if (!container) return;

  let html = "";
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      html += `<button class="page-num ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += `<span style="padding: 4px;">...</span>`;
    }
  }
  container.innerHTML = html;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
    renderPagination();
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
    renderPagination();
  }
}

function goToPage(page) {
  currentPage = page;
  renderTable();
  renderPagination();
}

function changeItemsPerPage() {
  const select = document.getElementById("itemsPerPageSelect");
  if (select) {
    itemsPerPage = parseInt(select.value, 10) || 25;
    currentPage = 1;
    renderTable();
    renderPagination();
  }
}

// GOOGLE IMAGES SEARCH (NO SCRAPING)
function searchGoogleImages(query) {
  const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query + ' grocery product')}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// AUTO CALCULATE DISCOUNT IN MODAL
function autoCalculateDiscount() {
  const price = parseFloat(document.getElementById("inputItemPrice")?.value || 0);
  const mrp = parseFloat(document.getElementById("inputItemMRP")?.value || 0);
  const discInput = document.getElementById("inputItemDiscount");

  if (mrp > price && price > 0 && discInput) {
    const disc = Math.round(((mrp - price) / mrp) * 100);
    discInput.value = disc;
  }
}

let currentItemImage = null;

function handleItemImageUpload(event) {
  const fileInput = event.target;
  const errorBox = document.getElementById("itemImageError");
  if (errorBox) {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }

  if (!fileInput.files || fileInput.files.length === 0) return;

  const file = fileInput.files[0];

  // Validate File Type
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type.toLowerCase())) {
    if (errorBox) {
      errorBox.textContent = "Please upload a valid image file (JPG, JPEG, PNG, or WEBP).";
      errorBox.style.display = "block";
    }
    fileInput.value = "";
    return;
  }

  // Validate File Size (2 MB = 2 * 1024 * 1024 bytes)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    if (errorBox) {
      errorBox.textContent = "Please upload an image smaller than 2 MB.";
      errorBox.style.display = "block";
    }
    fileInput.value = "";
    return;
  }

  // Read File as Base64 Data URL using FileReader
  const reader = new FileReader();
  reader.onload = function(e) {
    currentItemImage = e.target.result;
    showItemImagePreview(currentItemImage);
  };
  reader.readAsDataURL(file);
}

function showItemImagePreview(src) {
  const container = document.getElementById("itemImagePreviewContainer");
  const thumb = document.getElementById("itemImagePreviewThumb");
  if (container && thumb) {
    thumb.src = src;
    container.style.display = "block";
  }
}

function removeItemImage() {
  currentItemImage = "";
  const fileInput = document.getElementById("inputItemFile");
  if (fileInput) fileInput.value = "";
  const container = document.getElementById("itemImagePreviewContainer");
  if (container) container.style.display = "none";
  const errorBox = document.getElementById("itemImageError");
  if (errorBox) errorBox.style.display = "none";
}

// ADD ITEM MODAL
function openAddItemModal() {
  document.getElementById("itemModalTitle").textContent = "Add New Supermarket Item";
  document.getElementById("btnSaveItem").textContent = "Add Item";
  document.getElementById("itemForm").reset();
  document.getElementById("editItemId").value = "";
  document.getElementById("modalValidationError").style.display = "none";

  // Defaults
  document.getElementById("inputItemUnit").value = "1 kg";
  document.getElementById("inputItemBrand").value = "FreshHarvest";
  document.getElementById("inputItemVariant").value = "Regular";
  document.getElementById("inputItemStock").value = "50";
  document.getElementById("inputItemStatus").value = "In Stock";
  
  removeItemImage();

  document.getElementById("itemModal")?.classList.add("active");
}

// EDIT ITEM MODAL
function openEditItemModal(id) {
  const products = getProducts();
  const item = products.find(p => String(p.id) === String(id) || p.id == id);
  if (!item) return;

  document.getElementById("itemModalTitle").textContent = "Edit Supermarket Item";
  document.getElementById("btnSaveItem").textContent = "Save Changes";
  document.getElementById("modalValidationError").style.display = "none";

  document.getElementById("editItemId").value = item.id;
  document.getElementById("inputItemName").value = item.name;
  document.getElementById("inputItemCategory").value = item.category;
  document.getElementById("inputItemBrand").value = item.brand || "FreshHarvest";
  document.getElementById("inputItemVariant").value = item.variant || "Regular";
  document.getElementById("inputItemUnit").value = item.unit || "1 unit";
  document.getElementById("inputItemPrice").value = item.price;
  document.getElementById("inputItemMRP").value = item.mrp || item.oldPrice || (item.price * 1.25);
  document.getElementById("inputItemDiscount").value = item.discount || 0;
  document.getElementById("inputItemStock").value = item.stock;
  document.getElementById("inputItemStatus").value = item.status || (item.stock > 0 ? "In Stock" : "Out of Stock");
  document.getElementById("inputItemDesc").value = item.description || "";

  if (item.image) {
    currentItemImage = item.image;
    showItemImagePreview(item.image);
  } else {
    removeItemImage();
  }

  document.getElementById("itemModal")?.classList.add("active");
}

function closeItemModal() {
  document.getElementById("itemModal")?.classList.remove("active");
}

// FORM SUBMISSION & VALIDATION
function handleItemFormSubmit(e) {
  e.preventDefault();
  const alertBox = document.getElementById("modalValidationError");
  alertBox.style.display = "none";
  alertBox.textContent = "";

  const products = getProducts();
  const editIdStr = document.getElementById("editItemId").value;
  const isEditing = Boolean(editIdStr);

  const name = document.getElementById("inputItemName").value.trim();
  const category = document.getElementById("inputItemCategory").value.trim();
  const brand = document.getElementById("inputItemBrand").value.trim() || "FreshHarvest";
  const variant = document.getElementById("inputItemVariant").value.trim() || "Standard";
  const unit = document.getElementById("inputItemUnit").value.trim() || "1 unit";
  const price = parseFloat(document.getElementById("inputItemPrice").value);
  let mrp = parseFloat(document.getElementById("inputItemMRP").value) || price;
  const discount = parseInt(document.getElementById("inputItemDiscount").value, 10) || 0;
  const stock = parseInt(document.getElementById("inputItemStock").value, 10);
  let status = document.getElementById("inputItemStatus").value;
  const image = currentItemImage || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80";
  const description = document.getElementById("inputItemDesc").value.trim();

  // VALIDATION RULES
  if (!name) {
    showValidationError("Item Name cannot be empty.");
    return;
  }
  if (!category) {
    showValidationError("Please select or enter a Category.");
    return;
  }
  if (isNaN(price) || price <= 0) {
    showValidationError("Price must be a valid positive number greater than 0.");
    return;
  }
  if (isNaN(stock) || stock < 0) {
    showValidationError("Stock cannot be negative.");
    return;
  }

  // Stock status sync
  if (stock <= 0) status = "Out of Stock";
  else if (stock <= 10 && status === "In Stock") status = "Low Stock";

  if (isEditing) {
    const idx = products.findIndex(p => String(p.id) === String(editIdStr) || p.id == editIdStr);
    if (idx !== -1) {
      products[idx] = {
        ...products[idx],
        name,
        category,
        brand,
        variant,
        unit,
        price,
        mrp,
        discount,
        stock,
        status,
        image,
        description
      };
    }
  } else {
    products.unshift({
      id: "prod-" + Date.now(),
      name,
      category,
      brand,
      variant,
      unit,
      price,
      cost: (price * 0.7).toFixed(2),
      mrp,
      discount,
      stock,
      minStock: 10,
      status,
      image,
      description
    });
  }

  saveProducts(products);
  closeItemModal();
  updateSummaryCards();
  applyFiltersAndSearch();
}

function showValidationError(msg) {
  const alertBox = document.getElementById("modalValidationError");
  if (alertBox) {
    alertBox.textContent = msg;
    alertBox.style.display = "block";
  }
}

// VIEW ITEM MODAL
function viewItemDetails(id) {
  const products = getProducts();
  const item = products.find(p => String(p.id) === String(id) || p.id == id);
  if (!item) return;

  const brand = item.brand || "FreshHarvest";
  const variant = item.variant || "Standard";
  const mrp = item.mrp || item.oldPrice || (item.price * 1.25);
  const fallbackImg = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80";

  const modalBody = document.getElementById("viewItemModalBody");
  if (modalBody) {
    modalBody.innerHTML = `
      <div class="view-header-row">
        <div class="view-img-box">
          <img src="${item.image || fallbackImg}" alt="${item.name}" onerror="this.src='${fallbackImg}'">
        </div>
        <div>
          <h3 style="font-size:1.15rem; margin-bottom:4px;">${item.name}</h3>
          <span style="font-size:0.8rem; background:#dcfce7; color:#15803d; font-weight:700; padding:3px 8px; border-radius:99px;">${item.category}</span>
          <button class="btn-search-img" style="margin-top:6px;" onclick="searchGoogleImages('${item.name.replace(/'/g, "\\'")}')">🔍 Search Google Images</button>
        </div>
      </div>

      <div class="view-details-grid">
        <div class="view-detail-item">
          <small>Brand</small>
          <strong>${brand}</strong>
        </div>
        <div class="view-detail-item">
          <small>Variant / Packaging</small>
          <strong>${variant} (${item.unit || '1 unit'})</strong>
        </div>
        <div class="view-detail-item">
          <small>Selling Price</small>
          <strong style="color:var(--color-primary); font-size:1rem;">₹${Number(item.price).toFixed(2)}</strong>
        </div>
        <div class="view-detail-item">
          <small>MRP</small>
          <strong style="text-decoration:line-through; color:var(--text-muted);">₹${Number(mrp).toFixed(2)}</strong>
        </div>
        <div class="view-detail-item">
          <small>Stock Quantity</small>
          <strong>${item.stock} units</strong>
        </div>
        <div class="view-detail-item">
          <small>Status</small>
          <strong>${item.status || (item.stock > 0 ? "In Stock" : "Out of Stock")}</strong>
        </div>
      </div>

      <div style="background:#f8fafc; padding:12px; border-radius:8px;">
        <small style="color:var(--text-muted); display:block; margin-bottom:4px;">Description</small>
        <p style="font-size:0.82rem; line-height:1.4;">${item.description || 'Fresh supermarket item directly supplied to FreshHarvest stores.'}</p>
      </div>
    `;
  }

  const editShortcut = document.getElementById("btnViewEditShortcut");
  if (editShortcut) {
    editShortcut.onclick = () => {
      closeViewItemModal();
      openEditItemModal(item.id);
    };
  }

  document.getElementById("viewItemModal")?.classList.add("active");
}

function closeViewItemModal() {
  document.getElementById("viewItemModal")?.classList.remove("active");
}

// DELETE ITEM
function deleteItem(id) {
  const products = getProducts();
  const item = products.find(p => String(p.id) === String(id) || p.id == id);
  if (!item) return;

  if (confirm(`Are you sure you want to permanently delete item "${item.name}"?`)) {
    const updated = products.filter(p => String(p.id) !== String(id) && p.id != id);
    saveProducts(updated);
    updateSummaryCards();
    applyFiltersAndSearch();
  }
}

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  populateFilterDropdowns();
  updateSummaryCards();
  applyFiltersAndSearch();

  // Search input live listener
  document.getElementById("itemSearchInput")?.addEventListener("input", () => {
    currentPage = 1;
    applyFiltersAndSearch();
  });
});

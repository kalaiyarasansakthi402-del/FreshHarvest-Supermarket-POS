/* ==========================================================================
   FRESHHARVEST SUPERMARKET - PRODUCTS SCRIPT
   ========================================================================== */

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

function populateCategoryOptions() {
  const categories = getCategories();
  const filterSelect = document.getElementById("categoryFilterSelect");
  const modalSelect = document.getElementById("prodCategory");

  if (filterSelect) {
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = `<option value="All">All Categories</option>` +
      categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
    filterSelect.value = currentVal || "All";
  }

  if (modalSelect) {
    modalSelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  }
}

function renderProductsTable() {
  const products = getProducts();
  const tbody = document.getElementById("productsTableBody");
  const searchVal = (document.getElementById("productSearchInput")?.value || "").toLowerCase().trim();
  const catFilter = document.getElementById("categoryFilterSelect")?.value || "All";
  const stockFilter = document.getElementById("stockFilterSelect")?.value || "All";

  if (!tbody) return;

  let filtered = products;

  if (catFilter !== "All") {
    filtered = filtered.filter(p => p.category.toLowerCase() === catFilter.toLowerCase());
  }

  if (stockFilter === "In Stock") {
    filtered = filtered.filter(p => p.stock > (p.minStock || 10));
  } else if (stockFilter === "Low Stock") {
    filtered = filtered.filter(p => p.stock > 0 && p.stock <= (p.minStock || 10));
  } else if (stockFilter === "Out of Stock") {
    filtered = filtered.filter(p => p.stock <= 0);
  }

  if (searchVal) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchVal) ||
      p.category.toLowerCase().includes(searchVal)
    );
  }

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 3rem; margin-bottom: 12px;">📦</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main, #1e293b); margin-bottom: 8px;">No Products Yet</h3>
          <p style="color: var(--text-muted, #64748b); font-size: 0.92rem; max-width: 440px; margin: 0 auto 20px auto;">
            Add your first supermarket product to start tracking inventory and selling in POS.
          </p>
          <button class="btn-primary" onclick="openAddProductModal()" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-weight: 700; cursor: pointer;">
            + Add New Product
          </button>
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
          <h4 style="font-weight: 700; color: var(--text-main, #334155); margin-bottom: 6px;">No matching products found</h4>
          <p style="color: var(--text-muted, #94a3b8); font-size: 0.88rem;">Try adjusting your search query, category filter, or stock filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    let statusClass = "instock";
    let statusLabel = "In Stock";

    if (p.stock <= 0) {
      statusClass = "outofstock";
      statusLabel = "Out of Stock";
    } else if (p.stock <= (p.minStock || 10)) {
      statusClass = "lowstock";
      statusLabel = "Low Stock";
    }

    let costDisplay = "—";
    if (p.cost !== undefined && p.cost !== null && p.cost !== "" && !isNaN(Number(p.cost))) {
      costDisplay = `₹${Number(p.cost).toFixed(2)}`;
    }

    return `
      <tr>
        <td>
          <div class="prod-cell">
            <img src="${p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}" class="prod-thumb" alt="${p.name}">
            <div class="prod-title">
              <strong>${p.name}</strong>
              <small>${p.unit || '1 unit'}</small>
            </div>
          </div>
        </td>
        <td>${p.category}</td>
        <td><strong>₹${Number(p.price).toFixed(2)}</strong></td>
        <td>${costDisplay}</td>
        <td><strong>${p.stock}</strong></td>
        <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-icon-edit" onclick="openEditProductModal('${p.id}')">Edit</button>
            <button class="btn-icon-del" onclick="deleteProduct('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

let currentProductImage = null;

function handleProductImageUpload(event) {
  const fileInput = event.target;
  const errorBox = document.getElementById("productImageError");
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
    currentProductImage = e.target.result;
    showProductImagePreview(currentProductImage);
  };
  reader.readAsDataURL(file);
}

function showProductImagePreview(src) {
  const container = document.getElementById("productImagePreviewContainer");
  const thumb = document.getElementById("productImagePreviewThumb");
  if (container && thumb) {
    thumb.src = src;
    container.style.display = "block";
  }
}

function removeProductImage() {
  currentProductImage = "";
  const fileInput = document.getElementById("productImage");
  if (fileInput) fileInput.value = "";
  const container = document.getElementById("productImagePreviewContainer");
  if (container) container.style.display = "none";
  const errorBox = document.getElementById("productImageError");
  if (errorBox) errorBox.style.display = "none";
}

function openAddProductModal() {
  document.getElementById("modalTitle").textContent = "Add New Supermarket Item";
  document.getElementById("btnSaveProduct").textContent = "Save Product";
  document.getElementById("productForm").reset();
  document.getElementById("editProductId").value = "";
  document.getElementById("prodUnit").value = "1 kg";
  document.getElementById("prodDiscount").value = "0";
  document.getElementById("prodTax").value = "5";
  document.getElementById("prodMinStock").value = "10";
  
  removeProductImage();
  document.getElementById("productModal")?.classList.add("active");
  document.body.classList.add("modal-open");
}

function openEditProductModal(id) {
  const products = getProducts();
  const product = products.find(p => String(p.id) === String(id) || p.id == id);
  if (!product) return;

  document.getElementById("modalTitle").textContent = "Edit Supermarket Item";
  document.getElementById("btnSaveProduct").textContent = "Save Changes";
  document.getElementById("editProductId").value = product.id;
  document.getElementById("prodName").value = product.name;
  document.getElementById("prodBrand").value = product.brand || "FreshHarvest";
  document.getElementById("prodCategory").value = product.category;
  document.getElementById("prodUnit").value = product.unit || "1 kg";
  document.getElementById("prodPrice").value = product.price;
  document.getElementById("prodCost").value = (product.cost !== undefined && product.cost !== null && product.cost !== "") ? product.cost : "";
  document.getElementById("prodStock").value = product.stock;
  document.getElementById("prodMinStock").value = product.minStock || 10;
  document.getElementById("prodDiscount").value = product.discount || 0;
  document.getElementById("prodTax").value = product.tax || 5;

  if (product.image) {
    currentProductImage = product.image;
    showProductImagePreview(product.image);
  } else {
    removeProductImage();
  }

  document.getElementById("productModal")?.classList.add("active");
  document.body.classList.add("modal-open");
}

function closeProductModal() {
  document.getElementById("productModal")?.classList.remove("active");
  document.body.classList.remove("modal-open");
}

function handleProductSubmit(e) {
  e.preventDefault();
  const products = getProducts();
  const editId = document.getElementById("editProductId").value;

  const name = document.getElementById("prodName").value.trim();
  const brand = document.getElementById("prodBrand").value.trim() || "FreshHarvest";
  const category = document.getElementById("prodCategory").value;
  const unit = document.getElementById("prodUnit").value.trim() || "1 unit";
  const price = parseFloat(document.getElementById("prodPrice").value) || 0;
  const costRaw = document.getElementById("prodCost").value.trim();
  const cost = costRaw !== "" ? parseFloat(costRaw) : null;
  const stock = parseInt(document.getElementById("prodStock").value, 10) || 0;
  const minStock = parseInt(document.getElementById("prodMinStock").value, 10) || 10;
  const discount = parseInt(document.getElementById("prodDiscount").value, 10) || 0;
  const tax = parseFloat(document.getElementById("prodTax").value) || 5;

  const image = currentProductImage || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80";

  if (!name) {
    alert("Product Name is required.");
    return;
  }
  if (!category) {
    alert("Category is required.");
    return;
  }
  if (price <= 0) {
    alert("Selling Price must be greater than 0.");
    return;
  }

  let status = "In Stock";
  if (stock <= 0) {
    status = "Out of Stock";
  } else if (stock <= minStock) {
    status = "Low Stock";
  }

  if (editId) {
    const idx = products.findIndex(p => String(p.id) === String(editId) || p.id == editId);
    if (idx !== -1) {
      products[idx] = {
        ...products[idx],
        name,
        brand,
        category,
        unit,
        price,
        cost,
        stock,
        minStock,
        discount,
        tax,
        image,
        status
      };
    }
  } else {
    products.unshift({
      id: "prod-" + Date.now(),
      name,
      brand,
      category,
      unit,
      price,
      cost,
      stock,
      minStock,
      discount,
      tax,
      image,
      status
    });
  }

  saveProducts(products);
  closeProductModal();
  renderProductsTable();
}

function deleteProduct(id) {
  const products = getProducts();
  const prod = products.find(p => String(p.id) === String(id) || p.id == id);
  if (!prod) return;

  if (confirm(`Are you sure you want to delete "${prod.name}"?`)) {
    const updated = products.filter(p => String(p.id) !== String(id) && p.id != id);
    saveProducts(updated);
    renderProductsTable();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateCategoryOptions();
  renderProductsTable();

  document.getElementById("productSearchInput")?.addEventListener("input", renderProductsTable);

  // Overlay click to close modal
  const modalOverlay = document.getElementById("productModal");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeProductModal();
      }
    });
  }

  // Escape key to close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay?.classList.contains("active")) {
      closeProductModal();
    }
  });

  // Drag & drop for image upload
  const dropzone = document.querySelector(".upload-dropzone");
  if (dropzone) {
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-active");
    });
    dropzone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-active");
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-active");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const fileInput = document.getElementById("productImage");
        if (fileInput) {
          fileInput.files = e.dataTransfer.files;
          handleProductImageUpload({ target: fileInput });
        }
      }
    });
  }
});

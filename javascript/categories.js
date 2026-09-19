/* ==========================================================================
   FRESHHARVEST SUPERMARKET - CATEGORIES SCRIPT
   ========================================================================== */

let currentUploadedImage = null;

function getCategories() {
  return JSON.parse(localStorage.getItem("pos_categories") || "[]");
}

function saveCategories(categories) {
  localStorage.setItem("pos_categories", JSON.stringify(categories));
}

function getProducts() {
  return JSON.parse(localStorage.getItem("pos_products") || "[]");
}

function saveProducts(products) {
  localStorage.setItem("pos_products", JSON.stringify(products));
}

// RENDER CATEGORIES GRID
function renderCategoriesGrid() {
  const categories = getCategories();
  const products = getProducts();
  const container = document.getElementById("categoriesGrid");
  const searchVal = (document.getElementById("categorySearchInput")?.value || "").toLowerCase().trim();

  if (!container) return;

  let filtered = categories;
  if (searchVal) {
    filtered = filtered.filter(c => c.name.toLowerCase().includes(searchVal));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        No categories found. Click "+ Add New Category" to create one.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(cat => {
    const count = products.filter(p => p.category && p.category.toLowerCase() === cat.name.toLowerCase()).length;
    const emoji = cat.icon || cat.emoji || "🛒";
    const visualHtml = cat.image
      ? `<img src="${cat.image}" class="cat-thumb-img" alt="${cat.name}">`
      : emoji;

    return `
      <div class="category-card-box">
        <div class="cat-box-header">
          <div class="cat-emoji-circle" style="background: ${cat.color ? cat.color + '15' : '#f0fdf4'};">
            ${visualHtml}
          </div>
          <div class="cat-title-wrap">
            <h4>${cat.name}</h4>
            <small>${cat.description || 'Active Department'}</small>
          </div>
        </div>

        <div class="cat-stats-row">
          <span>Linked Products:</span>
          <strong>${count} items</strong>
        </div>

        <div class="cat-actions-row">
          <button class="btn-cat-edit" onclick="openEditCategoryModal('${cat.id}')">Edit</button>
          <button class="btn-cat-del" onclick="deleteCategory('${cat.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

// EMOJI SELECTION
function selectEmoji(emoji) {
  const iconInput = document.getElementById("catIcon");
  if (iconInput) {
    iconInput.value = emoji;
    updateLivePreview();
  }
}

// IMAGE UPLOAD & VALIDATION (MAX 2 MB, JPG/PNG/WEBP)
function handleImageUpload(event) {
  const fileInput = event.target;
  const errorBox = document.getElementById("imageError");
  errorBox.style.display = "none";
  errorBox.textContent = "";

  if (!fileInput.files || fileInput.files.length === 0) return;

  const file = fileInput.files[0];

  // Validate File Type
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type.toLowerCase())) {
    errorBox.textContent = "Please upload a valid image file (JPG, JPEG, PNG, or WEBP).";
    errorBox.style.display = "block";
    fileInput.value = "";
    return;
  }

  // Validate File Size (2 MB = 2 * 1024 * 1024 bytes)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    errorBox.textContent = "Please upload an image smaller than 2 MB.";
    errorBox.style.display = "block";
    fileInput.value = "";
    return;
  }

  // Read File As Data URL using FileReader
  const reader = new FileReader();
  reader.onload = function(e) {
    currentUploadedImage = e.target.result;
    showImagePreview(currentUploadedImage);
    updateLivePreview();
  };
  reader.readAsDataURL(file);
}

function showImagePreview(src) {
  const container = document.getElementById("imagePreviewContainer");
  const thumb = document.getElementById("imagePreviewThumb");
  if (container && thumb) {
    thumb.src = src;
    container.style.display = "block";
  }
}

function removeCategoryImage() {
  currentUploadedImage = null;
  const fileInput = document.getElementById("categoryImage");
  if (fileInput) fileInput.value = "";
  const container = document.getElementById("imagePreviewContainer");
  if (container) container.style.display = "none";
  const errorBox = document.getElementById("imageError");
  if (errorBox) errorBox.style.display = "none";
  updateLivePreview();
}

// LIVE CATEGORY PREVIEW UPDATE
function updateLivePreview() {
  const nameInput = document.getElementById("catName");
  const iconInput = document.getElementById("catIcon");
  const previewName = document.getElementById("previewName");
  const previewVisual = document.getElementById("previewVisual");

  const nameVal = (nameInput?.value || "").trim() || "Fruits & Vegetables";
  const emojiVal = (iconInput?.value || "").trim() || "🥦";

  if (previewName) {
    previewName.textContent = nameVal;
  }

  if (previewVisual) {
    if (currentUploadedImage) {
      previewVisual.innerHTML = `<img src="${currentUploadedImage}" alt="${nameVal}">`;
    } else {
      previewVisual.innerHTML = emojiVal;
    }
  }
}

// MODAL CONTROLS
function openAddCategoryModal() {
  document.getElementById("catModalTitle").textContent = "Add Category";
  document.getElementById("btnSaveCategory").textContent = "Save Category";
  document.getElementById("categoryForm").reset();
  document.getElementById("editCatId").value = "";
  document.getElementById("catName").value = "";
  document.getElementById("catIcon").value = "🥦";
  document.getElementById("imageError").style.display = "none";

  removeCategoryImage();
  updateLivePreview();
  document.getElementById("categoryModal")?.classList.add("active");
}

function openEditCategoryModal(id) {
  const categories = getCategories();
  const cat = categories.find(c => String(c.id) === String(id));
  if (!cat) return;

  document.getElementById("catModalTitle").textContent = "Edit Category";
  document.getElementById("btnSaveCategory").textContent = "Save Changes";
  document.getElementById("editCatId").value = cat.id;
  document.getElementById("catName").value = cat.name;
  document.getElementById("catIcon").value = cat.icon || cat.emoji || "🥦";
  document.getElementById("imageError").style.display = "none";

  if (cat.image) {
    currentUploadedImage = cat.image;
    showImagePreview(cat.image);
  } else {
    removeCategoryImage();
  }

  updateLivePreview();
  document.getElementById("categoryModal")?.classList.add("active");
}

function closeCategoryModal() {
  document.getElementById("categoryModal")?.classList.remove("active");
}

// FORM SUBMIT & PERSISTENCE
function handleCategorySubmit(e) {
  e.preventDefault();
  const categories = getCategories();
  const editId = document.getElementById("editCatId").value;

  const name = document.getElementById("catName").value.trim();
  const emoji = document.getElementById("catIcon").value.trim() || "🛒";
  const image = currentUploadedImage || null;

  if (!name) {
    alert("Category Name is required.");
    return;
  }

  if (editId) {
    const idx = categories.findIndex(c => String(c.id) === String(editId));
    if (idx !== -1) {
      const oldName = categories[idx].name;
      categories[idx] = {
        ...categories[idx],
        name,
        icon: emoji,
        emoji,
        image
      };

      // If category name was renamed, update linked products in pos_products
      if (oldName.toLowerCase() !== name.toLowerCase()) {
        const products = getProducts();
        let changed = false;
        products.forEach(p => {
          if (p.category && p.category.toLowerCase() === oldName.toLowerCase()) {
            p.category = name;
            changed = true;
          }
        });
        if (changed) saveProducts(products);
      }
    }
  } else {
    // Check for duplicate category name
    const exists = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      alert(`Category "${name}" already exists. Please enter a unique name.`);
      return;
    }

    const newId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
    categories.push({
      id: newId,
      name,
      icon: emoji,
      emoji,
      image,
      createdAt: new Date().toISOString()
    });
  }

  saveCategories(categories);
  closeCategoryModal();
  renderCategoriesGrid();
}

// DELETE CATEGORY WITH PRODUCT PROTECTION
function deleteCategory(id) {
  const categories = getCategories();
  const cat = categories.find(c => String(c.id) === String(id));
  if (!cat) return;

  const products = getProducts();
  const linkedCount = products.filter(p => p.category && p.category.toLowerCase() === cat.name.toLowerCase()).length;

  if (linkedCount > 0) {
    alert(`This category is currently assigned to ${linkedCount} product(s). Please reassign the products before deleting.`);
    return;
  }

  if (confirm(`Are you sure you want to permanently delete category "${cat.name}"?`)) {
    const updated = categories.filter(c => String(c.id) !== String(id));
    saveCategories(updated);
    renderCategoriesGrid();
  }
}

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  renderCategoriesGrid();
  document.getElementById("categorySearchInput")?.addEventListener("input", renderCategoriesGrid);
});

/* ==========================================================================
   FRESHHARVEST SUPERMARKET - PRODUCTS SCRIPT
   ========================================================================== */

function getProducts() {
  return JSON.parse(localStorage.getItem("pos_products") || "[]");
}

function saveProducts(products) {
  localStorage.setItem("pos_products", JSON.stringify(products));
}

function getCategories() {
  return JSON.parse(localStorage.getItem("pos_categories") || "[]");
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

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No matching products found.
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
        <td>₹${Number(p.cost || 0).toFixed(2)}</td>
        <td><strong>${p.stock}</strong></td>
        <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-icon-edit" onclick="openEditProductModal(${p.id})">Edit</button>
            <button class="btn-icon-del" onclick="deleteProduct(${p.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openAddProductModal() {
  document.getElementById("modalTitle").textContent = "Add New Product";
  document.getElementById("productForm").reset();
  document.getElementById("editProductId").value = "";
  document.getElementById("prodImage").value = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80";
  document.getElementById("productModal")?.classList.add("active");
}

function openEditProductModal(id) {
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product) return;

  document.getElementById("modalTitle").textContent = "Edit Product";
  document.getElementById("editProductId").value = product.id;
  document.getElementById("prodName").value = product.name;
  document.getElementById("prodCategory").value = product.category;
  document.getElementById("prodUnit").value = product.unit || "1 unit";
  document.getElementById("prodPrice").value = product.price;
  document.getElementById("prodCost").value = product.cost || 0;
  document.getElementById("prodStock").value = product.stock;
  document.getElementById("prodMinStock").value = product.minStock || 10;
  document.getElementById("prodImage").value = product.image || "";

  document.getElementById("productModal")?.classList.add("active");
}

function closeProductModal() {
  document.getElementById("productModal")?.classList.remove("active");
}

function handleProductSubmit(e) {
  e.preventDefault();
  const products = getProducts();
  const editId = document.getElementById("editProductId").value;

  const name = document.getElementById("prodName").value.trim();
  const category = document.getElementById("prodCategory").value;
  const unit = document.getElementById("prodUnit").value.trim();
  const price = parseFloat(document.getElementById("prodPrice").value) || 0;
  const cost = parseFloat(document.getElementById("prodCost").value) || 0;
  const stock = parseInt(document.getElementById("prodStock").value, 10) || 0;
  const minStock = parseInt(document.getElementById("prodMinStock").value, 10) || 10;
  const image = document.getElementById("prodImage").value.trim() || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80";

  let status = "In Stock";
  if (stock <= 0) status = "Out of Stock";
  else if (stock <= minStock) status = "Low Stock";

  if (editId) {
    const idx = products.findIndex(p => p.id === parseInt(editId, 10));
    if (idx !== -1) {
      products[idx] = {
        ...products[idx],
        name, category, unit, price, cost, stock, minStock, image, status
      };
    }
  } else {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({
      id: newId,
      name,
      category,
      unit,
      price,
      cost,
      stock,
      minStock,
      image,
      status,
      discount: 0
    });
  }

  saveProducts(products);
  closeProductModal();
  renderProductsTable();
}

function deleteProduct(id) {
  const products = getProducts();
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  if (confirm(`Are you sure you want to delete "${prod.name}"?`)) {
    const updated = products.filter(p => p.id !== id);
    saveProducts(updated);
    renderProductsTable();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateCategoryOptions();
  renderProductsTable();

  document.getElementById("productSearchInput")?.addEventListener("input", renderProductsTable);
});

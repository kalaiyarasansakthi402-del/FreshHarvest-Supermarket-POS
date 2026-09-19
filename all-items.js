/**
 * FreshHarvest Supermarket - All Items Directory (Grid & Table Views)
 */

(function(window) {
  'use strict';

  let currentViewMode = localStorage.getItem('freshHarvestItemsViewMode') || 'grid';

  function initAllItems() {
    populateCategoryFilter();
    updateMetrics();
    renderView();
    setupEventListeners();

    // Listen for cross-tab or data updates
    window.addEventListener('freshHarvestDataUpdated', () => {
      updateMetrics();
      renderView();
    });

    window.addEventListener('freshHarvestStockUpdated', () => {
      updateMetrics();
      renderView();
    });
  }

  function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderView();
      });
    }
  }

  function getExpiryStatus(expiryDateStr) {
    if (!expiryDateStr) return { label: 'Good', class: 'good', tag: '🟢 Good' };
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Expired', class: 'expired', tag: '🔴 Expired' };
    } else if (diffDays <= 7) {
      return { label: 'Expiring Soon', class: 'soon', tag: `🟡 Exp: ${diffDays}d` };
    } else {
      return { label: 'Good', class: 'good', tag: '🟢 Fresh' };
    }
  }

  function populateCategoryFilter() {
    const filterCat = document.getElementById('filterCategory');
    if (!filterCat || !window.DataStore) return;

    const categories = DataStore.getCategories();
    const currentVal = filterCat.value;
    filterCat.innerHTML = `<option value="All">All Categories</option>` +
      categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    filterCat.value = currentVal || 'All';
  }

  function getFilteredItems() {
    if (!window.DataStore) return [];
    let items = DataStore.getProducts();

    const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const categoryVal = document.getElementById('filterCategory')?.value || 'All';
    const stockVal = document.getElementById('filterStock')?.value || 'All';
    const expiryVal = document.getElementById('filterExpiry')?.value || 'All';
    const sortVal = document.getElementById('sortBy')?.value || 'name-asc';

    // Search
    if (searchVal) {
      items = items.filter(p =>
        (p.name && p.name.toLowerCase().includes(searchVal)) ||
        (p.category && p.category.toLowerCase().includes(searchVal)) ||
        (p.brand && p.brand.toLowerCase().includes(searchVal)) ||
        (p.sku && p.sku.toLowerCase().includes(searchVal))
      );
    }

    // Category
    if (categoryVal !== 'All') {
      items = items.filter(p => p.category === categoryVal);
    }

    // Stock
    if (stockVal === 'In Stock') {
      items = items.filter(p => (Number(p.stock) || 0) > 5);
    } else if (stockVal === 'Low Stock') {
      items = items.filter(p => {
        const s = Number(p.stock) || 0;
        return s > 0 && s <= 5;
      });
    } else if (stockVal === 'Out of Stock') {
      items = items.filter(p => (Number(p.stock) || 0) <= 0);
    }

    // Expiry
    if (expiryVal !== 'All') {
      items = items.filter(p => {
        const exp = getExpiryStatus(p.expiryDate);
        return exp.label === expiryVal;
      });
    }

    // Sort
    items.sort((a, b) => {
      if (sortVal === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortVal === 'price-asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (sortVal === 'price-desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortVal === 'stock-desc') return (Number(b.stock) || 0) - (Number(a.stock) || 0);
      if (sortVal === 'stock-asc') return (Number(a.stock) || 0) - (Number(b.stock) || 0);
      return 0;
    });

    return items;
  }

  function updateMetrics() {
    if (!window.DataStore) return;
    const products = DataStore.getProducts();

    const total = products.length;
    const inStock = products.filter(p => (Number(p.stock) || 0) > 5).length;
    const lowStock = products.filter(p => {
      const s = Number(p.stock) || 0;
      return s > 0 && s <= 5;
    }).length;
    const outStock = products.filter(p => (Number(p.stock) || 0) <= 0).length;

    const elTotal = document.getElementById('statCatalogCount');
    const elIn = document.getElementById('statInStockCount');
    const elLow = document.getElementById('statLowStockCount');
    const elOut = document.getElementById('statOutStockCount');

    if (elTotal) elTotal.textContent = total;
    if (elIn) elIn.textContent = inStock;
    if (elLow) elLow.textContent = lowStock;
    if (elOut) elOut.textContent = outStock;
  }

  function renderView() {
    const items = getFilteredItems();
    const gridContainer = document.getElementById('gridContainer');
    const tableContainer = document.getElementById('tableContainer');
    const emptyContainer = document.getElementById('emptyStateContainer');
    const tableBody = document.getElementById('allTableBody');

    if (items.length === 0) {
      if (gridContainer) gridContainer.style.display = 'none';
      if (tableContainer) tableContainer.style.display = 'none';
      if (emptyContainer) emptyContainer.style.display = 'block';
      return;
    }

    if (emptyContainer) emptyContainer.style.display = 'none';

    if (currentViewMode === 'grid') {
      if (gridContainer) {
        gridContainer.style.display = 'grid';
        gridContainer.innerHTML = items.map(p => {
          const stockNum = Number(p.stock) || 0;
          let stockClass = 'in-stock';
          let stockLabel = `Stock: ${stockNum}`;
          if (stockNum <= 0) {
            stockClass = 'out-stock';
            stockLabel = '🛑 Out of Stock';
          } else if (stockNum <= 5) {
            stockClass = 'low-stock';
            stockLabel = `⚠️ Low: ${stockNum}`;
          }

          const exp = getExpiryStatus(p.expiryDate);

          return `
            <div class="all-item-card" data-product-id="${p.id}">
              <div class="item-card-image-wrap">
                <img src="${p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'">
                <span class="item-stock-tag ${stockClass}">${stockLabel}</span>
                <span class="item-expiry-tag">${exp.tag}</span>
              </div>
              <div class="item-card-body">
                <span class="item-category-label">${p.category || 'General'}</span>
                <h4 class="item-title">${p.name}</h4>
                <div class="item-spec-row">
                  <span>Unit: <strong>${p.unit || '1 pc'}</strong></span>
                  <span>Brand: <strong>${p.brand || 'FreshHarvest'}</strong></span>
                </div>
                <div class="item-card-footer">
                  <span class="item-price-val">${window.formatCurrency ? formatCurrency(p.price) : '₹' + Number(p.price || 0).toFixed(2)}</span>
                  <button class="btn-card-add-bill" onclick="handleQuickAdd('${p.id}')">
                    + Add to Bill
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
      if (tableContainer) tableContainer.style.display = 'none';
    } else {
      if (tableContainer) {
        tableContainer.style.display = 'block';
        if (tableBody) {
          tableBody.innerHTML = items.map(p => {
            const stockNum = Number(p.stock) || 0;
            let stockBadge = `<span class="status-badge good">In Stock (${stockNum})</span>`;
            if (stockNum <= 0) {
              stockBadge = `<span class="status-badge expired">Out of Stock (0)</span>`;
            } else if (stockNum <= 5) {
              stockBadge = `<span class="status-badge soon">Low Stock (${stockNum})</span>`;
            }

            const exp = getExpiryStatus(p.expiryDate);

            return `
              <tr>
                <td>
                  <img src="${p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}" alt="${p.name}" class="table-thumb" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'">
                </td>
                <td><strong>${p.name}</strong></td>
                <td><span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.8rem;">${p.category || 'General'}</span></td>
                <td><strong style="color: #16a34a; font-size: 0.95rem;">${window.formatCurrency ? formatCurrency(p.price) : '₹' + Number(p.price || 0).toFixed(2)}</strong></td>
                <td><strong>${stockNum}</strong></td>
                <td>${p.unit || '1 pc'}</td>
                <td>${p.expiryDate || '—'}</td>
                <td>${stockBadge}</td>
                <td>
                  <button class="btn-card-add-bill" onclick="handleQuickAdd('${p.id}')">
                    + Add
                  </button>
                </td>
              </tr>
            `;
          }).join('');
        }
      }
      if (gridContainer) gridContainer.style.display = 'none';
    }
  }

  window.switchViewMode = function(mode) {
    currentViewMode = mode;
    localStorage.setItem('freshHarvestItemsViewMode', mode);

    document.getElementById('btnViewGrid')?.classList.toggle('active', mode === 'grid');
    document.getElementById('btnViewTable')?.classList.toggle('active', mode === 'table');

    renderView();
  };

  window.handleFilterChange = function() {
    renderView();
  };

  window.resetAllFilters = function() {
    const searchInput = document.getElementById('searchInput');
    const filterCat = document.getElementById('filterCategory');
    const filterStock = document.getElementById('filterStock');
    const filterExpiry = document.getElementById('filterExpiry');
    const sortBy = document.getElementById('sortBy');

    if (searchInput) searchInput.value = '';
    if (filterCat) filterCat.value = 'All';
    if (filterStock) filterStock.value = 'All';
    if (filterExpiry) filterExpiry.value = 'All';
    if (sortBy) sortBy.value = 'name-asc';

    renderView();
  };

  window.handleQuickAdd = function(productId) {
    if (!window.DataStore) return;
    const res = DataStore.addToCart(productId, 1);
    if (res && res.success) {
      if (window.showToast) {
        showToast(`Added ${res.product.name} to bill cart!`, 'success', 'POS Cart');
      }
    }
  };

  document.addEventListener('DOMContentLoaded', initAllItems);

})(window);

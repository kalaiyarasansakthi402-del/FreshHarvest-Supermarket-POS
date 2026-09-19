/* ==========================================================================
   FRESHHARVEST SUPERMARKET - HOME PAGE SCRIPT
   ========================================================================== */

// DEFAULT DATASET INITIALIZATION
const DEFAULT_CATEGORIES = [
  { id: "fruits-veg", name: "Fruits & Vegetables", icon: "🥦", color: "#16a34a" },
  { id: "dairy-eggs", name: "Dairy & Eggs", icon: "🥛", color: "#2563eb" },
  { id: "bakery", name: "Bakery", icon: "🍞", color: "#d97706" },
  { id: "meat-seafood", name: "Meat & Seafood", icon: "🥩", color: "#dc2626" },
  { id: "beverages", name: "Beverages", icon: "🧃", color: "#0891b2" },
  { id: "snacks", name: "Snacks", icon: "🍿", color: "#ea580c" },
  { id: "pantry", name: "Pantry", icon: "🥫", color: "#4f46e5" },
  { id: "frozen", name: "Frozen", icon: "🧊", color: "#0284c7" },
  { id: "household", name: "Household", icon: "🧼", color: "#059669" },
  { id: "organic", name: "Organic", icon: "🌿", color: "#65a30d" }
];

const DEFAULT_PRODUCTS = [
  { id: 1, name: "Bananas (Fresh Cavendish)", category: "Fruits & Vegetables", price: 60, cost: 40, stock: 85, minStock: 20, unit: "1 kg", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 30, featured: true, flashDeal: true, oldPrice: 85 },
  { id: 2, name: "Red Delicious Apples", category: "Fruits & Vegetables", price: 180, cost: 120, stock: 45, minStock: 15, unit: "1 kg", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 40, featured: true, flashDeal: true, oldPrice: 300 },
  { id: 3, name: "Farm Fresh Tomatoes", category: "Fruits & Vegetables", price: 120, cost: 80, stock: 60, minStock: 20, unit: "1 kg", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 35, featured: true, flashDeal: true, oldPrice: 185 },
  { id: 4, name: "Tender Chicken Breast", category: "Meat & Seafood", price: 450, cost: 340, stock: 25, minStock: 10, unit: "500 g", image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 25, featured: false, flashDeal: true, oldPrice: 600 },
  { id: 5, name: "Organic Fresh Spinach", category: "Fruits & Vegetables", price: 60, cost: 35, stock: 30, minStock: 10, unit: "250 g", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 0, featured: true, flashDeal: false },
  { id: 6, name: "Nestlé Pure Milk", category: "Dairy & Eggs", price: 220, cost: 170, stock: 50, minStock: 15, unit: "1 Ltr", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 0, featured: true, flashDeal: false },
  { id: 7, name: "Artisan Brown Bread", category: "Bakery", price: 150, cost: 95, stock: 20, minStock: 8, unit: "400 g", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 0, featured: true, flashDeal: false },
  { id: 8, name: "Farm Fresh Eggs (12-pack)", category: "Dairy & Eggs", price: 280, cost: 200, stock: 40, minStock: 12, unit: "12 pcs", image: "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 0, featured: true, flashDeal: false },
  { id: 9, name: "Crispy Sweet Carrots", category: "Fruits & Vegetables", price: 100, cost: 65, stock: 35, minStock: 10, unit: "1 kg", image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 0, featured: false, recommended: true },
  { id: 10, name: "English Cucumber", category: "Fruits & Vegetables", price: 90, cost: 55, stock: 40, minStock: 12, unit: "1 kg", image: "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 0, featured: false, recommended: true },
  { id: 11, name: "Natural Greek Yogurt", category: "Dairy & Eggs", price: 180, cost: 130, stock: 28, minStock: 10, unit: "1 kg", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 0, featured: false, recommended: true },
  { id: 12, name: "Fresh Orange Juice", category: "Beverages", price: 250, cost: 160, stock: 18, minStock: 8, unit: "1 Ltr", image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80", status: "In Stock", discount: 0, featured: false, recommended: true }
];

const DEFAULT_CUSTOMERS = [
  { id: 1, name: "Ayesha Khan", phone: "+91 98234 56789", email: "ayesha.k@example.com", totalPurchases: 14250, loyaltyPoints: 1425, tier: "Gold", lastPurchase: "2026-09-15" },
  { id: 2, name: "Rahul Sharma", phone: "+91 98765 12345", email: "rahul.s@example.com", totalPurchases: 8900, loyaltyPoints: 890, tier: "Silver", lastPurchase: "2026-09-14" },
  { id: 3, name: "Priya Patel", phone: "+91 97123 45678", email: "priya.p@example.com", totalPurchases: 32000, loyaltyPoints: 3200, tier: "Platinum", lastPurchase: "2026-09-16" },
  { id: 4, name: "Vikram Singh", phone: "+91 96543 21098", email: "vikram.s@example.com", totalPurchases: 4500, loyaltyPoints: 450, tier: "Bronze", lastPurchase: "2026-09-10" }
];

const DEFAULT_SUPPLIERS = [
  { id: 1, name: "Green Valley Farms Ltd.", contactPerson: "Suresh Patil", phone: "+91 98111 22334", email: "orders@greenvalley.com", address: "Nashik Organic Hub, MH", productsSupplied: "Fruits & Vegetables" },
  { id: 2, name: "Apex Dairy & Poultry Co.", contactPerson: "Meera Nair", phone: "+91 98222 33445", email: "supply@apexdairy.com", address: "Anand Agro Zone, GJ", productsSupplied: "Dairy, Eggs, Meat" },
  { id: 3, name: "Golden Crust Bakery Supplies", contactPerson: "Arjun Verma", phone: "+91 98333 44556", email: "arjun@goldencrust.in", address: "Industrial Estate, Sector 18", productsSupplied: "Bakery & Breads" }
];

const DEFAULT_PURCHASES = [
  { id: "PO-1001", date: "2026-09-12", supplierName: "Green Valley Farms Ltd.", productName: "Bananas & Apples", quantity: 150, totalCost: 11000, status: "Received" },
  { id: "PO-1002", date: "2026-09-14", supplierName: "Apex Dairy & Poultry Co.", productName: "Pure Milk & Eggs", quantity: 80, totalCost: 14400, status: "Received" },
  { id: "PO-1003", date: "2026-09-16", supplierName: "Golden Crust Bakery Supplies", productName: "Artisan Brown Bread", quantity: 40, totalCost: 3800, status: "Pending" }
];

const DEFAULT_BILLS = [
  { id: "INV-1001", invoiceNo: "INV-1001", date: "2026-09-16", time: "10:15 AM", customerName: "Ayesha Khan", customerPhone: "+91 98234 56789", items: [{ id: 1, name: "Bananas (Fresh)", price: 60, qty: 2, total: 120 }, { id: 6, name: "Nestlé Pure Milk", price: 220, qty: 1, total: 220 }], subtotal: 340, discount: 0, tax: 17, total: 357, paymentMethod: "UPI", status: "Paid" },
  { id: "INV-1002", invoiceNo: "INV-1002", date: "2026-09-16", time: "11:42 AM", customerName: "Rahul Sharma", customerPhone: "+91 98765 12345", items: [{ id: 2, name: "Red Delicious Apples", price: 180, qty: 2, total: 360 }, { id: 7, name: "Artisan Brown Bread", price: 150, qty: 1, total: 150 }], subtotal: 510, discount: 51, tax: 22.95, total: 481.95, paymentMethod: "Card", status: "Paid" },
  { id: "INV-1003", invoiceNo: "INV-1003", date: "2026-09-15", time: "04:30 PM", customerName: "Priya Patel", customerPhone: "+91 97123 45678", items: [{ id: 4, name: "Tender Chicken Breast", price: 450, qty: 2, total: 900 }, { id: 8, name: "Farm Fresh Eggs (12-pack)", price: 280, qty: 1, total: 280 }], subtotal: 1180, discount: 118, tax: 53.1, total: 1115.1, paymentMethod: "Cash", status: "Paid" }
];

const DEFAULT_SETTINGS = {
  storeName: "FreshHarvest Supermarket",
  tagline: "Good Food Brighter You",
  address: "Plot 42, Green Avenue, Fresh City",
  phone: "+91 98765 43210",
  email: "support@freshharvest.com",
  gstNumber: "GSTIN29ABCDE1234F1Z5",
  taxRate: 5,
  currency: "₹",
  receiptHeader: "FreshHarvest Supermarket - Fresh Groceries",
  receiptFooter: "Thank you for shopping with us! Have a healthy day."
};

const DEFAULT_STAFF = [
  { id: 1, name: "Alex Morgan", role: "Administrator", email: "admin@freshharvest.com", phone: "+91 90001 00001", pin: "1234", status: "Active" },
  { id: 2, name: "Sarah Jenkins", role: "Manager", email: "sarah.j@freshharvest.com", phone: "+91 90002 00002", pin: "5678", status: "Active" },
  { id: 3, name: "David Chen", role: "Cashier", email: "david.c@freshharvest.com", phone: "+91 90003 00003", pin: "1122", status: "Active" },
  { id: 4, name: "Elena Rostova", role: "Stock Manager", email: "elena.r@freshharvest.com", phone: "+91 90004 00004", pin: "3344", status: "Active" }
];

const DEFAULT_OFFERS = [
  { id: 1, title: "Super Fruit Fiesta", discount: 40, category: "Fruits & Vegetables", code: "FRUIT40", startDate: "2026-09-01", endDate: "2026-09-30", status: "Active" },
  { id: 2, title: "Dairy Delight Weekend", discount: 20, category: "Dairy & Eggs", code: "DAIRY20", startDate: "2026-09-15", endDate: "2026-09-22", status: "Active" },
  { id: 3, title: "Bakery Flash Deal", discount: 15, category: "Bakery", code: "BAKE15", startDate: "2026-09-10", endDate: "2026-09-25", status: "Active" }
];

const DEFAULT_RETURNS = [
  { id: "RET-101", invoiceNo: "INV-0980", date: "2026-09-15", customerName: "Vikram Singh", productName: "Artisan Brown Bread", quantity: 1, refundAmount: 150, reason: "Package Damaged", status: "Completed" }
];

// Initialize Storage if empty
function initStorage() {
  if (!localStorage.getItem("pos_products")) {
    localStorage.setItem("pos_products", JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem("pos_categories")) {
    localStorage.setItem("pos_categories", JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem("pos_customers")) {
    localStorage.setItem("pos_customers", JSON.stringify(DEFAULT_CUSTOMERS));
  }
  if (!localStorage.getItem("pos_bills")) {
    localStorage.setItem("pos_bills", JSON.stringify(DEFAULT_BILLS));
  }
  if (!localStorage.getItem("pos_settings")) {
    localStorage.setItem("pos_settings", JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem("suppliersList")) {
    localStorage.setItem("suppliersList", JSON.stringify(DEFAULT_SUPPLIERS));
  }
  if (!localStorage.getItem("purchasesList")) {
    localStorage.setItem("purchasesList", JSON.stringify(DEFAULT_PURCHASES));
  }
  if (!localStorage.getItem("staffMembers")) {
    localStorage.setItem("staffMembers", JSON.stringify(DEFAULT_STAFF));
  }
  if (!localStorage.getItem("pos_offers")) {
    localStorage.setItem("pos_offers", JSON.stringify(DEFAULT_OFFERS));
  }
  if (!localStorage.getItem("pos_returns")) {
    localStorage.setItem("pos_returns", JSON.stringify(DEFAULT_RETURNS));
  }
  if (!localStorage.getItem("currentCart")) {
    localStorage.setItem("currentCart", JSON.stringify([]));
  }
  if (!localStorage.getItem("heldBillsList")) {
    localStorage.setItem("heldBillsList", JSON.stringify([]));
  }
}

// RENDER HELPERS
function getProducts() {
  return JSON.parse(localStorage.getItem("pos_products") || "[]");
}

function getCategories() {
  return JSON.parse(localStorage.getItem("pos_categories") || "[]");
}

function getCart() {
  return JSON.parse(localStorage.getItem("currentCart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("currentCart", JSON.stringify(cart));
  updateCartBadge();
  renderSideCart();
}

function updateCartBadge() {
  const cart = getCart();
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const badge = document.getElementById("headerCartCount");
  if (badge) badge.textContent = totalCount;
  const sideCount = document.getElementById("sideCartCount");
  if (sideCount) sideCount.textContent = totalCount;
}

function addToCart(productId) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const cart = getCart();
  const existing = cart.find(item => item.id === productId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit || "1 unit",
      qty: 1
    });
  }

  saveCart(cart);
}

function renderSideCart() {
  const cart = getCart();
  const container = document.getElementById("sideCartItems");
  const subtotalEl = document.getElementById("sideCartSubtotal");
  if (!container || !subtotalEl) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-msg">
        <span>🛒</span>
        <p>Cart is currently empty.</p>
        <small>Add items from the store to begin.</small>
      </div>
    `;
    subtotalEl.textContent = "₹0";
    return;
  }

  let subtotal = 0;
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;
    return `
      <div class="cart-item-row">
        <div class="cart-item-meta">
          <strong>${item.name}</strong>
          <small>₹${item.price} × ${item.qty}</small>
        </div>
        <span class="cart-item-price">₹${itemTotal}</span>
      </div>
    `;
  }).join("");

  subtotalEl.textContent = `₹${subtotal}`;
}

function renderCategories() {
  const categories = getCategories();
  const container = document.getElementById("homeCategoryGrid");
  if (!container) return;

  container.innerHTML = categories.map(cat => {
    const visual = cat.image
      ? `<img src="${cat.image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : (cat.icon || cat.emoji || '🏷️');
    return `
      <a href="billing.html?cat=${encodeURIComponent(cat.name)}" class="category-card">
        <div class="cat-icon-circle">${visual}</div>
        <span>${cat.name}</span>
      </a>
    `;
  }).join("");
}

function renderFlashDeals(products) {
  const container = document.getElementById("flashDealsGrid");
  if (!container) return;

  const deals = products.filter(p => p.flashDeal || p.discount > 0).slice(0, 4);
  container.innerHTML = deals.map(p => `
    <div class="product-card">
      ${p.discount ? `<span class="discount-badge">-${p.discount}%</span>` : ""}
      <div class="product-img-wrap">
        <img src="${p.image}" alt="${p.name}">
      </div>
      <div class="product-info">
        <h4>${p.name}</h4>
        <span class="unit">${p.unit || "1 kg"}</span>
        <div class="price-row">
          <span class="current-price">₹${p.price}</span>
          ${p.oldPrice ? `<span class="old-price">₹${p.oldPrice}</span>` : ""}
        </div>
      </div>
      <button class="btn-add-cart" onclick="addToCart(${p.id})">
        🛒 Add to Bill
      </button>
    </div>
  `).join("");
}

function renderFeatured(products) {
  const container = document.getElementById("featuredGrid");
  if (!container) return;

  const featured = products.filter(p => p.featured).slice(0, 4);
  container.innerHTML = featured.map(p => `
    <div class="product-card">
      <div class="product-img-wrap">
        <img src="${p.image}" alt="${p.name}">
      </div>
      <div class="product-info">
        <h4>${p.name}</h4>
        <span class="unit">${p.unit || "1 kg"}</span>
        <div class="price-row">
          <span class="current-price">₹${p.price}</span>
        </div>
      </div>
      <button class="btn-add-cart" onclick="addToCart(${p.id})">
        🛒 Add to Bill
      </button>
    </div>
  `).join("");
}

function renderRecommended(products) {
  const container = document.getElementById("recommendedGrid");
  if (!container) return;

  const recs = products.filter(p => p.recommended || (!p.featured && !p.flashDeal)).slice(0, 4);
  container.innerHTML = recs.map(p => `
    <div class="product-card">
      <div class="product-img-wrap">
        <img src="${p.image}" alt="${p.name}">
      </div>
      <div class="product-info">
        <h4>${p.name}</h4>
        <span class="unit">${p.unit || "1 kg"}</span>
        <div class="price-row">
          <span class="current-price">₹${p.price}</span>
        </div>
      </div>
      <button class="btn-add-cart" onclick="addToCart(${p.id})">
        🛒 Add to Bill
      </button>
    </div>
  `).join("");
}

function updateStats() {
  const bills = JSON.parse(localStorage.getItem("pos_bills") || "[]");
  const products = getProducts();

  const todayStr = new Date().toISOString().split("T")[0];
  const todayBills = bills.filter(b => b.date === todayStr);
  const todaySales = todayBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
  const lowStockCount = products.filter(p => p.stock <= (p.minStock || 10)).length;

  const salesEl = document.getElementById("statTodaySales");
  if (salesEl) salesEl.textContent = `₹${todaySales.toFixed(0)}`;

  const billsEl = document.getElementById("statTodayBills");
  if (billsEl) billsEl.textContent = todayBills.length;

  const prodEl = document.getElementById("statTotalProducts");
  if (prodEl) prodEl.textContent = products.length;

  const lowEl = document.getElementById("statLowStock");
  if (lowEl) lowEl.textContent = lowStockCount;
}

// Flash Deal Countdown Timer
function startCountdown() {
  let seconds = 8 * 3600 + 14 * 60 + 36;
  setInterval(() => {
    seconds--;
    if (seconds <= 0) seconds = 24 * 3600;
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");

    const hEl = document.getElementById("timerHours");
    const mEl = document.getElementById("timerMins");
    const sEl = document.getElementById("timerSecs");
    if (hEl && mEl && sEl) {
      hEl.textContent = h;
      mEl.textContent = m;
      sEl.textContent = s;
    }
  }, 1000);
}

// Search
function setupSearch() {
  const searchInput = document.getElementById("globalSearchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const products = getProducts();
    if (!query) {
      renderFlashDeals(products);
      renderFeatured(products);
      renderRecommended(products);
      return;
    }

    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );

    renderFlashDeals(filtered);
    renderFeatured(filtered);
    renderRecommended(filtered);
  });
}

// INITIALIZE ON LOAD
document.addEventListener("DOMContentLoaded", () => {
  initStorage();
  const products = getProducts();
  renderCategories();
  renderFlashDeals(products);
  renderFeatured(products);
  renderRecommended(products);
  updateCartBadge();
  renderSideCart();
  updateStats();
  startCountdown();
  setupSearch();
});

/* ==========================================================================
   FRESHHARVEST SUPERMARKET - REPORTS & PROFIT SCRIPT
   ========================================================================== */

function getBills() {
  return JSON.parse(localStorage.getItem("pos_bills") || "[]");
}

function getPurchases() {
  return JSON.parse(localStorage.getItem("purchasesList") || "[]");
}

function getProducts() {
  return JSON.parse(localStorage.getItem("pos_products") || "[]");
}

function getCategories() {
  return JSON.parse(localStorage.getItem("pos_categories") || "[]");
}

function computeFinancials() {
  const bills = getBills();
  const purchases = getPurchases();
  const products = getProducts();

  const totalRevenue = bills.reduce((sum, b) => sum + Number(b.total || 0), 0);

  // Estimate COGS from sold items cost
  let totalCOGS = 0;
  bills.forEach(bill => {
    if (bill.items) {
      bill.items.forEach(item => {
        const p = products.find(prod => prod.id === item.id);
        const unitCost = p ? (p.cost || p.price * 0.65) : (item.price * 0.65);
        totalCOGS += unitCost * (item.qty || 1);
      });
    }
  });

  // If no bills yet, fallback to purchases
  if (totalCOGS === 0 && purchases.length > 0) {
    totalCOGS = purchases.reduce((sum, p) => sum + Number(p.totalCost || 0), 0);
  }

  const netProfit = Math.max(0, totalRevenue - totalCOGS);
  const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

  document.getElementById("repTotalRevenue").textContent = `₹${totalRevenue.toFixed(2)}`;
  document.getElementById("repTotalCost").textContent = `₹${totalCOGS.toFixed(2)}`;
  document.getElementById("repNetProfit").textContent = `₹${netProfit.toFixed(2)}`;
  document.getElementById("repMarginPct").textContent = `${marginPct.toFixed(1)}%`;

  return { totalRevenue, totalCOGS, netProfit, marginPct };
}

function renderCategoryBreakdown() {
  const bills = getBills();
  const products = getProducts();
  const categories = getCategories();
  const container = document.getElementById("categoryRevenueList");
  if (!container) return;

  const catSales = {};
  categories.forEach(c => { catSales[c.name] = 0; });

  let totalSales = 0;
  bills.forEach(bill => {
    if (bill.items) {
      bill.items.forEach(item => {
        const p = products.find(prod => prod.id === item.id);
        const cat = p ? p.category : "Groceries";
        const val = (item.price || 0) * (item.qty || 1);
        catSales[cat] = (catSales[cat] || 0) + val;
        totalSales += val;
      });
    }
  });

  const entries = Object.entries(catSales).filter(([_, val]) => val > 0);
  if (entries.length === 0) {
    container.innerHTML = `<p style="padding:20px; color:var(--text-muted); text-align:center;">No category transaction data available yet.</p>`;
    return;
  }

  container.innerHTML = entries.map(([catName, val]) => {
    const pct = totalSales > 0 ? ((val / totalSales) * 100) : 0;
    return `
      <div class="cat-breakdown-row">
        <div class="cat-breakdown-meta">
          <span>${catName}</span>
          <strong>₹${val.toFixed(2)} (${pct.toFixed(1)}%)</strong>
        </div>
        <div class="cat-breakdown-bar">
          <div class="cat-breakdown-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderTopProductsTable() {
  const bills = getBills();
  const products = getProducts();
  const tbody = document.getElementById("topProductsBody");
  if (!tbody) return;

  const productStats = {};
  bills.forEach(b => {
    if (b.items) {
      b.items.forEach(item => {
        if (!productStats[item.name]) {
          const p = products.find(prod => prod.id === item.id);
          productStats[item.name] = {
            name: item.name,
            category: p ? p.category : "General Grocery",
            price: item.price,
            qty: 0,
            revenue: 0
          };
        }
        productStats[item.name].qty += item.qty || 1;
        productStats[item.name].revenue += (item.price * (item.qty || 1));
      });
    }
  });

  const sorted = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">No sales data recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td>₹${Number(p.price).toFixed(2)}</td>
      <td><strong>${p.qty} units</strong></td>
      <td><strong style="color:#16a34a;">₹${p.revenue.toFixed(2)}</strong></td>
    </tr>
  `).join("");
}

function drawCanvasChart(financials) {
  const canvas = document.getElementById("revenueChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const labels = ["Revenue", "COGS (Cost)", "Gross Profit"];
  const values = [financials.totalRevenue, financials.totalCOGS, financials.netProfit];
  const colors = ["#16a34a", "#2563eb", "#f97316"];

  const maxVal = Math.max(...values, 100);
  const chartHeight = 180;
  const barWidth = 70;
  const startX = 60;
  const gap = 80;

  // Baseline
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 200);
  ctx.lineTo(470, 200);
  ctx.stroke();

  // Draw Bars
  values.forEach((val, i) => {
    const barH = (val / maxVal) * chartHeight;
    const x = startX + i * (barWidth + gap);
    const y = 200 - barH;

    // Bar
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barWidth, barH, [6, 6, 0, 0]) : ctx.rect(x, y, barWidth, barH);
    ctx.fill();

    // Value text
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`₹${val.toFixed(0)}`, x + barWidth / 2, y - 8);

    // Label
    ctx.fillStyle = "#475569";
    ctx.font = "11px sans-serif";
    ctx.fillText(labels[i], x + barWidth / 2, 220);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const financials = computeFinancials();
  renderCategoryBreakdown();
  renderTopProductsTable();
  drawCanvasChart(financials);
});

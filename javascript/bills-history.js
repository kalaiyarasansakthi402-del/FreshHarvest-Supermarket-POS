/* ==========================================================================
   FRESHHARVEST SUPERMARKET - BILLS HISTORY SCRIPT
   ========================================================================== */

function getBills() {
  return JSON.parse(localStorage.getItem("pos_bills") || "[]");
}

function updateMetrics() {
  const bills = getBills();
  const totalSales = bills.reduce((sum, b) => sum + Number(b.total || 0), 0);
  const totalInvoices = bills.length;
  const avgVal = totalInvoices > 0 ? (totalSales / totalInvoices) : 0;
  const totalDiscounts = bills.reduce((sum, b) => sum + Number(b.discount || 0), 0);

  document.getElementById("metricTotalSales").textContent = `₹${totalSales.toFixed(2)}`;
  document.getElementById("metricTotalInvoices").textContent = totalInvoices;
  document.getElementById("metricAvgValue").textContent = `₹${avgVal.toFixed(2)}`;
  document.getElementById("metricTotalDiscounts").textContent = `₹${totalDiscounts.toFixed(2)}`;
}

function renderBillsTable() {
  const bills = getBills();
  const tbody = document.getElementById("billsTableBody");
  const searchVal = (document.getElementById("billSearchInput")?.value || "").toLowerCase().trim();
  const payFilter = document.getElementById("paymentMethodFilter")?.value || "All";

  if (!tbody) return;

  let filtered = bills;

  if (payFilter !== "All") {
    filtered = filtered.filter(b => b.paymentMethod.toLowerCase() === payFilter.toLowerCase());
  }

  if (searchVal) {
    filtered = filtered.filter(b =>
      b.invoiceNo.toLowerCase().includes(searchVal) ||
      (b.customerName && b.customerName.toLowerCase().includes(searchVal)) ||
      (b.customerPhone && b.customerPhone.includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No invoices found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(b => {
    const totalItems = b.items ? b.items.reduce((s, i) => s + (i.qty || 1), 0) : 0;
    const payClass = (b.paymentMethod || "Cash").toLowerCase();

    return `
      <tr>
        <td><strong>${b.invoiceNo}</strong></td>
        <td>
          <span>${b.date}</span>
          <small style="display:block; color:var(--text-muted);">${b.time || ''}</small>
        </td>
        <td>${b.customerName || 'Walk-in Customer'}</td>
        <td>${totalItems} units (${(b.items || []).length} items)</td>
        <td>₹${Number(b.subtotal || 0).toFixed(2)}</td>
        <td style="color:var(--color-danger);">- ₹${Number(b.discount || 0).toFixed(2)}</td>
        <td>+ ₹${Number(b.tax || 0).toFixed(2)}</td>
        <td><strong style="color:var(--color-primary); font-size: 0.95rem;">₹${Number(b.total || 0).toFixed(2)}</strong></td>
        <td><span class="payment-badge ${payClass}">${b.paymentMethod || 'Cash'}</span></td>
        <td>
          <button class="btn-view-invoice" onclick="openInvoiceModal('${b.invoiceNo}')">View / Print</button>
        </td>
      </tr>
    `;
  }).join("");
}

function openInvoiceModal(invoiceNo) {
  const bills = getBills();
  const bill = bills.find(b => b.invoiceNo === invoiceNo);
  if (!bill) return;

  document.getElementById("invNo").textContent = bill.invoiceNo;
  document.getElementById("invDateTime").textContent = `${bill.date} ${bill.time || ''}`;
  document.getElementById("invCustomer").textContent = bill.customerName || "Walk-in Customer";
  document.getElementById("invMethod").textContent = bill.paymentMethod || "Cash";
  document.getElementById("invSubtotal").textContent = `₹${Number(bill.subtotal || 0).toFixed(2)}`;
  document.getElementById("invDiscount").textContent = `- ₹${Number(bill.discount || 0).toFixed(2)}`;
  document.getElementById("invTax").textContent = `+ ₹${Number(bill.tax || 0).toFixed(2)}`;
  document.getElementById("invGrandTotal").textContent = `₹${Number(bill.total || 0).toFixed(2)}`;

  const itemsBody = document.getElementById("invItemsBody");
  if (itemsBody && bill.items) {
    itemsBody.innerHTML = bill.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>₹${Number(item.price).toFixed(2)}</td>
        <td>₹${(Number(item.price) * Number(item.qty)).toFixed(2)}</td>
      </tr>
    `).join("");
  }

  document.getElementById("viewInvoiceModal")?.classList.add("active");
}

function closeInvoiceModal() {
  document.getElementById("viewInvoiceModal")?.classList.remove("active");
}

document.addEventListener("DOMContentLoaded", () => {
  updateMetrics();
  renderBillsTable();
  document.getElementById("billSearchInput")?.addEventListener("input", renderBillsTable);
});

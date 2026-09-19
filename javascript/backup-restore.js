/* ==========================================================================
   FRESHHARVEST SUPERMARKET - BACKUP & RESTORE SCRIPT
   ========================================================================== */

function updateDBStats() {
  const prods = JSON.parse(localStorage.getItem("pos_products") || "[]");
  const bills = JSON.parse(localStorage.getItem("pos_bills") || "[]");
  const custs = JSON.parse(localStorage.getItem("pos_customers") || "[]");
  const sups = JSON.parse(localStorage.getItem("suppliersList") || "[]");

  document.getElementById("statProdCount").textContent = prods.length;
  document.getElementById("statBillsCount").textContent = bills.length;
  document.getElementById("statCustCount").textContent = custs.length;
  document.getElementById("statSupCount").textContent = sups.length;
}

function exportFullBackup() {
  const backupData = {
    version: "2.0",
    exportDate: new Date().toISOString(),
    system: "FreshHarvest Supermarket",
    collections: {
      pos_products: JSON.parse(localStorage.getItem("pos_products") || "[]"),
      pos_bills: JSON.parse(localStorage.getItem("pos_bills") || "[]"),
      pos_customers: JSON.parse(localStorage.getItem("pos_customers") || "[]"),
      pos_categories: JSON.parse(localStorage.getItem("pos_categories") || "[]"),
      pos_settings: JSON.parse(localStorage.getItem("pos_settings") || "{}"),
      suppliersList: JSON.parse(localStorage.getItem("suppliersList") || "[]"),
      purchasesList: JSON.parse(localStorage.getItem("purchasesList") || "[]"),
      staffMembers: JSON.parse(localStorage.getItem("staffMembers") || "[]"),
      pos_offers: JSON.parse(localStorage.getItem("pos_offers") || "[]"),
      pos_returns: JSON.parse(localStorage.getItem("pos_returns") || "[]"),
      heldBillsList: JSON.parse(localStorage.getItem("heldBillsList") || "[]")
    }
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  const dateTag = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  downloadAnchor.setAttribute("download", `FreshHarvest_Backup_${dateTag}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function handleFileRestore(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.collections) {
        throw new Error("Invalid FreshHarvest backup structure!");
      }

      const cols = parsed.collections;
      if (cols.pos_products) localStorage.setItem("pos_products", JSON.stringify(cols.pos_products));
      if (cols.pos_bills) localStorage.setItem("pos_bills", JSON.stringify(cols.pos_bills));
      if (cols.pos_customers) localStorage.setItem("pos_customers", JSON.stringify(cols.pos_customers));
      if (cols.pos_categories) localStorage.setItem("pos_categories", JSON.stringify(cols.pos_categories));
      if (cols.pos_settings) localStorage.setItem("pos_settings", JSON.stringify(cols.pos_settings));
      if (cols.suppliersList) localStorage.setItem("suppliersList", JSON.stringify(cols.suppliersList));
      if (cols.purchasesList) localStorage.setItem("purchasesList", JSON.stringify(cols.purchasesList));
      if (cols.staffMembers) localStorage.setItem("staffMembers", JSON.stringify(cols.staffMembers));
      if (cols.pos_offers) localStorage.setItem("pos_offers", JSON.stringify(cols.pos_offers));
      if (cols.pos_returns) localStorage.setItem("pos_returns", JSON.stringify(cols.pos_returns));
      if (cols.heldBillsList) localStorage.setItem("heldBillsList", JSON.stringify(cols.heldBillsList));

      updateDBStats();
      alert("Database backup restored successfully! All collections updated.");
    } catch (err) {
      alert("Error restoring file: " + err.message);
    }
  };
  reader.readAsText(file);
}

function resetFactoryDemoData() {
  if (confirm("Reset database to initial factory demo dataset? This will replace any custom products or test bills.")) {
    localStorage.clear();
    alert("Database cleared. Reloading page to generate clean factory demo dataset...");
    window.location.href = "home.html";
  }
}

function clearAllDataPrompt() {
  const answer = prompt("DANGER: Type 'DELETE' to permanently wipe all stored database records:");
  if (answer === "DELETE") {
    localStorage.clear();
    updateDBStats();
    alert("All supermarket data has been permanently cleared.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateDBStats();
});

/* ==========================================================================
   FRESHHARVEST SUPERMARKET - STORE SETTINGS SCRIPT
   ========================================================================== */

function getSettings() {
  return JSON.parse(localStorage.getItem("pos_settings") || "{}");
}

function saveSettings(settings) {
  localStorage.setItem("pos_settings", JSON.stringify(settings));
}

function loadSettingsForm() {
  const s = getSettings();

  document.getElementById("setStoreName").value = s.storeName || "FreshHarvest Supermarket";
  document.getElementById("setTagline").value = s.tagline || "Good Food Brighter You";
  document.getElementById("setAddress").value = s.address || "Plot 42, Green Avenue, Fresh City";
  document.getElementById("setPhone").value = s.phone || "+91 98765 43210";
  document.getElementById("setEmail").value = s.email || "support@freshharvest.com";
  document.getElementById("setGST").value = s.gstNumber || "GSTIN29ABCDE1234F1Z5";
  document.getElementById("setTaxRate").value = s.taxRate || 5;
  document.getElementById("setCurrency").value = s.currency || "₹";
  document.getElementById("setPointsRatio").value = s.pointsRatio || 10;
  document.getElementById("setReceiptHeader").value = s.receiptHeader || "FreshHarvest Supermarket - Quality Groceries";
  document.getElementById("setReceiptFooter").value = s.receiptFooter || "Thank you for shopping with us! Have a healthy day.";
}

function handleSettingsSave(e) {
  e.preventDefault();

  const settings = {
    storeName: document.getElementById("setStoreName").value.trim(),
    tagline: document.getElementById("setTagline").value.trim(),
    address: document.getElementById("setAddress").value.trim(),
    phone: document.getElementById("setPhone").value.trim(),
    email: document.getElementById("setEmail").value.trim(),
    gstNumber: document.getElementById("setGST").value.trim(),
    taxRate: parseFloat(document.getElementById("setTaxRate").value) || 0,
    currency: document.getElementById("setCurrency").value.trim() || "₹",
    pointsRatio: parseInt(document.getElementById("setPointsRatio").value, 10) || 10,
    receiptHeader: document.getElementById("setReceiptHeader").value.trim(),
    receiptFooter: document.getElementById("setReceiptFooter").value.trim()
  };

  saveSettings(settings);
  alert("Store Settings & POS Parameters saved successfully!");
}

function resetSettingsDefaults() {
  if (confirm("Reset store configuration parameters to default settings?")) {
    const defaults = {
      storeName: "FreshHarvest Supermarket",
      tagline: "Good Food Brighter You",
      address: "Plot 42, Green Avenue, Fresh City",
      phone: "+91 98765 43210",
      email: "support@freshharvest.com",
      gstNumber: "GSTIN29ABCDE1234F1Z5",
      taxRate: 5,
      currency: "₹",
      pointsRatio: 10,
      receiptHeader: "FreshHarvest Supermarket - Fresh Groceries",
      receiptFooter: "Thank you for shopping with us! Have a healthy day."
    };
    saveSettings(defaults);
    loadSettingsForm();
    alert("Settings reset to factory defaults.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSettingsForm();
});

/* ==========================================================================
   FRESHHARVEST SUPERMARKET - STORE SETTINGS SCRIPT
   ========================================================================== */

function getSettings() {
  return JSON.parse(localStorage.getItem("pos_settings") || "{}");
}

function saveSettings(settings) {
  localStorage.setItem("pos_settings", JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("freshHarvestDataUpdated", { detail: { type: "settings", data: settings } }));
  window.dispatchEvent(new CustomEvent("freshHarvestSettingsUpdated", { detail: settings }));
}

function loadSettingsForm() {
  const s = getSettings();

  const setVal = (id, val, fallback) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null && val !== "" ? val : fallback;
  };

  setVal("setStoreName", s.storeName, "FreshHarvest Supermarket");
  setVal("setTagline", s.tagline, "Good Food Brighter You");
  setVal("setAddress", s.address, "Plot 42, Green Avenue, Fresh City");
  setVal("setPhone", s.phone, "+91 98765 43210");
  setVal("setEmail", s.email, "support@freshharvest.com");
  setVal("setGST", s.gstNumber, "GSTIN29ABCDE1234F1Z5");
  setVal("setTaxRate", s.taxRate, 5);
  setVal("setCurrency", s.currency, "₹");
  setVal("setPointsRatio", s.pointsRatio, 10);
  setVal("setReceiptHeader", s.receiptHeader, "FreshHarvest Supermarket - Quality Groceries");
  setVal("setReceiptFooter", s.receiptFooter, "Thank you for shopping with us! Have a healthy day.");
}

function showSaveStatus(message, isError = false) {
  const statusEl = document.getElementById("storeSettingsSaveStatus");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#ef4444" : "#16a34a";
  statusEl.style.display = "inline-block";

  clearTimeout(window._saveStatusTimeout);
  window._saveStatusTimeout = setTimeout(() => {
    statusEl.textContent = "";
  }, 4000);
}

function saveStoreSettings(e) {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
  }

  const storeNameInput = document.getElementById("setStoreName");
  const storeName = storeNameInput ? storeNameInput.value.trim() : "";

  if (!storeName) {
    if (storeNameInput) storeNameInput.focus();
    showSaveStatus("⚠️ Please enter a Supermarket Name.", true);
    return false;
  }

  const settings = {
    storeName: storeName,
    tagline: document.getElementById("setTagline")?.value.trim() || "Good Food Brighter You",
    address: document.getElementById("setAddress")?.value.trim() || "",
    phone: document.getElementById("setPhone")?.value.trim() || "",
    email: document.getElementById("setEmail")?.value.trim() || "",
    gstNumber: document.getElementById("setGST")?.value.trim() || "",
    taxRate: parseFloat(document.getElementById("setTaxRate")?.value) || 0,
    currency: document.getElementById("setCurrency")?.value.trim() || "₹",
    pointsRatio: parseInt(document.getElementById("setPointsRatio")?.value, 10) || 10,
    receiptHeader: document.getElementById("setReceiptHeader")?.value.trim() || "",
    receiptFooter: document.getElementById("setReceiptFooter")?.value.trim() || ""
  };

  saveSettings(settings);
  showSaveStatus("✅ Store settings saved successfully!");

  // If DataStore is available, ensure header updates dynamically
  const headerStore = document.getElementById("headerStoreName");
  if (headerStore) {
    headerStore.textContent = settings.storeName + ", Counter #1";
  }

  return true;
}

function handleSettingsSave(e) {
  saveStoreSettings(e);
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
    showSaveStatus("↺ Settings reset to factory defaults.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSettingsForm();

  const saveButton = document.getElementById("saveStoreSettingsBtn");
  if (!saveButton) {
    console.error("❌ Save Store Settings button not found");
    return;
  }

  saveButton.addEventListener("click", saveStoreSettings);
  console.log("✅ Save Store Settings button connected");
});


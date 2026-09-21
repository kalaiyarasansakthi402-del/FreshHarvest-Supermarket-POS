/* ==========================================================================
   FRESHHARVEST SUPERMARKET - STORE SETTINGS SCRIPT
   ========================================================================== */

function getSettings() {
  if (window.DataStore && typeof window.DataStore.getSettings === "function") {
    return window.DataStore.getSettings();
  }
  if (typeof window.getStoreSettings === "function") {
    return window.getStoreSettings();
  }
  const raw = localStorage.getItem("freshHarvestStoreSettings") ||
              localStorage.getItem("freshHarvestSettings") ||
              localStorage.getItem("pos_settings");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveSettings(settings) {
  if (window.DataStore && typeof window.DataStore.saveSettings === "function") {
    return window.DataStore.saveSettings(settings);
  }
  const name = settings.supermarketName || settings.storeName || "FreshHarvest Supermarket";
  const slogan = settings.slogan || settings.tagline || "Fresh Products • Smart Billing • Better Shopping";
  const gstin = settings.gstin || settings.gstNumber || "29ABCDE1234F1Z5";
  const tax = settings.defaultGstRate !== undefined ? Number(settings.defaultGstRate) : (settings.taxRate !== undefined ? Number(settings.taxRate) : 5);
  const curr = settings.currencySymbol || settings.currency || "₹";
  const pts = settings.loyaltyPointsRatio !== undefined ? Number(settings.loyaltyPointsRatio) : (settings.pointsRatio !== undefined ? Number(settings.pointsRatio) : 10);

  const full = {
    ...settings,
    supermarketName: name,
    storeName: name,
    slogan: slogan,
    tagline: slogan,
    gstin: gstin,
    gstNumber: gstin,
    defaultGstRate: tax,
    taxRate: tax,
    currencySymbol: curr,
    currency: curr,
    loyaltyPointsRatio: pts,
    pointsRatio: pts
  };

  const serialized = JSON.stringify(full);
  localStorage.setItem("freshHarvestStoreSettings", serialized);
  localStorage.setItem("freshHarvestSettings", serialized);
  localStorage.setItem("pos_settings", serialized);

  window.dispatchEvent(new CustomEvent("freshHarvestDataUpdated", { detail: { key: "SETTINGS", data: full } }));
  window.dispatchEvent(new CustomEvent("freshHarvestSettingsUpdated", { detail: full }));
  if (typeof window.applyStoreIdentityToDOM === "function") {
    window.applyStoreIdentityToDOM(full);
  }
  return full;
}

function loadSettingsForm() {
  const s = getSettings();

  const setVal = (id, val, fallback) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null && val !== "" ? val : fallback;
  };

  setVal("setStoreName", s.supermarketName || s.storeName, "FreshHarvest Supermarket");
  setVal("setTagline", s.slogan || s.tagline, "Fresh Products • Smart Billing • Better Shopping");
  setVal("setAddress", s.address, "Shop #14, Green Valley High Street, Bengaluru, Karnataka 560001");
  setVal("setPhone", s.phone, "+91 98765 43210");
  setVal("setEmail", s.email, "contact@freshharvest.store");
  setVal("setGST", s.gstin || s.gstNumber, "29ABCDE1234F1Z5");
  setVal("setTaxRate", s.defaultGstRate !== undefined ? s.defaultGstRate : s.taxRate, 5);
  setVal("setCurrency", s.currencySymbol || s.currency, "₹");
  setVal("setPointsRatio", s.loyaltyPointsRatio !== undefined ? s.loyaltyPointsRatio : s.pointsRatio, 10);
  setVal("setReceiptHeader", s.receiptHeader, (s.supermarketName || s.storeName || "FreshHarvest Supermarket") + " - Quality Groceries");
  setVal("setReceiptFooter", s.receiptFooter || s.receiptFooterMessage, "Thank you for shopping with us! Have a healthy day.");
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

  const storeNameInput = document.getElementById("setStoreName") || document.getElementById("supermarketName");
  const storeName = storeNameInput ? storeNameInput.value.trim() : "";

  if (!storeName) {
    if (storeNameInput) storeNameInput.focus();
    showSaveStatus("❌ Supermarket Name is required. Please enter a store name.", true);
    return false;
  }

  const phoneInput = document.getElementById("setPhone") || document.getElementById("storePhone");
  const phone = phoneInput ? phoneInput.value.trim() : "";

  const emailInput = document.getElementById("setEmail") || document.getElementById("storeEmail");
  const email = emailInput ? emailInput.value.trim() : "";

  const taxRateInput = document.getElementById("setTaxRate") || document.getElementById("defaultGstRate");
  const defaultGstRate = taxRateInput && !isNaN(parseFloat(taxRateInput.value)) ? parseFloat(taxRateInput.value) : 5;

  const pointsRatioInput = document.getElementById("setPointsRatio") || document.getElementById("loyaltyPointsRatio");
  const loyaltyPointsRatio = pointsRatioInput && !isNaN(parseInt(pointsRatioInput.value, 10)) ? parseInt(pointsRatioInput.value, 10) : 10;

  const slogan = (document.getElementById("setTagline") || document.getElementById("storeSlogan"))?.value.trim() || "Fresh Products • Smart Billing • Better Shopping";
  const address = (document.getElementById("setAddress") || document.getElementById("storeAddress"))?.value.trim() || "";
  const gstin = (document.getElementById("setGST") || document.getElementById("gstin"))?.value.trim() || "";
  const currencySymbol = (document.getElementById("setCurrency") || document.getElementById("currencySymbol"))?.value.trim() || "₹";
  const receiptHeader = document.getElementById("setReceiptHeader")?.value.trim() || `${storeName} - Quality Groceries`;
  const receiptFooter = document.getElementById("setReceiptFooter")?.value.trim() || "Thank you for shopping with us! Have a healthy day.";

  const settings = {
    supermarketName: storeName,
    storeName: storeName,
    slogan: slogan,
    tagline: slogan,
    address: address,
    phone: phone,
    email: email,
    gstin: gstin,
    gstNumber: gstin,
    defaultGstRate: defaultGstRate,
    taxRate: defaultGstRate,
    currencySymbol: currencySymbol,
    currency: currencySymbol,
    loyaltyPointsRatio: loyaltyPointsRatio,
    pointsRatio: loyaltyPointsRatio,
    receiptHeader: receiptHeader,
    receiptFooter: receiptFooter,
    receiptFooterMessage: receiptFooter
  };

  try {
    saveSettings(settings);

    // Verify persistence immediately
    const verifyRaw = localStorage.getItem("freshHarvestStoreSettings");
    if (!verifyRaw) {
      throw new Error("Persistence verification failed");
    }
    const verifyObj = JSON.parse(verifyRaw);
    if ((verifyObj.supermarketName || verifyObj.storeName) !== storeName) {
      throw new Error("Stored name mismatch");
    }

    showSaveStatus("✅ Store settings saved successfully.");

    // Update DOM on current page
    if (typeof window.applyStoreIdentityToDOM === "function") {
      window.applyStoreIdentityToDOM(settings);
    } else {
      const headerStore = document.getElementById("headerStoreName");
      if (headerStore) headerStore.textContent = storeName + ", Counter #1";
    }

    return true;
  } catch (err) {
    console.error("Save store settings error:", err);
    showSaveStatus("❌ Unable to save store settings. Please try again.", true);
    return false;
  }
}

function handleSettingsSave(e) {
  saveStoreSettings(e);
}

function resetSettingsDefaults() {
  if (confirm("Reset store configuration parameters to default settings?")) {
    const defaults = {
      supermarketName: "FreshHarvest Supermarket",
      storeName: "FreshHarvest Supermarket",
      slogan: "Fresh Products • Smart Billing • Better Shopping",
      tagline: "Fresh Products • Smart Billing • Better Shopping",
      address: "Shop #14, Green Valley High Street, Bengaluru, Karnataka 560001",
      phone: "+91 98765 43210",
      email: "contact@freshharvest.store",
      gstin: "29ABCDE1234F1Z5",
      gstNumber: "29ABCDE1234F1Z5",
      defaultGstRate: 5,
      taxRate: 5,
      currencySymbol: "₹",
      currency: "₹",
      loyaltyPointsRatio: 10,
      pointsRatio: 10,
      receiptHeader: "FreshHarvest Supermarket - Quality Groceries",
      receiptFooter: "Thank you for shopping with us! Have a healthy day.",
      receiptFooterMessage: "Thank you for shopping with us! Have a healthy day."
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


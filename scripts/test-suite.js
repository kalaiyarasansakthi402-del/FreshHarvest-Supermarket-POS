/**
 * FreshHarvest Supermarket POS - Automated Test Suite
 */
const fs = require('fs');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('  FreshHarvest POS — Automated Test & Validation');
console.log('====================================================\n');

let failed = 0;

// Test 1: JS Syntax Validation
console.log('Test 1: Validating JavaScript syntax across all files...');
const jsFiles = fs.readdirSync('.').filter(f => f.endsWith('.js'));
jsFiles.forEach(f => {
  try {
    execSync('node -c ' + f, { stdio: 'pipe' });
  } catch (e) {
    console.error('  ❌ Syntax Error in ' + f);
    failed++;
  }
});
console.log('  ✅ ' + jsFiles.length + ' JS files passed syntax check.\n');

// Test 2: HTML Page Integrity & Required Files
console.log('Test 2: Verifying HTML templates and required components...');
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const requiredPages = [
  'home.html', 'billing.html', 'cashier.html', 'products.html', 'all-items.html',
  'items.html', 'stock-control.html', 'bills-history.html', 'customers.html',
  'categories.html', 'purchases.html', 'suppliers.html', 'returns.html',
  'offers-deals.html', 'loyalty.html', 'reports-profit.html', 'staff-roles.html',
  'backup-restore.html', 'store-settings.html'
];

requiredPages.forEach(p => {
  if (!fs.existsSync(p)) {
    console.error('  ❌ Missing required page: ' + p);
    failed++;
  }
});
console.log('  ✅ All ' + requiredPages.length + ' required pages exist.\n');

// Test 3: Zero Hardcoded Mobile Numbers
console.log('Test 3: Checking for hardcoded customer phone numbers...');
let hardcodedFound = false;
[...htmlFiles, ...jsFiles].forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('9360077954')) {
    console.error('  ❌ Hardcoded phone number found in ' + f);
    failed++;
    hardcodedFound = true;
  }
});
if (!hardcodedFound) {
  console.log('  ✅ Zero hardcoded phone numbers found.\n');
}

// Test 4: Zero Legacy Mobile Hamburger Buttons
console.log('Test 4: Checking for legacy hamburger buttons (btn-mobile-menu)...');
let legacyFound = false;
htmlFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('btn-mobile-menu') || content.includes('toggleMobileSidebar')) {
    console.error('  ❌ Legacy mobile button found in ' + f);
    failed++;
    legacyFound = true;
  }
});
if (!legacyFound) {
  console.log('  ✅ Clean header UI across all pages (0 legacy hamburger buttons).\n');
}

// Test 5: Store Settings Save Action & Feedback Elements
console.log('Test 5: Verifying Store Settings UI actions and elements...');
try {
  const storeSettingsHtml = fs.readFileSync('store-settings.html', 'utf8');
  const storeSettingsCss = fs.readFileSync('store-settings.css', 'utf8');
  const storeSettingsJs = fs.readFileSync('store-settings.js', 'utf8');
  
  if (
    storeSettingsHtml.includes('id="saveStoreSettingsBtn"') &&
    storeSettingsHtml.includes('class="btn-save-store-settings"') &&
    storeSettingsHtml.includes('id="storeSettingsSaveStatus"') &&
    storeSettingsCss.includes('.btn-save-store-settings') &&
    storeSettingsJs.includes('saveStoreSettings')
  ) {
    console.log('  ✅ Store Settings Save Button and Status elements verified.\n');
  } else {
    console.error('  ❌ Store Settings UI elements missing or misconfigured.');
    failed++;
  }
} catch (err) {
  console.error('  ❌ Error validating store settings:', err.message);
  failed++;
}


// Test 6: Zero Full Screen Buttons or Handlers Across Project
console.log('Test 6: Checking for complete removal of Full Screen buttons...');
let fullscreenFound = false;
const allSourceFiles = [
  ...htmlFiles,
  ...jsFiles,
  ...fs.readdirSync('.').filter(f => f.endsWith('.css'))
];
allSourceFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (
    content.includes('⛶') ||
    /btn-fullscreen/i.test(content) ||
    /toggleFullscreen/i.test(content) ||
    /initFullscreen/i.test(content) ||
    /isFullscreenActive/i.test(content) ||
    /Full Screen/i.test(content)
  ) {
    console.error('  ❌ Full Screen reference found in ' + f);
    failed++;
    fullscreenFound = true;
  }
});
if (!fullscreenFound) {
  console.log('  ✅ Zero Full Screen references found across HTML, JS, and CSS files.\n');
}

// Test 7: Items Page "+ Add Item" Button, Modal, and Logic
console.log('Test 7: Verifying Items page "+ Add Item" modal and styling...');
try {
  const itemsHtml = fs.readFileSync('items.html', 'utf8');
  const itemsCss = fs.readFileSync('items.css', 'utf8');
  const itemsJs = fs.readFileSync('items.js', 'utf8');

  if (
    itemsHtml.includes('id="addItemBtn"') &&
    itemsHtml.includes('openAddItemModal') &&
    itemsHtml.includes('id="itemModal"') &&
    itemsCss.includes('.modal-overlay.active') &&
    itemsCss.includes('display: flex') &&
    itemsJs.includes('openAddItemModal') &&
    itemsJs.includes('handleItemFormSubmit')
  ) {
    console.log('  ✅ Items page "+ Add Item" modal, button, and scripts verified.\n');
  } else {
    console.error('  ❌ Items page components missing or misconfigured.');
    failed++;
  }
} catch (err) {
  console.error('  ❌ Error validating Items page:', err.message);
  failed++;
}

// Test 8: Central Store Settings & Items Persistence E2E Sandbox Simulation
console.log('Test 8: Validating Store Settings & Items DataStore persistence...');
try {
  // Mock browser environment for DataStore
  const storageMap = new Map();
  const mockLocalStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear(),
    get length() { return storageMap.size; },
    key: (i) => Array.from(storageMap.keys())[i] || null
  };

  const mockWindow = {
    localStorage: mockLocalStorage,
    addEventListener: () => {},
    dispatchEvent: () => true,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
  };

  const vm = require('vm');
  const dsCode = fs.readFileSync('data-store.js', 'utf8');
  const context = vm.createContext({
    window: mockWindow,
    localStorage: mockLocalStorage,
    CustomEvent: mockWindow.CustomEvent,
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number
  });

  vm.runInContext(dsCode, context);
  const DataStore = context.window.DataStore;

  if (!DataStore) {
    throw new Error('DataStore failed to initialize in sandbox');
  }

  // 8a: Verify initial non-destructive default load
  const initialSettings = DataStore.getSettings();
  if (!initialSettings.supermarketName) {
    throw new Error('Initial supermarketName is missing');
  }

  // 8b: Test saving "kalai"
  DataStore.saveSettings({
    supermarketName: 'kalai',
    slogan: 'Test Slogan',
    contactPhone: '+91 99999 88888',
    address: '123 Test Street'
  });

  let readSettings = DataStore.getSettings();
  if (readSettings.supermarketName !== 'kalai') {
    throw new Error('Failed to save "kalai": got ' + readSettings.supermarketName);
  }

  // 8c: Test updating "kalai" -> "FreshHarvest Supermarket"
  DataStore.saveSettings({
    supermarketName: 'FreshHarvest Supermarket',
    slogan: 'Fresh Products • Smart Billing',
    contactPhone: '+91 98765 43210',
    address: 'Shop #14, Green Valley High Street, Bengaluru'
  });

  readSettings = DataStore.getSettings();
  if (readSettings.supermarketName !== 'FreshHarvest Supermarket') {
    throw new Error('Failed to update to FreshHarvest Supermarket');
  }

  // 8d: Test survival across browser reload (re-running data-store.js in new context with existing storage)
  const reloadContext = vm.createContext({
    window: mockWindow,
    localStorage: mockLocalStorage,
    CustomEvent: mockWindow.CustomEvent,
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number
  });
  vm.runInContext(dsCode, reloadContext);
  const ReloadedDataStore = reloadContext.window.DataStore;

  const persistedSettings = ReloadedDataStore.getSettings();
  if (persistedSettings.supermarketName !== 'FreshHarvest Supermarket') {
    throw new Error('Store name did not survive reload! Got: ' + persistedSettings.supermarketName);
  }

  // Verify synchronization across storage keys
  const primaryStorage = JSON.parse(mockLocalStorage.getItem('freshHarvestStoreSettings') || '{}');
  const legacyStorage1 = JSON.parse(mockLocalStorage.getItem('freshHarvestSettings') || '{}');
  const legacyStorage2 = JSON.parse(mockLocalStorage.getItem('pos_settings') || '{}');

  if (
    primaryStorage.supermarketName !== 'FreshHarvest Supermarket' ||
    legacyStorage1.supermarketName !== 'FreshHarvest Supermarket' ||
    legacyStorage2.storeName !== 'FreshHarvest Supermarket'
  ) {
    throw new Error('Settings not synchronized across all 3 storage keys');
  }

  // 8e: Test creating an item via DataStore and verifying persistence across reload
  const newItem = {
    name: 'Organic Red Apples',
    category: 'Fruits',
    price: 120,
    costPrice: 80,
    stock: 45,
    unit: 'kg',
    barcode: '8901234567890'
  };
  const savedItem = ReloadedDataStore.saveProduct(newItem);
  if (!savedItem || !savedItem.id) {
    throw new Error('Failed to save product in DataStore');
  }

  // Re-run context again to test product reload survival
  const secondReloadContext = vm.createContext({
    window: mockWindow,
    localStorage: mockLocalStorage,
    CustomEvent: mockWindow.CustomEvent,
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number
  });
  vm.runInContext(dsCode, secondReloadContext);
  const ThirdDataStore = secondReloadContext.window.DataStore;

  const products = ThirdDataStore.getProducts();
  const foundItem = products.find(p => p.id === savedItem.id || p.barcode === '8901234567890');
  if (!foundItem || foundItem.name !== 'Organic Red Apples') {
    throw new Error('Created item did not survive storage reload');
  }

  console.log('  ✅ Central Store Settings & Items persistence and reload verified.\n');
} catch (err) {
  console.error('  ❌ DataStore persistence test failed:', err.message);
  failed++;
}

console.log('====================================================');
if (failed === 0) {
  console.log('  🎉 ALL AUTOMATED TESTS PASSED (0 failures)!');
  console.log('====================================================');
  process.exit(0);
} else {
  console.error('  ❌ ' + failed + ' test(s) failed!');
  console.log('====================================================');
  process.exit(1);
}
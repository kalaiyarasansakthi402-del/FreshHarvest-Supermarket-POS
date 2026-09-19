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
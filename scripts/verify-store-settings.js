const fs = require('fs');

function checkFile(relPath, requiredSubstrings) {
  const content = fs.readFileSync(relPath, 'utf8');
  let pass = true;
  for (const str of requiredSubstrings) {
    if (!content.includes(str)) {
      console.error(`❌ [${relPath}] Missing expected substring: ${str}`);
      pass = false;
    }
  }
  return pass;
}

console.log('=== STORE SETTINGS VERIFICATION ===');

let allOk = true;

allOk = checkFile('store-settings.html', [
  'id="saveStoreSettingsBtn"',
  'class="btn-save-store-settings"',
  '💾 Save Store Settings',
  'id="storeSettingsSaveStatus"',
  'class="store-settings-save-status"',
  'class="store-settings-actions"'
]) && allOk;

allOk = checkFile('store-settings.css', [
  '.store-settings-actions',
  '.btn-save-store-settings',
  '.store-settings-save-status'
]) && allOk;

allOk = checkFile('store-settings.js', [
  'function saveStoreSettings(',
  'function showSaveStatus(',
  'saveStoreSettingsBtn',
  'pos_settings'
]) && allOk;

allOk = checkFile('css/store-settings.css', [
  '.store-settings-actions',
  '.btn-save-store-settings'
]) && allOk;

allOk = checkFile('javascript/store-settings.js', [
  'function saveStoreSettings(',
  'saveStoreSettingsBtn'
]) && allOk;

if (allOk) {
  console.log('✅ ALL STORE-SETTINGS VALIDATION CHECKS PASSED!');
  process.exit(0);
} else {
  console.error('❌ Store settings validation failed.');
  process.exit(1);
}

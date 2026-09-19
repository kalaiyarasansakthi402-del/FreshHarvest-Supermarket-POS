/**
 * FreshHarvest Supermarket POS - Lint Checker
 */
const fs = require('fs');
const { execSync } = require('child_process');

console.log('Running JS syntax validation...');
const jsFiles = fs.readdirSync('.').filter(f => f.endsWith('.js'));
let hasErr = false;
jsFiles.forEach(f => {
  try {
    execSync('node -c ' + f);
  } catch (e) {
    console.error('Lint/Syntax Error in ' + f);
    hasErr = true;
  }
});
if (!hasErr) {
  console.log('All ' + jsFiles.length + ' JS files passed lint check!');
} else {
  process.exit(1);
}
/**
 * FreshHarvest Supermarket POS - Codebase Audit Tool
 */
const fs = require('fs');

console.log('FreshHarvest Codebase Audit Report:');
const html = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const css = fs.readdirSync('.').filter(f => f.endsWith('.css'));
const js = fs.readdirSync('.').filter(f => f.endsWith('.js'));

console.log('- Total HTML Pages:', html.length);
console.log('- Total Stylesheets:', css.length);
console.log('- Total JavaScript Modules:', js.length);
console.log('- PWA Assets:', fs.existsSync('manifest.json') && fs.existsSync('service-worker.js') ? '✅ Present' : '❌ Missing');
console.log('- Docker Assets:', fs.existsSync('Dockerfile') && fs.existsSync('docker-compose.yml') ? '✅ Present' : '❌ Missing');
console.log('- CI/CD Pipeline:', fs.existsSync('Jenkinsfile') ? '✅ Present' : '❌ Missing');
console.log('Audit Completed Successfully.');
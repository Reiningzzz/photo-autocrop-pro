const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('index.html', 'utf8');

// 1. All Button IDs in index.html
const btnRegex = /<button\s+[^>]*id=["']([^"']+)["'][^>]*>/gi;
const allButtons = new Set();
let m;
while ((m = btnRegex.exec(html)) !== null) {
  allButtons.add(m[1]);
}

// 2. All Menu Dropdown Items with ID
const menuRegex = /<div\s+[^>]*class=["'][^"']*menu-dropdown-item[^"']*["'][^>]*id=["']([^"']+)["'][^>]*>/gi;
const allMenuItems = new Set();
while ((m = menuRegex.exec(html)) !== null) {
  allMenuItems.add(m[1]);
}

// 3. All Modals
const modalRegex = /<div\s+[^>]*class=["'][^"']*modal-backdrop[^"']*["'][^>]*id=["']([^"']+)["'][^>]*>/gi;
const allModals = new Set();
while ((m = modalRegex.exec(html)) !== null) {
  allModals.add(m[1]);
}

// Read all test suites to check occurrences
const testFiles = [
  'test/test_ui_comprehensive.js',
  'test/canvas-interaction-test-suite.js',
  'test/export-suite-test.js',
  'test/qa-bdd-test-suite.js'
];

let allTestsContent = '';
testFiles.forEach(f => {
  if (fs.existsSync(f)) {
    allTestsContent += '\n' + fs.readFileSync(f, 'utf8');
  }
});

console.log('=== 全軟體介面元素覆蓋率審查 ===');
console.log(`總按鈕數 (含 ID): ${allButtons.size}`);
console.log(`總選單項數 (含 ID): ${allMenuItems.size}`);
console.log(`總彈窗數 (Modal Backdrop): ${allModals.size}`);

const uncoveredButtons = [];
allButtons.forEach(btnId => {
  if (!allTestsContent.includes(btnId)) {
    uncoveredButtons.push(btnId);
  }
});

const uncoveredMenuItems = [];
allMenuItems.forEach(itemId => {
  if (!allTestsContent.includes(itemId)) {
    uncoveredMenuItems.push(itemId);
  }
});

const uncoveredModals = [];
allModals.forEach(modalId => {
  if (!allTestsContent.includes(modalId)) {
    uncoveredModals.push(modalId);
  }
});

console.log('\n--- 按鈕覆蓋審查 ---');
console.log(`已覆蓋按鈕: ${allButtons.size - uncoveredButtons.length} / ${allButtons.size} (${((allButtons.size - uncoveredButtons.length) / allButtons.size * 100).toFixed(1)}%)`);
if (uncoveredButtons.length > 0) {
  console.log('未在測試腳本中直接具名出現的按鈕:', uncoveredButtons);
}

console.log('\n--- 選單項覆蓋審查 ---');
console.log(`已覆蓋選單項: ${allMenuItems.size - uncoveredMenuItems.length} / ${allMenuItems.size} (${((allMenuItems.size - uncoveredMenuItems.length) / allMenuItems.size * 100).toFixed(1)}%)`);
if (uncoveredMenuItems.length > 0) {
  console.log('未在測試腳本中直接具名出現的選單項:', uncoveredMenuItems);
}

console.log('\n--- 彈窗覆蓋審查 ---');
console.log(`已覆蓋彈窗: ${allModals.size - uncoveredModals.length} / ${allModals.size} (${((allModals.size - uncoveredModals.length) / allModals.size * 100).toFixed(1)}%)`);
if (uncoveredModals.length > 0) {
  console.log('未在測試腳本中直接具名出現的彈窗:', uncoveredModals);
}

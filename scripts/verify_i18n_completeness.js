const fs = require('fs');
const path = require('path');
const { I18N_LOCALES } = require('../js/i18n.js');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// 提取所有 data-i18n, data-i18n-title, data-i18n-placeholder 的 key
const i18nKeys = new Set();
const titleKeys = new Set();
const placeholderKeys = new Set();

const regexI18n = /data-i18n="([^"]+)"/g;
let m;
while ((m = regexI18n.exec(indexHtml)) !== null) {
  i18nKeys.add(m[1]);
}

const regexTitle = /data-i18n-title="([^"]+)"/g;
while ((m = regexTitle.exec(indexHtml)) !== null) {
  titleKeys.add(m[1]);
}

const regexPlaceholder = /data-i18n-placeholder="([^"]+)"/g;
while ((m = regexPlaceholder.exec(indexHtml)) !== null) {
  placeholderKeys.add(m[1]);
}

console.log(`Found in index.html:`);
console.log(`- data-i18n keys: ${i18nKeys.size}`);
console.log(`- data-i18n-title keys: ${titleKeys.size}`);
console.log(`- data-i18n-placeholder keys: ${placeholderKeys.size}`);

const allKeys = new Set([...i18nKeys, ...titleKeys, ...placeholderKeys]);
console.log(`Total unique DOM keys: ${allKeys.size}`);

let missingTotal = 0;
for (const locale of Object.keys(I18N_LOCALES)) {
  const dict = I18N_LOCALES[locale];
  const missing = [];
  for (const key of allKeys) {
    if (!dict[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.warn(`[${locale}] Missing ${missing.length} keys:`, missing.slice(0, 10));
    missingTotal += missing.length;
  } else {
    console.log(`[${locale}] 100% coverage (${allKeys.size}/${allKeys.size} keys present)!`);
  }
}

if (missingTotal === 0) {
  console.log('🎉 PERFECT! All 7 locales have 100% coverage of all HTML elements!');
} else {
  console.log(`Warning: Found total ${missingTotal} missing keys across locales.`);
}


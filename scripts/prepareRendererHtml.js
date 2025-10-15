const fs = require('fs');
const path = require('path');

const srcHtml = path.resolve(__dirname, '..', 'src', 'renderer', 'index.html');
const outDir = path.resolve(__dirname, '..', 'dist', 'renderer');
const outHtml = path.join(outDir, 'index.html');

fs.mkdirSync(outDir, { recursive: true });

let html = fs.readFileSync(srcHtml, 'utf8');

// Replace references to ../../dist/renderer/* with ./*
html = html.replace(/\.\.\/\.\.\/dist\/renderer\//g, './');

fs.writeFileSync(outHtml, html, 'utf8');
console.log('Prepared renderer HTML at', outHtml);

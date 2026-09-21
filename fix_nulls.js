const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

code = code.replace(/a\.curve\.localeCompare\(b\.curve\)/g, '(a.curve || "").localeCompare(b.curve || "")');
code = code.replace(/p\.curve ===/g, '(p.curve || "") ===');
code = code.replace(/p\.tags\[0\]/g, '(p.tags && p.tags[0])');

fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('Fixed missing fields (curve/tags) fallback!');

const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

code = code.replace('if (userProfile) {', 'if (userProfile && activeProduct) {');

fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('Fixed TS error!');

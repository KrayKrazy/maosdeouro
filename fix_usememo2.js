const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

code = code.replace(/useMemo\(\(\) => \{([\s\S]*?)\}, \[selectedCategory\]\);/, 'useMemo(() => {$1}, [catalog, selectedCategory]);');

fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('Fixed second useMemo!');

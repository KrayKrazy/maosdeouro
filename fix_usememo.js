const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

code = code.replace(
  "const categories = useMemo(() => ['Todas', ...Array.from(new Set(catalog.map(p => p.category)))], []);",
  "const categories = useMemo(() => ['Todas', ...Array.from(new Set(catalog.map(p => p.category)))], [catalog]);"
);

code = code.replace(
  "    }, [selectedCategory]);",
  "    }, [catalog, selectedCategory]);"
);

fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('Fixed useMemo dependencies!');

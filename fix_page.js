const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

// 1. Remove the static CATALOG import
code = code.replace("import { CATALOG, quoteM2, Variant, CatalogProduct } from '../data/products';", "import { quoteM2, Variant, CatalogProduct } from '../data/products';\nimport { supabase } from '@/lib/supabase';");

// 2. Add state and fetch logic inside Storefront
// We'll find: export default function Storefront() {
// And inject right after it
const injectState = `
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      const { data, error } = await supabase.from('products').select('*, variants(*)').order('name');
      if (data) {
        // Map the image_url to image and variants array
        const formatted = data.map(p => ({
          ...p,
          image: p.image_url,
          from_price_per_m2: Math.min(...p.variants.map((v: any) => v.price_per_m2))
        }));
        setCatalog(formatted as any);
      }
      setLoadingCatalog(false);
    }
    loadCatalog();
  }, []);
`;

code = code.replace('export default function Storefront() {', 'export default function Storefront() {\n' + injectState);

// 3. Replace CATALOG usage
code = code.split('CATALOG.map').join('catalog.map');
code = code.split('let prods = CATALOG;').join('let prods = catalog;');

// 4. Add a loading state for the catalog grid
// We find: <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
// And replace it conditionally
code = code.replace('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">', `
        {loadingCatalog ? (
          <div className="text-center py-20 text-[#D4AF37] animate-pulse font-serif text-xl">Carregando Acervo Exclusivo...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
`);

// 5. Close the conditional
// We find: </main>
code = code.replace('</div>\n      </main>', '</div>\n        )}\n      </main>');

fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('page.tsx conectado ao Supabase!');

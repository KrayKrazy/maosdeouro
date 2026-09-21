const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

const badJSX = `<span>Produto</span><span>{fmt(finalPrice)}</p>
                {includesInstallation && finalPrice > 0 && (
                  <p className="text-xs text-[#D4AF37] mt-1 italic">+ Instalação Inclusa</p>
                )}<span>`;

const goodJSX = `<span>Produto</span>
                         <span className="flex flex-col items-end">
                           {fmt(finalPrice)}
                           {includesInstallation && finalPrice > 0 && (
                             <span className="text-[10px] text-[#D4AF37] mt-1 uppercase tracking-wider">+ Instalação</span>
                           )}
                         </span>`;

code = code.replace(/<span>Produto<\/span><span>\{fmt\(finalPrice\)\}<\/p>[\s\S]*?\)\}<span>/, goodJSX);

fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('JSX Consertado!');

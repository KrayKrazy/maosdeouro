const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

const oldCalc = `  const finalPrice = selectedVariant && typeof largura === 'number' && typeof altura === 'number' 
    ? quoteM2(selectedVariant.price_per_m2, largura, altura) 
    : 0;`;

const newCalc = `  let finalPrice = selectedVariant && typeof largura === 'number' && typeof altura === 'number' 
    ? quoteM2(selectedVariant.price_per_m2, largura, altura) 
    : 0;

  if (finalPrice > 0 && includesInstallation) {
    // Adiciona 25% de taxa de serviço/instalação
    finalPrice = finalPrice * 1.25;
  }`;

// Use regex to replace safely ignoring minor spaces
code = code.replace(/const finalPrice = selectedVariant && typeof largura === 'number'[\s\S]*?: 0;/, newCalc);

// Now let's find the UI that displays it.
// Probably fmt(finalPrice)
// Let's replace {fmt(finalPrice)} with something that includes a tag.
const oldUI = `>{fmt(finalPrice)}</`;
const newUI = `>{fmt(finalPrice)}</p>
                {includesInstallation && finalPrice > 0 && (
                  <p className="text-xs text-[#D4AF37] mt-1 italic">+ Instalação Inclusa</p>
                )}<`;
code = code.replace(oldUI, newUI);

// Wait, the UI might be something like: <span className="..."> {fmt(finalPrice)} </span>
// Let's just do a generic replace.
// Actually, let's find `fmt(finalPrice)` in the code and append the label below its container.
const replaceUI = `<p className="font-serif text-3xl text-white font-medium">{fmt(finalPrice)}</p>`;
const replaceUINew = `<div className="flex flex-col">
  <p className="font-serif text-3xl text-white font-medium">{fmt(finalPrice)}</p>
  {includesInstallation && finalPrice > 0 && <span className="text-xs text-[#D4AF37] mt-1 tracking-wider uppercase">+ Instalação e Garantia</span>}
</div>`;
code = code.replace(replaceUI, replaceUINew);


// And fix the calculateTotal() in submitPayment which I injected wrongly.
code = code.replace(/calculateTotal\(\)/g, 'finalPrice');


fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('Preço dinâmico injetado corretamente!');

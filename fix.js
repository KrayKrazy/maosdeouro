const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

code = code.replace(/M\ufffdds de/g, 'Mãos de');
code = code.replace(/A EXCEL\ufffdNCIA DO SOB MEDIDA\. EXCLUSIVIDADE E SOFISTICA\ufffd\ufffdO EM CADA DETALHE DA SUA ESQUADRIA\./gi, 'A excelência do sob medida. Exclusividade e sofisticação em cada detalhe da sua esquadria.');
code = code.replace(/A EXCEL.NCIA DO SOB MEDIDA. EXCLUSIVIDADE E SOFISTICA..O EM CADA DETALHE DA SUA ESQUADRIA./gi, 'A excelência do sob medida. Exclusividade e sofisticação em cada detalhe da sua esquadria.');
code = code.replace(/M\?os de/g, 'Mãos de');
code = code.replace(/A EXCEL\?NCIA/g, 'A excelência');

const startHeader = code.indexOf('<div className="bg-black/90 backdrop-blur-xl border-b border-[#D4AF37]/20 sticky top-0 z-40">');
if(startHeader !== -1) {
  const endHeader = code.indexOf('{/* CATALOGO', startHeader);
  if(endHeader !== -1) {
    code = code.slice(0, startHeader) + code.slice(endHeader);
  }
}

code = code.split('bg-[#050505] min-h-screen').join('bg-transparent min-h-screen');
code = code.split('bg-white').join('bg-transparent'); // Catch any stray whites

fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('Fixed!');

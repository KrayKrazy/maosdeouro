const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

const headerCode = `
      <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-serif text-[#D4AF37] font-bold text-lg tracking-widest uppercase">Mãos de Ouro</div>
          <a href="/cliente" className="text-xs text-gray-300 hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 px-4 py-2 rounded-full transition-all uppercase tracking-wider">
            Painel do Cliente
          </a>
        </div>
      </header>
`;

code = code.replace('{/* HERO SECTION PREMIUM */}', headerCode + '\n      {/* HERO SECTION PREMIUM */}');
fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('Header with Client Panel link added!');

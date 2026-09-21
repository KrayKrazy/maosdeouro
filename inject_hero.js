const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

// Adicionar framer-motion nas importações
code = code.replace(`import Image from 'next/image';`, `import Image from 'next/image';\nimport { motion } from 'framer-motion';`);

// O hero luxuoso
const heroJSX = `
      {/* HERO SECTION PREMIUM */}
      <div className="relative w-full h-[60vh] bg-[#050505] flex items-center justify-center overflow-hidden border-b border-[#D4AF37]/10">
        <div className="absolute inset-0 bg-[url('/images/lux-bg.jpg')] bg-cover bg-center opacity-10 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative z-10 text-center flex flex-col items-center px-4"
        >
          <div className="w-16 h-[1px] bg-[#D4AF37] mb-6"></div>
          <h1 className="font-serif text-5xl md:text-7xl text-white font-light tracking-tight mb-4">
            Mãos de <span className="text-[#D4AF37] font-semibold italic">Ouro</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base tracking-[0.2em] uppercase max-w-xl leading-relaxed">
            A excelência do sob medida. Exclusividade e sofisticação em cada detalhe da sua esquadria.
          </p>
          <div className="w-16 h-[1px] bg-[#D4AF37] mt-8"></div>
        </motion.div>
      </div>
`;

// Inserir antes da tag <main>
code = code.replace('<main className="max-w-7xl mx-auto px-6 pt-12">', heroJSX + '\n      <main className="max-w-7xl mx-auto px-6 pt-12">');

fs.writeFileSync('C:/maosdeouro/app/page.tsx', code);
console.log('Hero section injetada com sucesso!');

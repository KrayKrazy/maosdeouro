const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

const bentoJSX = `
      {/* SEÇÃO BENTO GRID - DIFERENCIAIS (Extraído de 21st MCP) */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold">O Padrão Mãos de Ouro</span>
          <h2 className="font-serif text-3xl md:text-4xl text-white mt-3">Por que somos diferentes?</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
          <motion.div
            className="md:col-span-2 bg-[#0a0a0a] border border-white/10 rounded-xl p-8 flex flex-col hover:border-[#D4AF37]/50 transition-colors cursor-pointer overflow-hidden relative group"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 0.99 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex-1"></div>
            <div className="relative z-10">
              <h3 className="font-serif text-2xl text-white font-medium">Fabricação Própria</h3>
              <p className="text-gray-400 text-sm mt-2 max-w-md">Controle total de qualidade. Cortamos, montamos e instalamos sem terceirização, garantindo o padrão Classe A em cada milímetro.</p>
            </div>
          </motion.div>

          <motion.div
            className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8 flex flex-col hover:border-[#D4AF37]/50 transition-colors cursor-pointer overflow-hidden relative group"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 0.99 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex-1 flex justify-end flex-col">
              <h3 className="font-serif text-2xl text-[#D4AF37] font-medium">Linha Gold</h3>
              <p className="text-gray-400 text-sm mt-2">Estruturas robustas que suportam vidros de grande porte com deslizamento suave.</p>
            </div>
          </motion.div>

          <motion.div
            className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8 flex flex-col hover:border-[#D4AF37]/50 transition-colors cursor-pointer overflow-hidden relative group"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 0.99 }}
          >
             <div className="absolute inset-0 bg-[url('/images/lux-bg.jpg')] bg-cover opacity-5 group-hover:opacity-10 transition-opacity mix-blend-luminosity"></div>
            <div className="flex-1 flex justify-end flex-col relative z-10">
              <h3 className="font-serif text-2xl text-white font-medium">Design Minimalista</h3>
              <p className="text-gray-400 text-sm mt-2">Perfis ocultos e integração total com o seu projeto arquitetônico.</p>
            </div>
          </motion.div>

          <motion.div
            className="md:col-span-2 bg-[#0a0a0a] border border-white/10 rounded-xl p-8 flex flex-col hover:border-[#D4AF37]/50 transition-colors cursor-pointer overflow-hidden relative group"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 0.99 }}
          >
            <div className="absolute inset-0 bg-gradient-to-tl from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex-1"></div>
            <div className="relative z-10">
              <h3 className="font-serif text-2xl text-white font-medium">Garantia de Instalação</h3>
              <p className="text-gray-400 text-sm mt-2 max-w-md">Nossa equipe de engenharia garante que sua esquadria nunca sairá do prumo ou apresentará vazamentos.</p>
            </div>
          </motion.div>
        </div>
      </section>
`;

code = code.split('<main className="max-w-7xl mx-auto px-6 pt-12">').join(bentoJSX + '\n      <main className="max-w-7xl mx-auto px-6 pt-12" id="catalogo">');

fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('Bento Grid Injetado!');

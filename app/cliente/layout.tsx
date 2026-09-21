import React from "react";
export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-roboto">
      <header className="bg-[#0a0a0a] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#D4AF37] to-[#8C7323] rounded flex items-center justify-center font-serif font-bold text-black">M</div>
          <h1 className="font-serif text-xl tracking-wider text-white">Portal do Cliente</h1>
        </div>
        <nav className="flex gap-6 text-sm font-medium text-gray-400">
          <a href="/cliente" className="text-[#D4AF37]">Meus Pedidos</a>
          <a href="/" className="hover:text-white transition-colors flex items-center gap-1">Voltar para Loja ?</a>
        </nav>
      </header>
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
}

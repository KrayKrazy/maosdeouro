const fs = require('fs');

// 1. Fix header encoding
let pageCode = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');
pageCode = pageCode.replace(/M�os de Ouro/g, 'M&atilde;os de Ouro');
pageCode = pageCode.replace(/Mãos de/g, 'M&atilde;os de');
pageCode = pageCode.replace(/Coleção Completa/g, 'Cole&ccedil;&atilde;o Completa');
pageCode = pageCode.replace(/Fabricação própria/g, 'Fabrica&ccedil;&atilde;o pr&oacute;pria');
fs.writeFileSync('C:/maosdeouro/app/page.tsx', pageCode, 'utf8');

// 2. Rewrite cliente page to include a login form
const clienteCode = `
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ClienteDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Login State
  const [needsLogin, setNeedsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadData(session.user.id);
      } else {
        setNeedsLogin(true);
        setLoading(false);
      }
    });
  }, []);

  const loadData = (userId: string) => {
    supabase.from("profiles").select("*").eq("id", userId).single().then(({ data }) => {
      if (data) {
        setUserProfile(data);
        supabase.from("orders").select("*").eq("user_id", data.id).order("created_at", { ascending: false }).then(({ data: ordersData }) => {
          if (ordersData) setOrders(ordersData);
          setLoading(false);
          setNeedsLogin(false);
        });
      }
    });
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError("Email ou senha incorretos.");
      setAuthLoading(false);
    } else if (data?.user) {
      loadData(data.user.id);
    }
  };

  if (loading) return <div className="text-gray-400">Carregando painel...</div>;

  if (needsLogin) return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl">
      <h2 className="text-2xl font-serif text-white mb-2 text-center">Acesso ao Painel</h2>
      <p className="text-gray-400 text-sm text-center mb-6">Acesse com o email e senha criados durante a compra.</p>
      
      {authError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded mb-4 text-sm">{authError}</div>}
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#111] border border-white/10 p-3 rounded text-white outline-none focus:border-[#D4AF37]" placeholder="seu@email.com" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Senha</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#111] border border-white/10 p-3 rounded text-white outline-none focus:border-[#D4AF37]" placeholder="******" />
        </div>
        <button disabled={authLoading} type="submit" className="w-full mt-4 bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-black font-bold uppercase tracking-widest text-sm py-3 rounded hover:opacity-90 transition-opacity">
          {authLoading ? "Entrando..." : "Entrar no Painel"}
        </button>
      </form>
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <h2 className="text-2xl font-serif mb-2 text-white">Ol�, {userProfile?.full_name?.split(" ")[0]}!</h2>
      <p className="text-gray-400 text-sm mb-8">Acompanhe a produ��o e o status dos seus pedidos premium.</p>

      {orders.length === 0 ? (
        <div className="bg-[#111] border border-white/10 p-8 text-center rounded">
          <p className="text-gray-500">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-[#0a0a0a] border border-white/10 p-6 rounded-lg flex flex-col md:flex-row justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Pedido #{order.id.split("-")[0]}</p>
                <div className="space-y-2">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="text-white font-medium">
                      {item.product} <span className="text-gray-500 font-normal">({item.width}x{item.height}cm)</span>
                    </div>
                  ))}
                </div>
                <p className="text-[#D4AF37] font-bold mt-4">
                  R$ {Number(order.total_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex flex-col items-start md:items-end justify-between">
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 uppercase tracking-wider">
                  Status: {order.status || 'PENDENTE'}
                </span>
                <button className="mt-4 md:mt-0 text-sm text-[#D4AF37] border border-[#D4AF37]/30 px-4 py-2 rounded hover:bg-[#D4AF37]/10 transition-colors">
                  Baixar Contrato (PDF)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('C:/maosdeouro/app/cliente/page.tsx', clienteCode, 'utf8');
console.log('Fixed panel and encoding!');

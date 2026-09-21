"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ClienteDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          if (data) {
            setUserProfile(data);
            supabase.from("orders").select("*").eq("user_id", data.id).order("created_at", { ascending: false }).then(({ data: ordersData }) => {
              if (ordersData) setOrders(ordersData);
              setLoading(false);
            });
          }
        });
      } else {
        window.location.href = "/"; // Not logged in
      }
    });
  }, []);

  if (loading) return <div className="text-gray-400">Carregando painel...</div>;

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
                  Status: {order.status}
                </span>
                <button className="mt-4 md:mt-0 text-sm text-[#D4AF37] border border-[#D4AF37]/30 px-4 py-2 rounded hover:bg-[#D4AF37]/10 transition-colors">
                  Baixar Or�amento/Contrato (PDF)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

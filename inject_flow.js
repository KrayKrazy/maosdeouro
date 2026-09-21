const fs = require('fs');
let code = fs.readFileSync('C:/maosdeouro/app/page.tsx', 'utf8');

// 1. Add States
if (!code.includes('includesInstallation')) {
  code = code.replace('const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);', `const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);
  const [includesInstallation, setIncludesInstallation] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'LOGIN'|'REGISTER'>('REGISTER');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);`);
}

// 2. Add Auth Check
if (!code.includes('supabase.auth.getSession')) {
  code = code.replace('useEffect(() => {', `useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({data}) => {
          if(data) setUserProfile(data);
        });
      }
    });
  }, []);\n  useEffect(() => {`);
}

// 3. Modify CONFIG step (add Installation toggle)
const configStepFind = `<button onClick={proceedToLead} className="w-full bg-[#D4AF37] text-black uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-[#b5952f] transition-colors">
                        Continuar
                      </button>`;
const configStepReplace = `
                      <div className="mt-8 pt-6 border-t border-white/10">
                        <h4 className="font-serif text-white mb-4">Pacote de Serviço</h4>
                        
                        <label className={\`block p-4 rounded-lg border cursor-pointer transition-colors \${includesInstallation ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-white/10 hover:border-white/30'}\`}>
                          <div className="flex items-start gap-3">
                            <input type="radio" name="installation" checked={includesInstallation} onChange={() => setIncludesInstallation(true)} className="mt-1" />
                            <div>
                              <p className="font-bold text-white text-sm">Pacote Premium (Recomendado)</p>
                              <p className="text-xs text-gray-400 mt-1">Inclui Visita Técnica, Instalação Especializada e Garantia Vitalícia contra vazamentos e problemas estruturais.</p>
                            </div>
                          </div>
                        </label>

                        <label className={\`block p-4 rounded-lg border mt-3 cursor-pointer transition-colors \${!includesInstallation ? 'border-white/50 bg-white/5' : 'border-white/10 hover:border-white/30'}\`}>
                          <div className="flex items-start gap-3">
                            <input type="radio" name="installation" checked={!includesInstallation} onChange={() => setIncludesInstallation(false)} className="mt-1" />
                            <div>
                              <p className="font-bold text-white text-sm">Apenas Fornecimento</p>
                              <p className="text-xs text-gray-500 mt-1">Você retira na fábrica ou enviamos por transportadora. <span className="text-red-400/80">Atenção: Isento de garantia sobre montagem e alinhamento estrutural.</span></p>
                            </div>
                          </div>
                        </label>
                      </div>
                      <br/>
                      <button onClick={() => {
                        if (userProfile) setCheckoutStep('SHIPPING');
                        else setCheckoutStep('LEAD');
                      }} className="w-full bg-[#D4AF37] text-black uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-[#b5952f] transition-colors">
                        Continuar
                      </button>
`;
code = code.replace(configStepFind, configStepReplace);

// 4. Modify LEAD step to be an Auth Step
const leadStepFindRegex = /\{checkoutStep === 'LEAD' && \([\s\S]*?\{checkoutStep === 'SHIPPING' && \(/;
const authFormReplace = `{checkoutStep === 'LEAD' && (
                  <div className="animate-fadeIn">
                    <button onClick={() => setCheckoutStep('CONFIG')} className="text-xs text-gray-500 hover:text-white uppercase tracking-widest font-bold mb-4 flex items-center gap-1 transition-colors">? Voltar</button>
                    
                    <h3 className="font-serif text-xl text-white mb-2">Identificação</h3>
                    <p className="text-gray-400 text-sm mb-6">Para gerar seu contrato de {includesInstallation ? 'fornecimento e instalação' : 'fornecimento'}, precisamos de alguns dados.</p>
                    
                    <div className="space-y-4">
                      {authMode === 'REGISTER' && (
                        <div>
                          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Nome Completo / Razão Social</label>
                          <input type="text" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="Digite seu nome completo" />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">E-mail</label>
                        <input type="email" value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="seu@email.com" />
                      </div>

                      {authMode === 'REGISTER' && (
                        <div>
                          <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">CPF ou CNPJ</label>
                          <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="Somente números" />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Senha Segura</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]" placeholder="******" />
                      </div>

                      <button onClick={async () => {
                        setLoading(true);
                        if (authMode === 'REGISTER') {
                          const { data, error } = await supabase.auth.signUp({ email: customer.email, password });
                          if (data?.user) {
                            await supabase.from('profiles').update({ full_name: customer.name, cpf_cnpj: cpf }).eq('id', data.user.id);
                            setUserProfile({ id: data.user.id, full_name: customer.name, cpf_cnpj: cpf });
                            setCheckoutStep('SHIPPING');
                          }
                        } else {
                          const { data, error } = await supabase.auth.signInWithPassword({ email: customer.email, password });
                          if (data?.user) {
                            const {data: prof} = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                            setUserProfile(prof);
                            setCheckoutStep('SHIPPING');
                          }
                        }
                        setLoading(false);
                      }} disabled={loading} className="w-full bg-white text-black uppercase tracking-widest font-bold text-sm py-4 rounded hover:bg-gray-200 transition-colors mt-2">
                        {loading ? 'Aguarde...' : (authMode === 'REGISTER' ? 'Criar Conta e Prosseguir' : 'Entrar e Prosseguir')}
                      </button>

                      <div className="text-center mt-4">
                        <button onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-xs text-[#D4AF37] hover:underline">
                          {authMode === 'LOGIN' ? 'Não tem conta? Criar agora' : 'Já tem conta? Fazer Login'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {checkoutStep === 'SHIPPING' && (`;

code = code.replace(leadStepFindRegex, authFormReplace);


// 5. Submit Payment (Save to Orders)
const submitFind = `const submitPayment = async () => {`;
const submitReplace = `const submitPayment = async () => {
    // 1. Salvar no Supabase Orders
    if (userProfile) {
      await supabase.from('orders').insert({
        user_id: userProfile.id,
        items: [{ product: activeProduct.name, variant: selectedVariant, width: largura, height: altura, price: calculateTotal() }],
        total_price: calculateTotal(),
        includes_installation: includesInstallation
      });
    }`;

code = code.replace(submitFind, submitReplace);

// 6. Fix SAC button at bottom
if (!code.includes('fixed bottom-6 right-6')) {
  code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\)\;\s*\}\s*$/m, `
      <a href="https://wa.me/5562999999999" target="_blank" className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform z-50 flex items-center justify-center">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
      </a>
    </div>
  </div>
</div>
  );
}
`);
}

fs.writeFileSync('C:/maosdeouro/app/page.tsx', code, 'utf8');
console.log('Injected Auth, Config Options, and SAC Button!');

# System Patterns — Mãos de Ouro

## Padrões de Arquitetura (Next.js)
- Diretório `app/`:
  - `app/page.tsx`: Vitrine (Client Component devido ao catálogo dinâmico).
  - `app/layout.tsx`: Root layout, contém o Header global.
  - `app/cliente/page.tsx`: Painel do cliente e formulário de login.
- Evite injeção de scripts diretos que duplicam componentes (ex: Header).

## Padrões de Estado
- O estado do catálogo é carregado assincronamente via Supabase.
- Hooks como `useMemo` precisam ter todas as dependências (`[catalog, selectedCategory]`) para evitar UI congelada.

## Padrões Supabase e RLS
- `products` e `variants`: Leitura pública (`Allow public read`).
- `orders` e `profiles`: Protegidos via Auth.
- `NEXT_PUBLIC_SUPABASE_URL` e `ANON_KEY` devem ser declarados plain-text no Vercel, nunca encriptados.

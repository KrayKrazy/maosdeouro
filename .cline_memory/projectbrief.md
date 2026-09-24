# 💎 Atualização Estratégica: Mão de Ouro Esquadrias de Alumínio

**Data:** 23/09/2026
**Nicho:** Esquadrias de Alumínio de Alto Padrão (Público Classe A, Arquitetos, Construtoras de Luxo).

## 🛠️ Objetivos de Refatoração (Next.js)

1. **Rebranding Completo:**
   - De: "Mãos de Ouro" -> Para: "Mão de Ouro Esquadrias de Alumínio".
   - Copywriting e Design adaptados para Público Classe A (Palavras-chave: Sofisticação, Alto Padrão, Projetos Sob Medida, Arquitetura).
   
2. **Painel Administrativo Completo (/admin):**
   - Atualizar a interface do `app/admin/page.tsx`.
   - Implementar CRUD completo usando a API do Supabase no Frontend:
     - Adicionar novo produto (Campos: Nome, Descrição, Preço Base, Preço M2, Imagem, Requires Install).
     - Editar produto existente.
     - Remover produto (soft-delete ou hard-delete).
     
3. **Cálculo de Instalação (Checkout):**
   - Na listagem e no Carrinho (`app/page.tsx`), diferenciar produtos que possuem o boolean `requires_install: true`.
   - Se possuir, calcular um adicional de instalação (Ex: +25% sobre o valor da peça, ou taxa fixa de Instalação Técnica) somado ao Subtotal.
   
4. **Comunicação de SAC:**
   - Adicionar o botão/link de SAC (WhatsApp) flutuante ou no Header/Footer do e-commerce.

5. **Ordem de Serviço via Email (Backend):**
   - Modificar o fluxo de Sucesso de Checkout (`api/checkout/route.ts` ou criar um novo endpoint `/api/webhooks/cakto/route.ts`).
   - Usar `nodemailer` com SMTP Gmail (`kelevracontato@gmail.com` / app pwd: `dhkl yvij fsrk nwyn`) para disparar uma "Ordem de Serviço de Esquadrias" para a fábrica e para o cliente após aprovação do pagamento.

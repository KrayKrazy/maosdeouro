# Active Context — Mãos de Ouro

## Tarefa Atual
Sistema recém-restaurado e funcional em produção (maosdeouro-delta.vercel.app). 
Aguardando início do desenvolvimento de features pendentes: PDF e Alertas.

## Decisões e Correções Recentes
- Removida duplicação do Header (centralizado no layout.tsx).
- Corrigido UTF-8 (caracteres quebrados).
- RLS configurado para ler produtos anonimamente.
- Variáveis Vercel corrigidas (removida criptografia nativa que quebrava o build).
- Portal Next Elite antigo deletado.

## Próximos Passos
1. Implementar Geração de PDF (Orçamento/Contrato) via `jspdf` e `html2canvas` na rota `/cliente`.
2. Integrar rota `/api/alerts` com webhook real do n8n para notificar novas vendas.

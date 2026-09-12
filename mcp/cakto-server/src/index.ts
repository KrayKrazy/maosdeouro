// MCP Server Cakto — ponte entre o agente OpenCode e a API REST real.
// Docs: docs.cakto.com.br | Auth OAuth2 client_id/secret -> POST /public_api/token/
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = process.env.CAKTO_BASE_URL ?? "https://api.cakto.com.br";
let cachedToken = "";
let tokenExp = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExp) return cachedToken;
  const res = await fetch(`${BASE}/public_api/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.CAKTO_CLIENT_ID,
      client_secret: process.env.CAKTO_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Cakto auth falhou: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExp = Date.now() + (data.expires_in ?? 3600) * 1000 - 60000;
  return cachedToken;
}

async function cakto(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`Cakto ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

const server = new McpServer({ name: "cakto", version: "0.1.0" });

server.tool(
  "create_product_checkout",
  "Cria produto na Cakto (isso já cria checkout + link pay.cakto.com.br)",
  { name: z.string(), description: z.string(), price: z.number(), salesPage: z.string().url() },
  async ({ name, description, price, salesPage }) => {
    const data = await cakto("/public_api/products/", {
      method: "POST",
      body: JSON.stringify({ name, description, price, type: "unique", salesPage }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

server.tool(
  "create_pix_charge",
  "Cria cobrança PIX transparente. Exige X-Idempotency-Key UUID.",
  {
    offerId: z.string(),
    idempotencyKey: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    fingerprint: z.string(),
    docNumber: z.string(),
    docType: z.enum(["cpf", "cnpj"]).default("cpf"),
  },
  async (input) => {
    const data = await cakto("/public_api/payments/", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: JSON.stringify({
        paymentMethod: "pix",
        customer: {
          name: input.name, email: input.email, phone: input.phone,
          fingerprint: input.fingerprint, docType: input.docType, docNumber: input.docNumber,
        },
        items: [{ offerId: input.offerId, quantity: 1 }],
        pixExpiresIn: 3600,
      }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

server.tool(
  "create_card_charge",
  "Cria cobrança cartão. Front deve tokenizar antes via /public_api/card-tokens/.",
  {
    offerId: z.string(),
    cardToken: z.string(),
    idempotencyKey: z.string().uuid(),
    name: z.string(), email: z.string().email(), phone: z.string(),
    fingerprint: z.string(), docNumber: z.string(),
  },
  async (input) => {
    const data = await cakto("/public_api/payments/", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: JSON.stringify({
        paymentMethod: "credit_card",
        card: { token: input.cardToken },
        customer: {
          name: input.name, email: input.email, phone: input.phone,
          fingerprint: input.fingerprint, docNumber: input.docNumber,
        },
        items: [{ offerId: input.offerId, quantity: 1 }],
      }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

server.tool(
  "get_order_status",
  "Consulta status do pedido para conciliação com webhooks.",
  { orderId: z.string() },
  async ({ orderId }) => {
    const data = await cakto(`/public_api/orders/${orderId}/`, { method: "GET" });
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

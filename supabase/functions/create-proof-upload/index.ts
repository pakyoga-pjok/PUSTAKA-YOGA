import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://pakyoga-pjok.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server configuration is incomplete");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
const normalizePhone = (value: unknown) => String(value ?? "").replace(/[^0-9]/g, "");

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && origin !== "https://pakyoga-pjok.github.io") {
    return json(403, { error: "Origin tidak diizinkan." });
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return json(415, { error: "Content-Type harus application/json" });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "Format JSON tidak valid" }); }

  const orderNumber = String(body.order_number ?? "").trim();
  const whatsapp = normalizePhone(body.whatsapp);
  const mime = String(body.content_type ?? "").toLowerCase();
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  if (!/^PY-[0-9]{8}-[0-9]{6}$/.test(orderNumber) || whatsapp.length < 9 || whatsapp.length > 15) {
    return json(400, { error: "Nomor pesanan atau WhatsApp tidak valid." });
  }
  if (!extensions[mime]) return json(400, { error: "Format bukti harus JPG, PNG, WEBP, atau PDF." });

  try {
    const supabase = adminClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, recipient_whatsapp, status")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (orderError || !order || order.recipient_whatsapp !== whatsapp || order.status !== "pending_payment") {
      return json(404, { error: "Pesanan tidak ditemukan atau tidak dapat menerima bukti pembayaran." });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, status")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError || !payment || !["pending", "rejected"].includes(payment.status)) {
      return json(409, { error: "Pesanan sudah memiliki bukti pembayaran atau tidak dapat diunggah." });
    }

    const path = `proofs/${orderNumber}/${crypto.randomUUID()}.${extensions[mime]}`;
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data?.token) {
      console.error("signed upload URL error:", error?.message);
      return json(500, { error: "Tautan unggah belum dapat dibuat. Silakan coba kembali." });
    }

    return json(200, {
      ok: true,
      bucket: "payment-proofs",
      path,
      token: data.token,
      expires_in_seconds: 7200,
    });
  } catch (error) {
    console.error("create-proof-upload error:", error instanceof Error ? error.message : "unknown");
    return json(500, { error: "Terjadi kesalahan pada server." });
  }
});

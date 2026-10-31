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
  const path = String(body.path ?? "").trim();
  if (!/^PY-[0-9]{8}-[0-9]{6}$/.test(orderNumber) || whatsapp.length < 9 || whatsapp.length > 15) {
    return json(400, { error: "Nomor pesanan atau WhatsApp tidak valid." });
  }
  const pattern = new RegExp(`^proofs/${orderNumber}/[0-9a-f-]{36}\\.(jpg|png|webp|pdf)$`, "i");
  if (!pattern.test(path)) return json(400, { error: "Lokasi file bukti pembayaran tidak valid." });

  try {
    const supabase = adminClient();
    const folder = `proofs/${orderNumber}`;
    const fileName = path.slice(folder.length + 1);
    const { data: files, error: listError } = await supabase.storage
      .from("payment-proofs")
      .list(folder, { search: fileName, limit: 10 });

    if (listError || !files?.some((file) => file.name === fileName)) {
      return json(400, { error: "File bukti belum ditemukan. Pastikan proses unggah selesai." });
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("payment-proofs")
      .download(path);
    if (downloadError || !fileBlob) return json(400, { error: "File bukti tidak dapat dibaca." });

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (fileBlob.size < 1 || fileBlob.size > 5 * 1024 * 1024 ||
        (fileBlob.type && !allowedTypes.includes(fileBlob.type))) {
      await supabase.storage.from("payment-proofs").remove([path]);
      return json(400, { error: "Ukuran atau jenis file bukti tidak sesuai." });
    }

    const { data, error } = await supabase.rpc("submit_guest_payment_proof", {
      p_order_number: orderNumber,
      p_whatsapp: whatsapp,
      p_path: path,
    });
    if (error) {
      console.error("submit proof RPC error:", error.code);
      return json(500, { error: "Bukti pembayaran belum dapat dikirim." });
    }
    if (data?.error === "order_unavailable") {
      return json(404, { error: "Pesanan tidak ditemukan atau tidak dapat menerima bukti pembayaran." });
    }
    if (data?.error === "payment_unavailable") {
      return json(409, { error: "Bukti pembayaran untuk pesanan ini sudah dikirim." });
    }
    if (data?.error === "invalid_path") return json(400, { error: "Lokasi file tidak valid." });

    return json(200, { ok: true, order_number: orderNumber, payment_status: "submitted" });
  } catch (error) {
    console.error("submit-payment-proof error:", error instanceof Error ? error.message : "unknown");
    return json(500, { error: "Terjadi kesalahan pada server." });
  }
});

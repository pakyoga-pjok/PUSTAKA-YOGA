import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value || "unknown"));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server configuration is incomplete");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return json(415, { error: "Content-Type harus application/json" });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return json(400, { error: "Permintaan tidak dapat dibaca." });
  }
  if (rawBody.length > 16_384) return json(413, { error: "Data checkout terlalu besar." });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "Format JSON tidak valid." });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json(400, { error: "Data checkout tidak valid." });
  }

  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown")
    .split(",")[0].trim().slice(0, 128);
  const ipHash = await sha256(ip);

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.rpc("checkout_create_guest_order", {
      p_payload: payload,
      p_ip_hash: ipHash,
    });

    if (error) {
      const message = error.message || "";
      const validationHints = ["Buku", "Nama", "Nomor", "Alamat", "Kode pos", "Jumlah", "Periode",
        "Kota", "Catatan", "Pesanan", "email", "Email", "Identitas"];
      if (validationHints.some((hint) => message.includes(hint))) {
        return json(400, { error: message });
      }
      console.error("checkout database error:", error.code);
      return json(500, { error: "Pesanan belum dapat diproses. Silakan coba kembali." });
    }
    if (data?.error === "rate_limited") {
      return json(429, { error: "Terlalu banyak percobaan. Silakan coba kembali setelah 15 menit." });
    }

    return json(201, {
      ok: true,
      order_id: data.order_id,
      order_number: data.order_number,
      total_amount: data.total_amount,
      payment_id: data.payment_id,
    });
  } catch (error) {
    console.error("checkout unexpected error:", error instanceof Error ? error.message : "unknown");
    return json(500, { error: "Terjadi kesalahan pada server." });
  }
});

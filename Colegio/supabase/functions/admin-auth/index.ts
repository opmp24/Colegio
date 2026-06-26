import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { db: { schema: "Colegio" } },
);

function generatePin(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

async function sendPinEmail(email: string, pin: string, fullName: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY no configurada, email no enviado");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Agenda Escolar <onboarding@resend.dev>",
      to: email,
      subject: "Tu código de acceso - Agenda Escolar",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#6366f1">Agenda Escolar</h2>
          <p>Hola <strong>${fullName}</strong>,</p>
          <p>Tu código de acceso es:</p>
          <div style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#6366f1;text-align:center;padding:24px;background:#eef2ff;border-radius:12px;margin:16px 0">
            ${pin}
          </div>
          <p>Ingresa en <a href="${SITE_URL}" style="color:#6366f1">${SITE_URL}</a> con este código.</p>
          <p style="color:#94a3b8;font-size:12px">Este código es personal e intransferible. No lo compartas.</p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Error enviando email:", body);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case "create-user": {
        const { full_name, email, role } = params as {
          full_name: string;
          email: string;
          role: "admin" | "profesor" | "usuario";
        };
        const pin = generatePin();

        const { data: authUser, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password: pin,
            email_confirm: true,
            user_metadata: { full_name, role },
          });

        if (createError) throw createError;

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ pin, email, full_name, role })
          .eq("id", authUser.user.id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ ok: true, pin, user_id: authUser.user.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "reset-pin": {
        const { user_id } = params as { user_id: string };
        const pin = generatePin();

        const { error: userError } =
          await supabaseAdmin.auth.admin.getUserById(user_id);
        if (userError) throw userError;

        await supabaseAdmin.auth.admin.updateUserById(user_id, {
          password: pin,
        });

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ pin })
          .eq("id", user_id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ ok: true, pin }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "toggle-block": {
        const { user_id } = params as { user_id: string };

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("is_blocked")
          .eq("id", user_id)
          .single();

        const newBlocked = !profile?.is_blocked;

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ is_blocked: newBlocked })
          .eq("id", user_id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ ok: true, is_blocked: newBlocked }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "send-info": {
        const { user_id } = params as { user_id: string };

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name, pin")
          .eq("id", user_id)
          .single();

        if (!profile) throw new Error("Perfil no encontrado");

        await sendPinEmail(profile.email!, profile.pin!, profile.full_name);

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Acción desconocida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

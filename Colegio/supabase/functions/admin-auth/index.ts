import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseColegio = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: "Colegio" },
});
const supabaseRTK = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: "rtk" },
});
const supabaseAuth = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function generatePin(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
}

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

async function sendPinEmail(email: string, pin: string, fullName: string) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY no configurada, email no enviado");
    return;
  }
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#6366f1">Agenda Escolar</h2>
      <p>Hola <strong>${fullName}</strong>,</p>
      <p>Tu c\u00f3digo de acceso es:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#6366f1;text-align:center;padding:24px;background:#eef2ff;border-radius:12px;margin:16px 0">
        ${pin}
      </div>
      <p>Ingresa en <a href="${SITE_URL}" style="color:#6366f1">${SITE_URL}</a> con este c\u00f3digo.</p>
      <p style="color:#94a3b8;font-size:12px">Este c\u00f3digo es personal e intransferible. No lo compartas.</p>
    </div>
  `;
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: "docuarchviosite@gmail.com", name: "Agenda Escolar" },
      subject: "Tu c\u00f3digo de acceso - Agenda Escolar",
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error al enviar email a ${email}: ${body}`);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case "create-user": {
        const { full_name, email, role, course_ids } = params as {
          full_name: string;
          email: string;
          role: "admin" | "profesor" | "usuario";
          course_ids?: string[];
        };
        const pin = generatePin();

        const saveCourses = async (userId: string) => {
          if (!course_ids?.length) return;
          const rows = course_ids.map((cid) => ({ user_id: userId, course_id: cid }));
          const { error } = await supabaseColegio.from("course_members").insert(rows);
          if (error) throw new Error(`Error al asignar cursos: ${JSON.stringify(error)}`);
        };

        const { data: users } = await supabaseAuth.auth.admin.listUsers();
        const existing = users?.users.find((u) => u.email === email);

        if (existing) {
          const { data: profile } = await supabaseColegio
            .from("profiles")
            .select("id")
            .eq("id", existing.id)
            .maybeSingle();

          if (profile) {
            throw new Error("A user with this email address has already been registered");
          }

          const { error: upsertError } = await supabaseColegio
            .from("profiles")
            .upsert({ id: existing.id, pin, email, full_name, role });

          if (upsertError) throw upsertError;

          await supabaseAuth.auth.admin.updateUserById(existing.id, {
            password: pin,
            user_metadata: { full_name, role },
          });

          await saveCourses(existing.id);
          await sendPinEmail(email, pin, full_name);

          return new Response(
            JSON.stringify({ ok: true, pin, user_id: existing.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: authUser, error: createError } =
          await supabaseAuth.auth.admin.createUser({
            email,
            password: pin,
            email_confirm: true,
            user_metadata: { full_name, role },
          });

        if (createError) throw createError;

        const { error: upsertError } = await supabaseColegio
          .from("profiles")
          .upsert({ id: authUser.user.id, pin, email, full_name, role });

        if (upsertError) throw upsertError;

        await saveCourses(authUser.user.id);
        await sendPinEmail(email, pin, full_name);

        return new Response(
          JSON.stringify({ ok: true, pin, user_id: authUser.user.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "reset-pin": {
        const { user_id } = params as { user_id: string };
        const pin = generatePin();

        const { error: userError } =
          await supabaseAuth.auth.admin.getUserById(user_id);
        if (userError) throw userError;

        await supabaseAuth.auth.admin.updateUserById(user_id, {
          password: pin,
        });

        const { data: profile } = await supabaseColegio
          .from("profiles")
          .select("email, full_name")
          .eq("id", user_id)
          .single();

        if (!profile) throw new Error("Perfil no encontrado");

        const { error: updateError } = await supabaseColegio
          .from("profiles")
          .update({ pin })
          .eq("id", user_id);

        if (updateError) throw updateError;

        await sendPinEmail(profile.email!, pin, profile.full_name);

        return new Response(
          JSON.stringify({ ok: true, pin }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "toggle-block": {
        const { user_id } = params as { user_id: string };

        const { data: profile } = await supabaseColegio
          .from("profiles")
          .select("is_blocked")
          .eq("id", user_id)
          .single();

        const newBlocked = !profile?.is_blocked;

        const { error: updateError } = await supabaseColegio
          .from("profiles")
          .update({ is_blocked: newBlocked })
          .eq("id", user_id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ ok: true, is_blocked: newBlocked }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "delete-user": {
        const { user_id } = params as { user_id: string };

        const { error: delVotesError } = await supabaseRTK
          .from("report_votes")
          .delete()
          .eq("user_id", user_id);
        if (delVotesError) throw new Error(`Error al borrar report_votes: ${JSON.stringify(delVotesError)}`);

        const { error: delReportsError } = await supabaseRTK
          .from("reports")
          .delete()
          .eq("user_id", user_id);
        if (delReportsError) throw new Error(`Error al borrar reports: ${JSON.stringify(delReportsError)}`);

        const { data: hasOtherData } = await supabaseAuth.rpc("check_user_other_data", {
          uid: user_id,
        });

        if (hasOtherData) {
          const { error: deleteProfileError } = await supabaseColegio
            .from("profiles")
            .delete()
            .eq("id", user_id);
          if (deleteProfileError) throw new Error(`Error al borrar profile: ${JSON.stringify(deleteProfileError)}`);

          return new Response(
            JSON.stringify({ ok: true, auth_deleted: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { error: deleteAuthError } =
          await supabaseAuth.auth.admin.deleteUser(user_id);

        const { error: deleteProfileError } = await supabaseColegio
          .from("profiles")
          .delete()
          .eq("id", user_id);
        if (deleteProfileError) throw new Error(`Error al borrar profile: ${JSON.stringify(deleteProfileError)}`);

        return new Response(
          JSON.stringify({ ok: true, auth_deleted: !deleteAuthError }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "update-permissions": {
        const { user_id, permissions } = params as {
          user_id: string;
          permissions: string[];
        };

        const { error: updateError } = await supabaseColegio
          .from("profiles")
          .update({ permissions })
          .eq("id", user_id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "update-courses": {
        const { user_id, course_ids } = params as {
          user_id: string;
          course_ids: string[];
        };

        const { error: delError } = await supabaseColegio
          .from("course_members")
          .delete()
          .eq("user_id", user_id);

        if (delError) throw new Error(`Error al eliminar cursos anteriores: ${JSON.stringify(delError)}`);

        if (course_ids.length > 0) {
          const rows = course_ids.map((cid) => ({ user_id, course_id: cid }));
          const { error: insError } = await supabaseColegio
            .from("course_members")
            .insert(rows);
          if (insError) throw new Error(`Error al asignar cursos: ${JSON.stringify(insError)}`);
        }

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "send-info": {
        const { user_id } = params as { user_id: string };

        const { data: profile } = await supabaseColegio
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
    const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    console.error("Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

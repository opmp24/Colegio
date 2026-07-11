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

function generateSecurePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const data = new Uint8Array([...salt, ...encoder.encode(pin)]);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `sha256:${saltHex}:${hashHex}`;
}

async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!hash.startsWith('sha256:')) return false;

  try {
    const parts = hash.split(':');
    if (parts.length !== 3) return false;

    const algorithm = parts[0];
    const saltHex = parts[1];
    const expectedHashHex = parts[2];

    if (algorithm !== 'sha256') return false;

    const saltBytes = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const encoder = new TextEncoder();
    const data = new Uint8Array([...saltBytes, ...encoder.encode(pin)]);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex === expectedHashHex;
  } catch {
    return false;
  }
}

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

async function sendSetupLinkEmail(email: string, fullName: string, token: string, siteUrl?: string) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY no configurada, email no enviado");
    return;
  }
  const baseUrl = siteUrl || SITE_URL;
  const setupUrl = `${baseUrl}/setup?token=${token}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#6366f1">Agenda Escolar — Configura tu código</h2>
      <p>Hola <strong>${fullName}</strong>,</p>
      <p>Has sido registrado en Agenda Escolar. Para acceder, primero debes crear tu código de acceso personal de 4 dígitos.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${setupUrl}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:16px">
          Configurar código de acceso
        </a>
      </p>
      <p>O copia este enlace en tu navegador:</p>
      <p style="font-size:12px;color:#94a3b8;word-break:break-all">${setupUrl}</p>
      <p style="color:#94a3b8;font-size:12px">Este enlace expira en 24 horas. Si no solicitaste esto, ignora este mensaje.</p>
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
      subject: "Configura tu código de acceso - Agenda Escolar",
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error al enviar email a ${email}: ${body}`);
  }
}

async function generateSetupToken(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseColegio.from("setup_tokens").insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`Error al generar token: ${JSON.stringify(error)}`);
  return token;
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
        const { full_name, email, role, course_ids, site_url } = params as {
          full_name: string;
          email: string;
          role: "admin" | "profesor" | "usuario";
          course_ids?: string[];
          site_url?: string;
        };

        const tempPassword = generateSecurePassword();

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
            .upsert({
              id: existing.id,
              pin_hash: null,
              pin: null,
              setup_complete: false,
              email,
              full_name,
              role,
            });

          if (upsertError) throw upsertError;

          await supabaseAuth.auth.admin.updateUserById(existing.id, {
            password: tempPassword,
            user_metadata: { full_name, role },
          });

          await saveCourses(existing.id);

          const token = await generateSetupToken(existing.id);
          await sendSetupLinkEmail(email, full_name, token, site_url);

          return new Response(
            JSON.stringify({ ok: true, user_id: existing.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: authUser, error: createError } =
          await supabaseAuth.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name, role },
          });

        if (createError) throw createError;

        const { error: upsertError } = await supabaseColegio
          .from("profiles")
          .upsert({
            id: authUser.user.id,
            pin_hash: null,
            pin: null,
            setup_complete: false,
            email,
            full_name,
            role,
          });

        if (upsertError) throw upsertError;

        await saveCourses(authUser.user.id);

        const token = await generateSetupToken(authUser.user.id);
        await sendSetupLinkEmail(email, full_name, token, site_url);

        return new Response(
          JSON.stringify({ ok: true, user_id: authUser.user.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "reset-pin": {
        const { user_id, site_url } = params as { user_id: string; site_url?: string };

        const { data: profile, error: profileError } = await supabaseColegio
          .from("profiles")
          .select("email, full_name")
          .eq("id", user_id)
          .single();

        if (profileError) throw new Error("Perfil no encontrado");

        await supabaseColegio
          .from("profiles")
          .update({ pin_hash: null, setup_complete: false })
          .eq("id", user_id);

        const tempPassword = generateSecurePassword();
        await supabaseAuth.auth.admin.updateUserById(user_id, {
          password: tempPassword,
        });

        const token = await generateSetupToken(user_id);
        await sendSetupLinkEmail(profile.email!, profile.full_name, token, site_url);

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "recover-pin": {
        const { email, site_url } = params as { email: string; site_url?: string };

        if (!email) {
          return new Response(
            JSON.stringify({ error: "Email requerido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: profile, error: profileError } = await supabaseColegio
          .from("profiles")
          .select("id, email, full_name, setup_complete")
          .eq("email", email)
          .single();

        if (profileError || !profile) {
          await simulateDelay();
          return new Response(
            JSON.stringify({ ok: true, message: "Si el correo está registrado, se ha enviado un nuevo código" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Invalidar PIN actual y enviar setup link
        await supabaseColegio
          .from("profiles")
          .update({ pin_hash: null, setup_complete: false })
          .eq("id", profile.id);

        const tempPassword = generateSecurePassword();
        await supabaseAuth.auth.admin.updateUserById(profile.id, {
          password: tempPassword,
        });

        const token = await generateSetupToken(profile.id);
        await sendSetupLinkEmail(profile.email, profile.full_name, token, site_url);

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          .select("email, full_name")
          .eq("id", user_id)
          .single();

        if (!profile) throw new Error("Perfil no encontrado");

        if (SENDGRID_API_KEY) {
          const html = `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#6366f1">Agenda Escolar</h2>
              <p>Hola <strong>${profile.full_name}</strong>,</p>
              <p>Se ha solicitado información de su cuenta de Agenda Escolar.</p>
              <p>Por razones de seguridad, no podemos enviar su código de acceso actual por email.</p>
              <p>Si necesita acceder a su cuenta y no recuerda su código, utilice la función de "Recuperar Código" en la página de ingreso.</p>
              <p>Si continúa teniendo problemas, contacte al administrador de su institución.</p>
              <p style="color:#94a3b8;font-size:12px">Este mensaje es informativo y no requiere respuesta.</p>
            </div>
          `;
          const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: profile.email }] }],
              from: { email: "docuarchviosite@gmail.com", name: "Agenda Escolar" },
              subject: "Información de su cuenta - Agenda Escolar",
              content: [{ type: "text/html", value: html }],
            }),
          });
          if (!res.ok) {
            const body = await res.text();
            throw new Error(`Error al enviar email a ${profile.email}: ${body}`);
          }
        }

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "request-access": {
        const { full_name, email } = params as { full_name: string; email: string };

        if (!full_name || !email) {
          return new Response(
            JSON.stringify({ error: "Nombre y email son requeridos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return new Response(
            JSON.stringify({ error: "Email inválido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: existing } = await supabaseColegio
          .from("access_requests")
          .select("id, status")
          .eq("email", email)
          .maybeSingle();

        if (existing?.status === "pending") {
          return new Response(
            JSON.stringify({ error: "Ya tienes una solicitud pendiente para este correo" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (existing?.status === "approved") {
          return new Response(
            JSON.stringify({ error: "Este correo ya tiene acceso. Solicita un nuevo PIN en '¿Olvidó su PIN?'" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { error: insertError } = await supabaseColegio
          .from("access_requests")
          .upsert({ full_name, email, status: "pending" }, { onConflict: "email" });

        if (insertError) {
          throw new Error(`Error al guardar solicitud: ${JSON.stringify(insertError)}`);
        }

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // === NEW ACTIONS ===

      case "send-setup-link": {
        const { user_id, site_url } = params as { user_id: string; site_url?: string };

        const { data: profile, error: profileError } = await supabaseColegio
          .from("profiles")
          .select("email, full_name")
          .eq("id", user_id)
          .single();

        if (profileError || !profile) throw new Error("Perfil no encontrado");

        const token = await generateSetupToken(user_id);
        await sendSetupLinkEmail(profile.email, profile.full_name, token, site_url);

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "verify-setup-token": {
        const { token } = params as { token: string };

        const { data: record, error } = await supabaseColegio
          .from("setup_tokens")
          .select("id, user_id, expires_at, used_at")
          .eq("token", token)
          .maybeSingle();

        if (error || !record) {
          return new Response(
            JSON.stringify({ error: "Token inválido o no encontrado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (record.used_at) {
          return new Response(
            JSON.stringify({ error: "Este enlace ya fue utilizado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (new Date(record.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: "Este enlace ha expirado. Solicita uno nuevo." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: profile } = await supabaseColegio
          .from("profiles")
          .select("id, email, full_name")
          .eq("id", record.user_id)
          .single();

        if (!profile) {
          return new Response(
            JSON.stringify({ error: "Usuario no encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            user_id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "complete-setup": {
        const { token, pin } = params as { token: string; pin: string };

        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          return new Response(
            JSON.stringify({ error: "El PIN debe tener 4 dígitos numéricos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: record, error } = await supabaseColegio
          .from("setup_tokens")
          .select("id, user_id, expires_at, used_at")
          .eq("token", token)
          .maybeSingle();

        if (error || !record) {
          return new Response(
            JSON.stringify({ error: "Token inválido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (record.used_at) {
          return new Response(
            JSON.stringify({ error: "Este enlace ya fue utilizado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (new Date(record.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: "Este enlace ha expirado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const pinHash = await hashPin(pin);

        const { error: updateError } = await supabaseColegio
          .from("profiles")
          .update({ pin_hash: pinHash, setup_complete: true, pin: null })
          .eq("id", record.user_id);

        if (updateError) throw updateError;

        await supabaseAuth.auth.admin.updateUserById(record.user_id, {
          password: pin,
        });

        const { error: markError } = await supabaseColegio
          .from("setup_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("id", record.id);

        if (markError) throw markError;

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "change-pin": {
        const { current_pin, new_pin } = params as {
          current_pin: string;
          new_pin: string;
        };

        if (!new_pin || new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) {
          return new Response(
            JSON.stringify({ error: "El nuevo PIN debe tener 4 dígitos numéricos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "No autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseAuth.auth.getUser(token);
        if (!user) {
          return new Response(
            JSON.stringify({ error: "No autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: profile } = await supabaseColegio
          .from("profiles")
          .select("pin_hash")
          .eq("id", user.id)
          .single();

        if (!profile?.pin_hash) {
          return new Response(
            JSON.stringify({ error: "No se puede cambiar el PIN en este momento" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const valid = await verifyPin(current_pin, profile.pin_hash);
        if (!valid) {
          return new Response(
            JSON.stringify({ error: "El PIN actual no es correcto" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const newPinHash = await hashPin(new_pin);

        const { error: updateError } = await supabaseColegio
          .from("profiles")
          .update({ pin_hash: newPinHash, pin: null })
          .eq("id", user.id);

        if (updateError) throw updateError;

        await supabaseAuth.auth.admin.updateUserById(user.id, {
          password: new_pin,
        });

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "migrate-all": {
        const { site_url } = params as { site_url?: string };
        const { data: profiles, error: profilesError } = await supabaseColegio
          .from("profiles")
          .select("id, email, full_name, role")
          .in("role", ["usuario", "profesor"]);

        if (profilesError) throw profilesError;

        let count = 0;
        for (const p of profiles ?? []) {
          try {
            await supabaseColegio
              .from("profiles")
              .update({ pin_hash: null, setup_complete: false, pin: null })
              .eq("id", p.id);

            const tempPassword = generateSecurePassword();
            await supabaseAuth.auth.admin.updateUserById(p.id, {
              password: tempPassword,
            });

            const token = await generateSetupToken(p.id);
            await sendSetupLinkEmail(p.email, p.full_name, token, site_url);
            count++;
          } catch (e) {
            console.error(`Error migrando usuario ${p.id}:`, e);
          }
        }

        return new Response(
          JSON.stringify({ ok: true, count }),
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

async function simulateDelay() {
  return new Promise(resolve => setTimeout(resolve, 500));
}

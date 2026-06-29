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

// Función para crear un hash seguro del PIN usando SHA-256 con salt
async function hashPin(pin: string): Promise<string> {
  // Generar salt aleatorio (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const data = new Uint8Array([...salt, ...encoder.encode(pin)]);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convertir a formato almacenable: salt:hash (ambos en hex)
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `sha256:${saltHex}:${hashHex}`;
}

// Función para verificar un PIN contra su hash
async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!hash.startsWith('sha256:')) {
    // Formato desconocido, asumir que es un hash legado (para compatibilidad durante migración)
    // En un entorno real, deberíamos manejar esto de manera más segura
    return false;
  }
  
  try {
    const parts = hash.split(':');
    if (parts.length !== 3) return false;
    
    const algorithm = parts[0];
    const saltHex = parts[1];
    const expectedHashHex = parts[2];
    
    if (algorithm !== 'sha256') return false;
    
    // Decodificar salt desde hex
    const saltBytes = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // Calcular hash del PIN proporcionado
    const encoder = new TextEncoder();
    const data = new Uint8Array([...saltBytes, ...encoder.encode(pin)]);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return hashHex === expectedHashHex;
  } catch (e) {
    return false;
  }
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
      <p>Tu código de acceso es:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#6366f1;text-align:center;padding:24px;background:#eef2ff;border-radius:12px;margin:16px 0">
        ${pin}
      </div>
      <p>Ingresa en <a href="${SITE_URL}" style="color:#6366f1">${SITE_URL}</a> con este código.</p>
      <p style="color:#94a3b8;font-size:12px">Este código es personal e intransferible. No lo compartas.</p>
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
      subject: "Tu código de acceso - Agenda Escolar",
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
        const pinHash = await hashPin(pin); // Generar hash seguro en lugar de guardar PIN plano

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
            .upsert({ id: existing.id, pin_hash: pinHash, email, full_name, role });

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
          .upsert({ id: authUser.user.id, pin_hash: pinHash, email, full_name, role });

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
        const pinHash = await hashPin(pin); // Generar hash seguro

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
          .update({ pin_hash: pinHash }) // Actualizar hash en lugar de PIN plano
          .eq("id", user_id);

        if (updateError) throw updateError;

        await sendPinEmail(profile.email!, pin, profile.full_name);

        return new Response(
          JSON.stringify({ ok: true, pin }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "recover-pin": {
        // Nueva acción para recuperación de PIN por email (acceso público)
        const { email } = params as { email: string };

        if (!email) {
          return new Response(
            JSON.stringify({ error: "Email requerido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar el perfil por email
        const { data: profile, error: profileError } = await supabaseColegio
          .from("profiles")
          .select("id, email, full_name")
          .eq("email", email)
          .single();

        if (profileError) {
          // No revelamos si el email existe o no por seguridad de enumeración
          // Pero simulamos éxito para no filtrar información
          await simulateDelay();
          return new Response(
            JSON.stringify({ ok: true, message: "Si el correo está registrado, se ha enviado un nuevo código" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!profile) {
          // Mismo enfoque: no revelar inexistencia
          await simulateDelay();
          return new Response(
            JSON.stringify({ ok: true, message: "Si el correo está registrado, se ha enviado un nuevo código" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generar nuevo PIN y hash
        const pin = generatePin();
        const pinHash = await hashPin(pin);

        // Actualizar Auth y perfil
        await supabaseAuth.auth.admin.updateUserById(profile.id, {
          password: pin,
        });

        const { error: updateError } = await supabaseColegio
          .from("profiles")
          .update({ pin_hash: pinHash })
          .eq("id", profile.id);

        if (updateError) throw updateError;

        // Enviar email con el nuevo PIN
        await sendPinEmail(profile.email, pin, profile.full_name);

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
        // NOTA: Esta función ya no puede enviar el PIN actual porque solo tenemos el hash
        // En su lugar, informamos al usuario que debe usar la función de recuperación
        const { user_id } = params as { user_id: string };

        const { data: profile } = await supabaseColegio
          .from("profiles")
          .select("email, full_name")
          .eq("id", user_id)
          .single();

        if (!profile) throw new Error("Perfil no encontrado");

        // Enviar email informativo en lugar del PIN actual
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

// Función auxiliar para simular retraso y evitar enumeración de emails
async function simulateDelay() {
  return new Promise(resolve => setTimeout(resolve, 500));
}
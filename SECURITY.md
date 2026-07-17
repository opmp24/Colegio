# Guía de Seguridad — Agenda Escolar PWA

> Auditoría: Julio 2026
> App: https://kurzo.netlify.app
> Stack: React 19 + Vite + Supabase + Tailwind CSS

## Tabla de Contenidos

1. [Headers HTTP de Seguridad](#1-headers-http-de-seguridad)
2. [Supabase Row Level Security (RLS)](#2-supabase-row-level-security-rls)
3. [Autenticación y Sesiones](#3-autenticación-y-sesiones)
4. [Protección contra XSS](#4-protección-contra-xss)
5. [Validación de Inputs](#5-validación-de-inputs)
6. [Dependencias y Supply Chain](#6-dependencias-y-supply-chain)
7. [Rate Limiting y Bruteforce](#7-rate-limiting-y-bruteforce)
8. [Auditoría y Logging](#8-auditoría-y-logging)
9. [Netlify — Configuración de Producción](#9-netlify--configuración-de-producción)
10. [Secrets Management](#10-secrets-management)
11. [Checklist de Implementación](#11-checklist-de-implementación)

---

## 1. Headers HTTP de Seguridad

### Estado Actual (Producción)

| Header | Valor | Estado |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | ✅ |
| `Content-Security-Policy` | Ausente | ❌ |
| `X-Frame-Options` | Ausente | ❌ |
| `X-Content-Type-Options` | Ausente | ❌ |
| `Referrer-Policy` | Ausente | ❌ |
| `Permissions-Policy` | Ausente | ❌ |

### Implementación Recomendada

Agregar archivo `netlify.toml` con headers de seguridad:

```toml
[build]
  command = "npm run build"
  publish = "docs"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), interest-cohort=()"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'"

[[headers]]
  for = "/*.html"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'"
```

**Nota**: El `'unsafe-inline'` para `style-src` es necesario por Tailwind CSS. Para eliminarlo, habría que migrar a extracción estática de clases con `purge` y hashear los estilos inline restantes.

### Explicación de cada header

| Header | Qué previene |
|---|---|
| **CSP** | XSS — controla qué recursos pueden cargarse y ejecutarse |
| **X-Frame-Options: DENY** | Clickjacking — impide que la app se renderice en un iframe |
| **X-Content-Type-Options: nosniff** | MIME sniffing — evita que el navegador interprete archivos con tipo MIME incorrecto |
| **Referrer-Policy** | Fuga de información — controla qué datos de la URL se envían como Referrer |
| **Permissions-Policy** | Feature restriction — desactiva APIs del navegador que no se usan (cámara, micrófono, GPS) |
| **HSTS** | SSL stripping — fuerza conexión HTTPS en todas las solicitudes futuras |

---

## 2. Supabase Row Level Security (RLS)

### Políticas Actuales

| Tabla | Operación | Rol | Política |
|---|---|---|---|
| `events` | SELECT | Todos | Según visibilidad: `all` (todos), `admin_teacher` (staff), `admin_only` (admin) |
| `events` | INSERT | Staff | `can_create_event()` |
| `events` | UPDATE | Staff | Propio o admin |
| `events` | DELETE | Admin | Solo admin |
| `news` | SELECT | Todos | Según visibilidad + publish_at + course |
| `news` | INSERT | Profesor | Propio |
| `news` | UPDATE | Profesor | Propio |
| `news` | DELETE | Profesor | Propio |
| `news` | ALL | Admin | `is_admin()` |
| `courses` | SELECT | Miembros + admin | `is_admin()` o `course_members` |
| `course_members` | SELECT | Todos autenticados | `auth.role() = 'authenticated'` |
| `profiles` | SELECT | Todos autenticados | `auth.role() = 'authenticated'` |

### Recomendaciones

#### 2.1 Restringir SELECT en `course_members`

Actualmente **todos los usuarios autenticados** pueden ver todos los miembros de todos los cursos. Esto filtra información sobre qué usuarios pertenecen a qué curso. Mejor restringir:

```sql
DROP POLICY IF EXISTS select_course_members ON "Colegio".course_members;
CREATE POLICY select_course_members ON "Colegio".course_members
  FOR SELECT USING (
    "Colegio".is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM "Colegio".course_members cm2
      WHERE cm2.course_id = course_members.course_id
      AND cm2.user_id = auth.uid()
    )
  );
```

#### 2.2 Limitar cantidad de registros en SELECT

Sin límite, un atacante puede hacer `SELECT * FROM events` sin filtro y causar una lectura masiva. No es un problema de seguridad directo por RLS, pero puede ser un vector de DoS. Recomendación: paginación forzada en consultas (limit 100).

#### 2.3 Verificar función `is_admin()`

Asegurarse de que la función `"Colegio".is_admin()` sea inmune a SQL injection. Revisar su definición:

```sql
CREATE OR REPLACE FUNCTION "Colegio".is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Colegio".profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

#### 2.4 Proteger `created_by` en INSERT

En `teacher_insert_news`, la política verifica `created_by = auth.uid()`. Pero esto depende de que el cliente envíe su propio `created_by` correctamente. Idealmente forzar `created_by` desde el servidor usando `auth.uid()` directamente (trigger o default). Similar para eventos.

Recomendación: agregar trigger que ignore el `created_by` enviado por el cliente y use `auth.uid()`:

```sql
CREATE OR REPLACE FUNCTION "Colegio".set_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_news_set_created_by
  BEFORE INSERT ON "Colegio".news
  FOR EACH ROW EXECUTE FUNCTION "Colegio".set_created_by();
```

---

## 3. Autenticación y Sesiones

### 3.1 Almacenamiento de sesión

Supabase almacena la sesión en `localStorage` bajo la clave `supabase.auth.token`. Esto es normal en SPAs pero implica que:

- **Cualquier XSS puede robar la sesión.** Mitigación: CSP estricto.
- **El token persiste aunque el usuario cierre el navegador.** Mitigación: configurar sesión como `session` (no `local`) en Supabase.

```typescript
// src/lib/supabase.ts
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: "app-auth-token",
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
```

### 3.2 Refresh Token Rotation

Supabase ya implementa refresh token rotation por defecto. Verificar que esté habilitado en el proyecto Supabase:
- Dashboard → Authentication → Settings → Refresh Token Rotation: ON
- Verificar que RLS tengo `auth.role() = 'authenticated'` (no simplemente `auth.uid() IS NOT NULL`) para evitar que tokens revocados sigan funcionando momentáneamente.

### 3.3 PIN de Apoderados

La app tiene un sistema de PIN para apoderados (`login_with_pin`). Asegurar:

- **Longitud mínima**: 6 caracteres
- **Intentos fallidos**: Bloquear después de 5 intentos fallidos (implementar en edge function o trigger)
- **Expiración**: Forzar cambio de PIN periódico (cada 90 días)
- **Hash**: Usar `bcrypt` o `argon2` (no SHA, no MD5). Revisar `check_setup_tokens.cjs` que usa `bcryptjs`.

### 3.4 Cierre de sesión

El `signOut()` debe limpiar `localStorage` y también la sesión del lado del servidor:

```typescript
const handleSignOut = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem("app-auth-token");
  // Opcional: invalidar refresh token en Supabase
};
```

---

## 4. Protección contra XSS

### 4.1 Riesgos actuales

- **React** escapa HTML por defecto → riesgo bajo para XSS clásico
- **Sin CSP** → si hay un XSS, el atacante puede ejecutar scripts externos sin restricción
- **dangerouslySetInnerHTML** → buscar en el código si se usa. Si existe, sanitizar con DOMPurify.
- **URLs de imágenes** → si se aceptan URLs de usuario para avatares, validar que sean URLs seguras (solo `https://`, sin `javascript:`)

### 4.2 Recomendaciones

1. **Agregar CSP** (ver sección de headers)
2. **Buscar `dangerouslySetInnerHTML`** en el código y reemplazar o sanitizar
3. **Sanitizar rich text** si se planea agregar editor de texto enriquecido
4. **Validar URLs de avatares** para evitar `javascript:` o `data:` maliciosos

---

## 5. Validación de Inputs

### 5.1 Frontend (React Hook Form + Zod)

Ya implementado. Verificar que todos los formularios tengan schemas Zod:

| Formulario | Schema | Estado |
|---|---|---|
| Crear evento | `eventSchema.ts` | ✅ |
| Editar evento | `eventSchema.ts` | ✅ |
| Login | Zod (en LoginPage) | ✅ |
| Setup PIN | Zod | ✅ |
| Noticias | Inline | ⚠️ Migrar a schema |

### 5.2 Backend (Supabase RLS)

La validación del lado del servidor depende de RLS. Recomendaciones adicionales:

- **Database Constraints**: agregar `CHECK` constraints en Supabase (ej: `title` no vacío, `due_date` en el futuro)
- **Postgres Triggers**: validar datos complejos antes de INSERT/UPDATE

### 5.3 SQL Injection

Supabase usa queries parametrizados internamente. El riesgo es bajo, pero:

- **Edge functions**: Revisar que no concatenen strings en SQL
- **RPC functions**: Revisar que las funciones `plpgsql` en Supabase escapen inputs

---

## 6. Dependencias y Supply Chain

### 6.1 Auditoría

Ejecutar periódicamente:

```bash
npm audit        # Revisar vulnerabilidades conocidas
npx better-npm-audit  # Auditoría más detallada
npx npm-check-updates  # Verificar dependencias desactualizadas
```

### 6.2 Lockfile

Mantener `package-lock.json` en el repo (ya está). Esto asegura que todos instalen las mismas versiones.

### 6.3 Dependencias críticas

| Paquete | Versión | Nota |
|---|---|---|
| `@supabase/supabase-js` | ^2.108.2 | Mantener actualizado por parches de seguridad |
| `@tanstack/react-query` | ^5.101.1 | Sin CVEs conocidos |
| `react` | ^19.2.7 | React 19 tiene mejoras de seguridad respecto a 18 |
| `vite` | ^8.1.0 | Mantener actualizado (dev server no expuesto en prod) |
| `zod` | ^4.4.3 | Sin CVEs conocidos |

---

## 7. Rate Limiting y Bruteforce

### 7.1 Supabase Rate Limiting

Supabase tiene rate limiting integrado para auth endpoints:
- `/auth/v1/token` — 30 requests/minuto por IP (por defecto)
- Ajustable en Dashboard → Authentication → Rate Limits

### 7.2 Login (email)

El login con email/password tiene protección de rate limit por IP en Supabase. Sin embargo:

- **No hay captcha**: Recomendable agregar Supabase captcha protection (hCaptcha/Cloudflare Turnstile)
- **No hay bloqueo por cuenta**: Supabase no bloquea usuarios tras N intentos fallidos. Se puede implementar con:

```sql
-- Tabla de intentos fallidos
CREATE TABLE "Colegio".login_attempts (
  email text NOT NULL,
  attempted_at timestamptz DEFAULT now(),
  ip_address text,
  success boolean DEFAULT false
);
```

### 7.3 PIN Apoderados

El PIN es más susceptible a bruteforce (menor entropía). Recomendaciones:

- Rate limit: 5 intentos por minuto por usuario
- Bloqueo temporal tras 5 intentos fallidos (15 minutos)
- Notificar al usuario por email cuando se detecten múltiples fallos

---

## 8. Auditoría y Logging

### 8.1 Activity Log existente

Ya existe `ActivityLogPage` y tabla `access_requests`. Recomendaciones:

- **Registrar eventos de auth**: login exitoso/fallido, cierre de sesión
- **Registrar CRUD**: creación/edición/eliminación de eventos, noticias, cursos
- **Registrar cambios de rol**: cuándo un usuario cambia de rol y quién lo hizo

### 8.2 Implementación vía trigger

```sql
CREATE TABLE "Colegio".audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL, -- INSERT, UPDATE, DELETE
  old_data jsonb,
  new_data jsonb,
  performed_by uuid REFERENCES "Colegio".profiles(id),
  performed_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION "Colegio".audit_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  INSERT INTO "Colegio".audit_log(table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar a eventos
CREATE TRIGGER trg_events_audit
  AFTER INSERT OR UPDATE OR DELETE ON "Colegio".events
  FOR EACH ROW EXECUTE FUNCTION "Colegio".audit_events();
```

---

## 9. Netlify — Configuración de Producción

### 9.1 Headers de seguridad

Implementar headers del [punto 1](#1-headers-http-de-seguridad).

### 9.2 Branch deploy

- `main` → producción (Netlify)
- `develop` → previsualización (Netlify Deploy Previews)
- **No commitear a `main` directamente** — usar PRs con revisión

### 9.3 Environment variables

En Netlify Dashboard, configurar:

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública de Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key (solo para edge functions, NO en cliente) |

**Nunca exponer `SUPABASE_SERVICE_KEY`** en el bundle del frontend.

### 9.4 Branch previews

Netlify Deploy Previews pueden exponer features sin terminar. Configurar:
- **Password protection** en Deploy Previews si es necesario
- **Automatic cleanup** de Deploy Previews al mergear el PR

---

## 10. Secrets Management

### 10.1 Archivos sensibles

| Archivo | Contiene | Debe estar en repo |
|---|---|---|
| `local/secrets/Keys.txt` | Supabase credentials | ❌ NO |
| `.env` | Variables de entorno | ❌ NO |
| `.env.example` | Template de variables | ✅ SÍ |
| `netlify.toml` | Config de deploy | ✅ SÍ (sin secrets) |

### 10.2 GitGuardian / Secret Scanning

- Habilitar secret scanning en GitHub (Settings → Security → Secret scanning)
- Considerar usar pre-commit hook con `git-secrets` o `talisman`

### 10.3 Rotación de keys

- Rotar la anon key de Supabase periódicamente (cada 6 meses)
- Rotar service_role key inmediatamente si se filtra
- Las API keys de OpenRouter (en `opencode.json`) no deberían estar en el repo

---

## 11. Checklist de Implementación

### Prioridad Alta (hacer inmediato)

- [ ] Agregar `Content-Security-Policy` en `netlify.toml`
- [ ] Agregar `X-Frame-Options: DENY` en `netlify.toml`
- [ ] Restringir `select_course_members` a admin + miembros del curso
- [ ] Agregar rate limiting al login con PIN (edge function o middleware)
- [ ] Agregar trigger `set_created_by` para forzar `created_by = auth.uid()`

### Prioridad Media (próximo sprint)

- [ ] Agregar `Referrer-Policy` y `Permissions-Policy` en `netlify.toml`
- [ ] Implementar auditoría con triggers PostgreSQL
- [ ] Agregar captcha (hCaptcha/Cloudflare Turnstile) al login
- [ ] Buscar y sanitizar usos de `dangerouslySetInnerHTML`
- [ ] Bloqueo de cuenta tras N intentos fallidos de PIN
- [ ] Migrar validación de formulario de noticias a schema Zod

### Prioridad Baja (mejora continua)

- [ ] Migrar a CSP sin `'unsafe-inline'` para style-src
- [ ] Implementar Content Security Policy Reporting (`report-uri` / `report-to`)
- [ ] Agregar Subresource Integrity (SRI) a los assets cargados
- [ ] Configurar Netlify Deploy Previews con password protection
- [ ] Ejecutar `npm audit` semanalmente (automatizar en CI)
- [ ] Configurar GitHub Secret Scanning
- [ ] Forzar cambio periódico de PIN para apoderados

---

## Referencias

- [OWASP Top 10 - 2021](https://owasp.org/www-project-top-ten/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Netlify Headers Configuration](https://docs.netlify.com/routing/headers/)
- [MDN - Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP - XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

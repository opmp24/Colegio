# Agenda Escolar

PWA informativa para apoderados y alumnos de un colegio. Los profesores publican fechas de pruebas, exámenes, trabajos y ensayos organizados por curso. Los usuarios consultan un calendario y un dashboard con los próximos eventos ordenados por fecha más cercana.

## Stack

**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS v3 · GSAP  
**Backend:** Supabase (Auth, PostgreSQL, Edge Functions, RLS)  
**Deploy:** Netlify (build: `npm run build`, publish: `docs/`)

## Funcionalidades

- **Dashboard** — Calendario mensual/semanal + agenda del día + próximos eventos
- **Eventos** — Creación de pruebas, exámenes, trabajos, ensayos por curso y asignatura
- **Cursos** — CRUD de cursos con colores distintivos
- **Asignaturas** — CRUD de asignaturas/materias por curso
- **Tipos de evaluación** — Configuración de etiquetas de evaluación
- **Usuarios** — Gestión de roles (admin/profesor/alumno), permisos, cursos asignados
- **Autenticación** — Login con email + PIN de 4 dígitos, setup inicial, RLS policies
- **Log de actividades** — Auditoría de creación de eventos
- **PWA** — Instalable como app standalone con caché offline y service worker
- **Tema oscuro** — Soporte completo dark mode

## Roles

| Rol | Permisos |
|------|----------|
| Admin | CRUD todo, gestión de usuarios |
| Profesor | CRUD de sus cursos y eventos |
| Alumno/Apoderado | Solo lectura, vista por curso asignado |

## Desarrollo

```bash
npm install        # Instalar dependencias
npm run dev        # Servidor de desarrollo (http://localhost:5173)
npm run build      # Build producción
npm run test       # Tests Vitest
npm run lint       # ESLint
npm run format     # Prettier
```

## Despliegue

El deploy a Netlify se gatilla automáticamente al pushear a `main`. No requiere build local ni commit de `docs/`.

---

© 2026 Colegio. Todos los derechos reservados.

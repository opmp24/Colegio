# AGENTS.md — Agenda Escolar PWA

## Project Overview

PWA informativa para apoderados y alumnos de un colegio, organizada por curso. Profesores/admins publican fechas de pruebas, exámenes, trabajos, ensayos, etc. Los usuarios ven un calendario y un dashboard con los próximos eventos ordenados por fecha más cercana.

- **Stack:** React 18+ · TypeScript · Vite · Tailwind CSS v3 · Supabase · GSAP
- **Idioma:** Español (código, comentarios, UI, commits)
- **Repo:** `https://github.com/opmp24/Colegio`
- **Supabase:** Credenciales en `/secrets/keys` (no committear)
- **Deploy:** Automático via GitHub Actions al pushear a `main`. NO usa rama `gh-pages`.

## Commands

```bash
# Development
npm run dev          # Iniciar dev server Vite (http://localhost:5173)
npm run build        # Build producción (TypeScript + Vite)
npm run preview      # Preview build local

# Testing
npm run test         # Tests Vitest (una vez)
npm run test:watch   # Tests en modo watch
npm run test:run     # Tests single-run (CI)
npx vitest run src/components/Button.test.tsx  # Test archivo específico
npx vitest run --reporter=verbose src/hooks/   # Tests de un directorio

# Linting & Formatting
npm run lint         # ESLint (src/)
npm run lint:fix     # ESLint con auto-fix
npm run format       # Prettier (escribir archivos)
npm run format:check # Prettier solo check

# TypeScript
npx tsc --noEmit     # Type-check sin emitir
```

## Code Style Guidelines

### Imports

```typescript
// 1. React / librerías externas
import { useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import gsap from "gsap";

// 2. Componentes internos
import { Calendar } from "@/components/Calendar";
import { EventCard } from "@/components/EventCard";

// 3. Hooks
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";

// 4. Utilidades y tipos
import { formatDate } from "@/lib/utils";
import type { Event, Course } from "@/types";

// 5. Estilos (último)
import "./Dashboard.css";
```

- Usar `@/` alias para `src/` (configurado en vite.config.ts y tsconfig)
- NO usar barrel exports (`index.ts` que re-exporta) — importar directo
- Prefer `import type` para solo tipos

### Formato y Nomenclatura

- **Archivos:** PascalCase para componentes (`EventCard.tsx`), camelCase para hooks/utils (`useEvents.ts`, `formatDate.ts`)
- **Componentes:** Arrow functions con nombre explícito + React.FC (o return type):
  ```tsx
  const EventCard: React.FC<EventCardProps> = ({ event }) => { ... };
  export default EventCard;
  ```
- **Props:** Interface en el mismo archivo, prefijo `*Props`:
  ```tsx
  interface EventCardProps {
    event: Event;
    onSelect: (id: string) => void;
  }
  ```
- **Hooks:** `use` + camelCase (`useEvents`, `useAuthSession`)
- **Funciones:** camelCase, verbosas (`fetchEventsByCourse`, `formatEventDate`)
- **CSS:** Tailwind utility classes preferidas; CSS modules solo para estilos complejos
- **Comentarios:** Solo cuando explican *por qué*, no *qué*

### TypeScript

- `strict: true` en tsconfig — respetar tipos siempre
- Prefer `interface` sobre `type` para props/objetos; `type` para uniones/primitivos
- Evitar `any` — usar `unknown` + type guards si es necesario
- Tipos compartidos en `src/types/`:
  ```typescript
  // src/types/event.ts
  export interface Event {
    id: string;
    course_id: string;
    title: string;
    description: string;
    type: "test" | "exam" | "homework" | "essay" | "other";
    due_date: string; // ISO 8601
    created_by: string;
    created_at: string;
  }

  export type EventType = Event["type"];
  ```

### Supabase

- Cliente único inicializado en `src/lib/supabase.ts` usando `createClient`
- Tipos generados con `supabase gen types typescript --linked > src/types/supabase.ts`
- Queries en hooks custom (NO en componentes):
  ```typescript
  // src/hooks/useEvents.ts
  export function useEvents(courseId: string) {
    return useQuery({
      queryKey: ["events", courseId],
      queryFn: () => supabase
        .from("events")
        .select("*")
        .eq("course_id", courseId)
        .order("due_date", { ascending: true }),
    });
  }
  ```
- Prefer React Query / TanStack Query sobre `useEffect` para data fetching
- Mutations via `useMutation` con invalidación de queries
- Autenticación via `supabase.auth` — sesión en contexto/auth provider
- revisar politicas RLS de la base de datos para determinar errores correctamente

### Manejo de Errores

- Componentes: Error Boundaries por ruta/sección
- Data fetching: try/catch + `onError` de React Query + toast para el usuario
- Forms: validación client-side (React Hook Form + Zod) + server-side (Supabase RLS)
- Fallos de red: retry con React Query (3 intentos, backoff exponencial)
- Mensajes siempre en español, amigables ("Ocurrió un error al cargar los eventos")

### Componentes y Estado

- Componentes pequeños y enfocados (una responsabilidad)
- Estado global mínimo — prefer estado local + React Query (servidor)
- Context solo para temas, auth, o valores realmente globales
- Props typing explícito, evitar `defaultProps` (usar default params en destructuring)
- useCallback + useMemo solo cuando hay medición de beneficio; no wrapper por defecto

### Estructura de Directorios

```
src/
├── components/       # Componentes reutilizables
│   ├── Calendar/
│   ├── EventCard/
│   └── Layout/
├── hooks/            # Custom hooks
├── lib/              # Utilidades, cliente Supabase
├── pages/            # Vistas/rutas
├── types/            # Tipos compartidos
├── styles/           # CSS global / módulos
└── App.tsx
```

### Animaciones (GSAP)

- Importar solo los plugins necesarios (no todo el bundle)
- Prefer `transform` y `opacity` para animaciones (compositor-friendly)
- Usar `will-change` solo en elementos animados, limpiar al terminar
- ScrollTrigger para animaciones basadas en scroll
- matchMedia para prefers-reduced-motion: `gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {...})`

### PWA

- Service Worker con `vite-plugin-pwa`
- Manifest con nombre "Agenda Escolar", tema color, iconos
- Cache first para assets estáticos; network first para datos
- Offline page con últimos eventos cacheados

### Performance (Vercel React Best Practices)

- Eliminar waterfalls: `Promise.all()` para queries independientes
- Bundle: imports directos (sin barrel), dynamic imports para componentes pesados
- Re-renders: memo en listas, derivar estado en render (no en effects)
- SVG: animar wrapper div, no el SVG directo

### Commits

- Mensajes en español, formato `tipo: description corta`
- Tipos: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`
- No committear secrets, `.env`, `node_modules`
- Branch: `main` (producción) y `develop` (integración)
- Todo el trabajo nuevo va primero a `develop`. NO commitear directo a `main` — usar PR de develop → main.
- Siempre verificar que se está en la rama correcta antes de escribir código (`git branch`).
- Al finalizar un commit, indicar en qué rama se hizo como texto final de salida.
### Seguridad

- Row Level Security (RLS) en Supabase para todas las tablas
- Políticas por rol: `admin` (CRUD todo), `teacher` (CRUD sus cursos), `student/parent` (solo lectura)
- No exponer service_role key en cliente — usar anon key + RLS
- Validar input siempre (Zod schema en server-side)

## Reglas de operación

1. No programar sin contexto
2. Respuestas cortas
3. No reescribir archivos completos
4. No releer archivos ya leídos
5. Validar antes de declarar hecho
6. Cero charla aduladora
7. Soluciones simples
8. No pelear con el usuario
9. Leer solo lo necesario
10. No narrar el plan
11. Paralelizar tool calls
12. No duplicar código en respuesta
13. No usar agentes innecesarios
14. siempre que solicites crear algo en supabase verifica si tienes permisos para hacerlo
15. cuando el usuario diga que una versión es estable, crear un tag en git con formato `v<major>.<minor>.<patch>` (ej: v1.0.0, v1.1.0) en la rama `main` y pushearlo
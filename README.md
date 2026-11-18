# 🟡 MEME WARS

Clon de Make It Meme para jugar con amigos. Todos ven el mismo clip, cada uno le pone texto con un editor drag & drop, se vota anónimo y gana el Rey del Meme.

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind · Supabase (Postgres, Realtime, Storage) · Canvas API · Vercel.

## Setup

1. **Crear proyecto en Supabase** (https://supabase.com → New project).
2. **Tablas:** SQL Editor → pegá y corré `supabase/migrations.sql` (crea tablas, RLS abierta para juego anónimo, Realtime, función `server_now()` y 6 memes de ejemplo).
3. **Bucket:** corré `supabase/storage.sql` (crea el bucket público `meme-clips` y sus policies). O Storage → New bucket → `meme-clips` → Public.
4. **Keys:** Project Settings → API → copiá `Project URL`, `anon public` y `service_role`.
5. **Variables:** `cp .env.example .env.local` y completá:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD` → la contraseña de `/admin` (la que quieras)
   - `NEXT_PUBLIC_APP_URL` → `http://localhost:3000` (o la URL de Vercel)
6. `npm install && npm run dev` → http://localhost:3000

## Cómo se juega / probar con 2 celus
1. Celu A: poné apodo → **CREAR SALA** → te da un código `MEME-XXXX`.
2. Celu B: **UNIRSE CON CÓDIGO** (o abrí el link que copia el botón COPIAR).
3. El host toca **EMPEZAR PARTIDA** (mínimo 2 jugadores).
4. Escribir → enviar → votar (el propio meme no se vota) → resultados → siguiente ronda → podio.

## Admin (`/admin`)
Contraseña = `ADMIN_PASSWORD`. Subí mp4/webm/gif/jpg/png (máx 10MB, videos ≤ 15s). Los archivos van directo a Supabase Storage con URL firmada (así evitamos el límite de 4.5MB de Vercel) y la base solo guarda la URL. Se generan miniaturas. Se puede activar/desactivar y borrar clips.

## Cómo funciona (resumen técnico)
- **Sin servidor propio:** Supabase Realtime (`postgres_changes`) + polling de respaldo cada 4s.
- **Timer:** la fuente de verdad es `rounds.ends_at`; el cliente sincroniza su reloj con `server_now()`.
- **Game loop:** lo maneja el host (los demás toman el control si el host se congela > 6s). Todas las transiciones son compare-and-set en la DB, así que no se duplican.
- **Render:** `lib/meme-render.ts` compone el frame + capas de texto en un canvas 16:9 y sube un JPG a `meme-clips/renders/`. Si falla, se muestran las capas con HTML.
- **Presencia:** si el host se va > 30s, se promueve al jugador más antiguo; en el lobby se limpian jugadores desconectados.
- El código de sala es `MEME-XXXX` (9 caracteres, por eso la columna es `varchar(10)`). `rounds` tiene una columna extra `voting_index` para sincronizar qué meme se está votando.
- Seguridad MVP: RLS abierta (el código de sala es la única "auth"). Las escrituras de `memes` pasan por la API con service role + `ADMIN_PASSWORD`.

## Deploy en Vercel
Importá el repo en Vercel (framework Next.js) y cargá las 6 variables de `.env.example` (`NEXT_PUBLIC_APP_URL` = URL final). O por CLI:
```bash
npx vercel --prod
```
También se puede hacer con el toolkit de Vercel de Composio (`VERCEL_CREATE_PROJECT2` + `VERCEL_ADD_ENVIRONMENT_VARIABLE` + `VERCEL_CREATE_NEW_DEPLOYMENT`); `.mcp.json` ya está configurado (exportá `COMPOSIO_API_KEY`).

> Opcional más adelante: Cloudflare R2 como storage más barato (solo cambia `media_url`).

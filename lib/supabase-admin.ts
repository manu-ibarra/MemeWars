
import { createClient } from '@supabase/supabase-js';

// Server-only client with the service role key (never import from client components)
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function checkPassword(req: Request): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  return !!pw && req.headers.get('x-admin-password') === pw;
}

export const SEED = [1, 2, 3, 4, 5, 6].map((n) => ({
  title: `Ejemplo ${n}`,
  media_url: `https://picsum.photos/seed/memewars${n}/960/540`,
  thumbnail_url: `https://picsum.photos/seed/memewars${n}/320/180`,
  type: 'image',
  tags: ['ejemplo'],
}));

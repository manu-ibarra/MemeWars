import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Anonymous play: only the anon key, no login. The room code is the only "auth".
export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

export const BUCKET = 'meme-clips';
// Storage note: Supabase Storage is used for the MVP. Cloudflare R2 (S3 compatible)
// is a cheaper alternative later: only memes.media_url would change.

import { NextResponse } from 'next/server';
import { adminClient, checkPassword, SEED } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
const BUCKET = 'meme-clips';
const deny = () => NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });

// List all memes (also used as the password check). Seeds 6 examples if the table is empty.
export async function GET(req: Request) {
  if (!checkPassword(req)) return deny();
  try {
    const sb = adminClient();
    let { data, error } = await sb.from('memes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) {
      await sb.from('memes').insert(SEED);
      ({ data } = await sb.from('memes').select('*').order('created_at', { ascending: false }));
    }
    return NextResponse.json({ memes: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!checkPassword(req)) return deny();
  const { id, is_active } = await req.json();
  const { error } = await adminClient().from('memes').update({ is_active }).eq('id', id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!checkPassword(req)) return deny();
  const { id } = await req.json();
  const sb = adminClient();
  const { data: m } = await sb.from('memes').select('media_url, thumbnail_url').eq('id', id).maybeSingle();
  const paths = [m?.media_url, m?.thumbnail_url]
    .filter((u): u is string => !!u && u.includes(`/${BUCKET}/`))
    .map((u) => decodeURIComponent(u.split(`/${BUCKET}/`)[1]));
  if (paths.length) await sb.storage.from(BUCKET).remove(paths);
  const { error } = await sb.from('memes').delete().eq('id', id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}

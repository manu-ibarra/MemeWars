import { NextResponse } from 'next/server';
import { adminClient, checkPassword } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
const BUCKET = 'meme-clips';

/**
 * Two-step upload (Vercel functions reject bodies > 4.5MB, so files go straight to Storage):
 *  1) {action:'sign'}   -> signed upload URLs for the clip and the thumbnail
 *  2) {action:'commit'} -> inserts the row in `memes` with the public URLs
 */
export async function POST(req: Request) {
  if (!checkPassword(req)) return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  try {
    const sb = adminClient();
    const body = await req.json();
    if (body.action === 'sign') {
      const id = crypto.randomUUID();
      const ext = String(body.ext || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5);
      const filePath = `clips/${id}.${ext}`;
      const thumbPath = `thumbnails/${id}.jpg`;
      const f = await sb.storage.from(BUCKET).createSignedUploadUrl(filePath);
      const t = await sb.storage.from(BUCKET).createSignedUploadUrl(thumbPath);
      if (f.error || t.error) throw new Error((f.error || t.error)!.message);
      return NextResponse.json({ filePath, thumbPath, fileToken: f.data.token, thumbToken: t.data.token });
    }
    if (body.action === 'commit') {
      const pub = (p: string) => sb.storage.from(BUCKET).getPublicUrl(p).data.publicUrl;
      const { data, error } = await sb.from('memes').insert({
        title: String(body.title || 'Sin título').slice(0, 100),
        media_url: pub(body.filePath),
        thumbnail_url: pub(body.thumbPath),
        type: body.type,
        duration_seconds: body.duration ? Math.round(body.duration) : null,
        tags: body.tags || [],
        default_text_positions: body.positions || undefined,
        is_active: true,
        created_by: 'admin',
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ meme: data });
    }
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}

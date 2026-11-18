import { isConfigured } from '@/lib/supabase';
export default function ConfigBanner() {
  if (isConfigured) return null;
  return (
    <div className="bg-red-600 text-white text-center text-sm font-bold p-2">
      Faltan las variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (mirá el README)
    </div>
  );
}

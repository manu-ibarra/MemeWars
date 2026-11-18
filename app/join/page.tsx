'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import JoinForm from '@/components/JoinForm';

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-4">
      <Link href="/"><Logo width={220} glow /></Link>
      <h1 className="font-display text-2xl text-brand">UNIRSE A UNA SALA</h1>
      <JoinForm initialCode={sp.get('code') || ''} onJoined={(c) => router.push(`/room/${c}`)} />
      <Link href="/" className="underline text-neutral-400">Volver</Link>
    </main>
  );
}
export default function JoinPage() { return <Suspense><Inner /></Suspense>; }

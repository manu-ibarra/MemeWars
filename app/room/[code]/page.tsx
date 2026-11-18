'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import Loading from '@/components/Loading';
import Logo from '@/components/Logo';
import Lobby from '@/components/Lobby';
import WritingPhase from '@/components/WritingPhase';
import VotingPhase from '@/components/VotingPhase';
import ResultsPhase from '@/components/ResultsPhase';
import FinalPodium from '@/components/FinalPodium';
import JoinForm from '@/components/JoinForm';
import MuteToggle from '@/components/MuteToggle';
import ConfigBanner from '@/components/ConfigBanner';
import { normalizeCode } from '@/lib/game';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeCode(decodeURIComponent(params.code));
  const s = useRoom(code);

  if (s.loading) return <Loading />;
  if (s.notFound || !s.room) {
    return (
      <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 p-4 text-center">
        <Logo width={220} />
        <h1 className="font-display text-2xl">Esa sala no existe, ¿querés crear una?</h1>
        <Link href="/" className="btn">CREAR SALA</Link>
      </main>
    );
  }
  const { room, players, me, round, meme, submissions, votes } = s;

  // Link opened by someone who isn't in the room yet (or was dropped): ask for a nickname
  if (!me) {
    return (
      <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 p-4">
        <Logo width={220} glow />
        <h1 className="font-display text-2xl text-brand">SALA {room.code}</h1>
        <JoinForm initialCode={room.code} lockCode onJoined={() => s.reload()} />
      </main>
    );
  }

  let body: React.ReactNode;
  if (room.status === 'lobby') body = <Lobby room={room} players={players} me={me} presentIds={s.presentIds} />;
  else if (room.status === 'finished') body = <FinalPodium room={room} players={players} me={me} />;
  else if (!round) body = <Loading />;
  else if (round.phase === 'writing')
    body = <WritingPhase round={round} meme={meme} me={me} players={players} submissions={submissions} totalSec={room.settings.timePerRound} totalRounds={room.settings.rounds} />;
  else if (round.phase === 'voting')
    body = <VotingPhase round={round} meme={meme} me={me} players={players} submissions={submissions} votes={votes} />;
  else body = <ResultsPhase room={room} round={round} meme={meme} me={me} players={players} submissions={submissions} votes={votes} />;

  return (<><ConfigBanner /><MuteToggle />{body}</>);
}

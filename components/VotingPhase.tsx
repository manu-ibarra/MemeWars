'use client';
import { Meme, Player, Round, Submission, Vote } from '@/types';
import VotingCard from './VotingCard';
import TimerBar from './TimerBar';
import { castVote, sortedSubs, VOTE_SECONDS } from '@/lib/game';
import { useCountdown } from '@/hooks/useRoom';

export default function VotingPhase({ round, meme, me, players, submissions, votes }: {
  round: Round; meme: Meme | null; me: Player; players: Player[]; submissions: Submission[]; votes: Vote[];
}) {
  const left = useCountdown(round.ends_at);
  const ordered = sortedSubs(submissions);
  const cur = ordered[round.voting_index];
  if (!cur) return <p className="p-10 text-center font-display text-xl">CONTANDO VOTOS...</p>;
  const mine = cur.player_id === me.id;
  const curVotes = votes.filter((v) => v.submission_id === cur.id);
  const myVote = curVotes.find((v) => v.voter_id === me.id)?.points ?? null;
  const eligible = players.filter((p) => p.id !== cur.player_id).length;
  return (
    <main className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center font-display">
        <span className="text-brand">VOTACIÓN</span>
        <span className="text-sm text-neutral-400">MEME {round.voting_index + 1}/{ordered.length}</span>
      </div>
      <TimerBar remainingMs={left} totalSec={VOTE_SECONDS} />
      <VotingCard
        key={cur.id} meme={meme} submission={cur} isMine={mine} myVote={myVote}
        voteCount={curVotes.length} eligible={eligible}
        onVote={(p) => castVote(cur.id, me.id, p)}
      />
    </main>
  );
}

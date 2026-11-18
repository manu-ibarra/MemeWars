import { redirect } from 'next/navigation';

// The lobby is rendered by the room state machine (components/Lobby.tsx)
export default function LobbyRedirect({ params }: { params: { code: string } }) {
  redirect(`/room/${params.code}`);
}

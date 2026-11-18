export type RoomStatus = 'lobby' | 'playing' | 'voting' | 'finished';
export type Phase = 'writing' | 'voting' | 'results';
export type MemeType = 'image' | 'video' | 'gif';
export type FontKey = 'impact' | 'bungee' | 'luckiest' | 'arial';

export interface RoomSettings {
  rounds: number;
  timePerRound: number;
  clipSource: 'host_only' | 'all';
}

export interface Room {
  id: string;
  code: string;
  host_id: string | null;
  status: RoomStatus;
  settings: RoomSettings;
  current_round: number;
  current_meme_id: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  nickname: string;
  avatar_color: string | null;
  avatar_emoji: string | null;
  score: number;
  is_host: boolean;
  is_ready: boolean;
  joined_at: string;
}

export interface TextPositions {
  top: { x: number; y: number };
  bottom: { x: number; y: number };
}

export interface Meme {
  id: string;
  title: string | null;
  media_url: string;
  thumbnail_url: string | null;
  type: MemeType;
  duration_seconds: number | null;
  tags: string[] | null;
  is_active: boolean;
  default_text_positions: TextPositions | null;
  created_by: string;
  created_at: string;
}

export interface Round {
  id: string;
  room_id: string;
  round_number: number;
  meme_id: string;
  phase: Phase;
  ends_at: string;
  voting_index: number;
  created_at: string;
}

export interface TextLayer {
  id: string;
  text: string;
  x: number; // 0-100 (% of width)
  y: number; // 0-100 (% of height)
  fontSize: number; // 16-80, relative to a 640px wide canvas
  fontFamily: FontKey;
  color: string;
  strokeWidth: number; // 0-8
  strokeColor: string;
  uppercase: boolean;
  align: 'left' | 'center' | 'right';
  rotation: number;
  opacity: number; // 0-100
}

export interface Submission {
  id: string;
  round_id: string;
  player_id: string;
  top_text: string | null;
  bottom_text: string | null;
  text_layers: TextLayer[] | null;
  rendered_image_url: string | null;
  created_at: string;
}

export interface Vote {
  id: string;
  submission_id: string;
  voter_id: string;
  points: number;
  created_at: string;
}

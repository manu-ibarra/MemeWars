// Small localStorage helpers (wrapped: storage can throw in private mode)
function get(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function set(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
}
export const getNick = () => get('mw_nick') || '';
export const setNick = (n: string) => set('mw_nick', n);
export const getPlayerId = (code: string) => get(`mw_player_${code}`);
export const setPlayerId = (code: string, id: string) => set(`mw_player_${code}`, id);
export const clearPlayerId = (code: string) => { try { localStorage.removeItem(`mw_player_${code}`); } catch { /* ignore */ } };

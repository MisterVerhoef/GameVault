import { igdbMockEnabled } from "./mock";

/** True when live IGDB API calls can succeed (credentials or test mock). */
export function igdbLiveEnabled(): boolean {
  if (igdbMockEnabled()) return true;
  const clientId = process.env.IGDB_CLIENT_ID?.trim();
  const clientSecret = process.env.IGDB_CLIENT_SECRET?.trim();
  return Boolean(clientId && clientSecret);
}

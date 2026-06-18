import type { SessionOptions } from 'iron-session';

export interface OuraSession {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp ms
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD!,
  cookieName: 'oura-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90, // 90 days
  },
};

export interface StravaSession {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in SECONDS (Strava returns seconds, not ms)
}

export const stravaSessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD!,
  cookieName: 'strava-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90,
  },
};

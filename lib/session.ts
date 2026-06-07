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

import crypto from 'crypto';

// Signed OAuth `state`. It carries the initiating user's id through the
// provider redirect (which the callback receives with no Authorization header
// or usable cookie), so tokens land on the right account. HMAC-signed with the
// existing SESSION_PASSWORD secret + short expiry — this is also the CSRF guard,
// replacing the old cross-host state cookie. The user id is not sensitive PII,
// but nothing here is trusted without a valid signature.

type Provider = 'strava' | 'oura';
const TTL_MS = 10 * 60 * 1000;

interface StatePayload {
  uid: string;
  provider: Provider;
  nonce: string;
  exp: number;
}

function secret(): string {
  const s = process.env.SESSION_PASSWORD;
  if (!s) throw new Error('SESSION_PASSWORD is not set');
  return s;
}

export function signState(uid: string, provider: Provider): string {
  const payload: StatePayload = {
    uid,
    provider,
    nonce: crypto.randomBytes(8).toString('hex'),
    exp: Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** Returns the user id if the state is authentic, unexpired, and for this
 *  provider; otherwise null. */
export function verifyState(token: string, provider: Provider): string | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as StatePayload;
    if (payload.provider !== provider) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload.uid || null;
  } catch {
    return null;
  }
}

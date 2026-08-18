import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
export const SESSION_ABS_MS = 7 * 24 * 60 * 60 * 1000;

const signBody = (body, secret) => createHmac("sha256", secret).update(body).digest("hex");

const safeEqualHex = (a, b) => {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
};

export const makeSessionToken = (userId, secret, now = Date.now()) => {
  const exp = now + SESSION_IDLE_MS;
  const abs = now + SESSION_ABS_MS;
  const body = `${userId}.${exp}.${abs}`;
  return `${body}.${signBody(body, secret)}`;
};

export const readSessionToken = (token, secret, now = Date.now()) => {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, expStr, absStr, sig] = parts;
  if (!userId || !expStr || !absStr || !sig || !/^[0-9a-f]+$/i.test(sig)) return null;
  const body = `${userId}.${expStr}.${absStr}`;
  if (!safeEqualHex(sig, signBody(body, secret))) return null;
  const exp = Number(expStr);
  const abs = Number(absStr);
  if (!Number.isFinite(exp) || !Number.isFinite(abs)) return null;
  if (now > exp || now > abs) return null;
  return { userId, exp, abs };
};

export const refreshSessionToken = (session, secret, now = Date.now()) => {
  if (!session || now > session.abs) return null;
  const exp = Math.min(session.abs, now + SESSION_IDLE_MS);
  const body = `${session.userId}.${exp}.${session.abs}`;
  return `${body}.${signBody(body, secret)}`;
};

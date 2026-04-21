import { createHmac, timingSafeEqual } from "crypto";

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  institutionId: string | null;
  institutionName: string | null;
}

export interface AuthTokenPayload extends AuthUserPayload {
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function sign(input: string): string {
  return base64UrlEncode(createHmac("sha256", getJwtSecret()).update(input).digest());
}

export function createAuthToken(user: AuthUserPayload): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    ...user,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

export function decodeAuthToken(token: string): AuthTokenPayload | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as AuthTokenPayload;

    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const [header, payload, signature] = parts;
    const expectedSignature = sign(`${header}.${payload}`);
    const providedSignature = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
      providedSignature.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(providedSignature, expectedSignatureBuffer)
    ) {
      return null;
    }

    const decoded = decodeAuthToken(token);
    if (!decoded) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp <= now) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

import { all, first, getRuntimeEnv, run } from "@/db";
import { ApiError } from "@/lib/http";
import type { OrganizationRole, UserSummary } from "@/shared/types";

const COOKIE_NAME = "compass_session";
const TEN_MINUTES = 10 * 60 * 1000;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

interface UserRow {
  id: string;
  email: string;
}

interface CodeRow {
  id: string;
  code_hash: string;
  attempts: number;
}

function requiredSecret(): string {
  const secret = getRuntimeEnv().SESSION_SECRET;
  if (!secret || secret.length < 24) throw new ApiError(503, "Sign-in is being configured. Please try again shortly.");
  return secret;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

function randomToken(): string {
  const values = new Uint8Array(32);
  crypto.getRandomValues(values);
  return Array.from(values, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const runtime = getRuntimeEnv();
  if (!runtime.RESEND_API_KEY || !runtime.EMAIL_FROM) {
    if (runtime.APP_ENV === "production") throw new ApiError(503, "Email delivery is being configured. Please try again shortly.");
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${runtime.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: runtime.EMAIL_FROM, to: [to], subject, html }),
  });
  if (!response.ok) throw new ApiError(502, "We could not send the email. Please try again.");
  return true;
}

export async function requestSignInCode(request: Request, emailInput: string): Promise<{ devCode?: string }> {
  const email = normalizeEmail(emailInput);
  const secret = requiredSecret();
  const ipHash = await sha256(`${clientIp(request)}:${secret}`);
  const now = Date.now();
  const recentEmail = await first<{ count: number }>(
    "SELECT COUNT(*) AS count FROM authentication_codes WHERE email = ? AND created_at > ?",
    email,
    new Date(now - 60_000).toISOString(),
  );
  const recentIp = await first<{ count: number }>(
    "SELECT COUNT(*) AS count FROM authentication_codes WHERE ip_hash = ? AND created_at > ?",
    ipHash,
    new Date(now - TEN_MINUTES).toISOString(),
  );
  if ((recentEmail?.count ?? 0) >= 3 || (recentIp?.count ?? 0) >= 20) {
    throw new ApiError(429, "Too many sign-in requests. Please wait a few minutes.");
  }

  const code = randomCode();
  const codeHash = await sha256(`${email}:${code}:${secret}`);
  await run(
    "INSERT INTO authentication_codes (id, email, code_hash, ip_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
    crypto.randomUUID(),
    email,
    codeHash,
    ipHash,
    new Date(now + TEN_MINUTES).toISOString(),
    new Date(now).toISOString(),
  );
  const delivered = await sendEmail(
    email,
    "Your AI for Humanity Compass sign-in code",
    `<div style="font-family:Arial,sans-serif;color:#27221f"><h2 style="color:#8b1538">AI for Humanity Compass</h2><p>Your one-time sign-in code is:</p><p style="font-size:30px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
  );
  return delivered ? {} : { devCode: code };
}

async function acceptPendingInvitations(user: UserRow): Promise<void> {
  const invitations = await all<{ id: string; org_id: string; role: OrganizationRole }>(
    "SELECT id, org_id, role FROM invitations WHERE email = ? AND accepted_at IS NULL AND expires_at > ?",
    user.email,
    new Date().toISOString(),
  );
  for (const invitation of invitations) {
    await run(
      "INSERT INTO memberships (org_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT(org_id, user_id) DO UPDATE SET role = excluded.role",
      invitation.org_id,
      user.id,
      invitation.role,
    );
    await run("UPDATE invitations SET accepted_at = ? WHERE id = ?", new Date().toISOString(), invitation.id);
  }
}

export async function verifySignInCode(request: Request, emailInput: string, code: string): Promise<{ user: UserSummary; cookie: string }> {
  const email = normalizeEmail(emailInput);
  const secret = requiredSecret();
  const challenge = await first<CodeRow>(
    "SELECT id, code_hash, attempts FROM authentication_codes WHERE email = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
    email,
    new Date().toISOString(),
  );
  if (!challenge || challenge.attempts >= 5) throw new ApiError(400, "That code is invalid or has expired.");
  const submittedHash = await sha256(`${email}:${code}:${secret}`);
  if (submittedHash !== challenge.code_hash) {
    await run("UPDATE authentication_codes SET attempts = attempts + 1 WHERE id = ?", challenge.id);
    throw new ApiError(400, "That code is invalid or has expired.");
  }
  await run("UPDATE authentication_codes SET used_at = ? WHERE id = ?", new Date().toISOString(), challenge.id);

  let user = await first<UserRow>("SELECT id, email FROM users WHERE email = ?", email);
  if (!user) {
    user = { id: crypto.randomUUID(), email };
    await run("INSERT INTO users (id, email) VALUES (?, ?)", user.id, user.email);
  }
  await acceptPendingInvitations(user);

  const token = randomToken();
  const tokenHash = await sha256(`${token}:${secret}`);
  const expiresAt = new Date(Date.now() + THIRTY_DAYS);
  await run(
    "INSERT INTO sessions (id, token_hash, user_id, expires_at) VALUES (?, ?, ?, ?)",
    crypto.randomUUID(),
    tokenHash,
    user.id,
    expiresAt.toISOString(),
  );
  const secure = new URL(request.url).protocol === "https:";
  const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(THIRTY_DAYS / 1000)}${secure ? "; Secure" : ""}`;
  return { user, cookie };
}

function cookieValue(request: Request, name: string): string | null {
  const pair = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

export async function currentUser(request: Request): Promise<UserSummary | null> {
  const token = cookieValue(request, COOKIE_NAME);
  if (!token) return null;
  const tokenHash = await sha256(`${token}:${requiredSecret()}`);
  return first<UserSummary>(
    "SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
    tokenHash,
    new Date().toISOString(),
  );
}

export async function requireUser(request: Request): Promise<UserSummary> {
  const user = await currentUser(request);
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  return user;
}

export async function revokeSession(request: Request): Promise<string> {
  const token = cookieValue(request, COOKIE_NAME);
  if (token) {
    const tokenHash = await sha256(`${token}:${requiredSecret()}`);
    await run("DELETE FROM sessions WHERE token_hash = ?", tokenHash);
  }
  const secure = new URL(request.url).protocol === "https:";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function sendOrganizationInvitation(email: string, organizationName: string): Promise<void> {
  const url = getRuntimeEnv().APP_URL ?? "";
  await sendEmail(
    email,
    `You are invited to ${organizationName} in AI for Humanity Compass`,
    `<div style="font-family:Arial,sans-serif;color:#27221f"><h2 style="color:#8b1538">AI for Humanity Compass</h2><p>You have been invited to join <strong>${organizationName}</strong>.</p><p><a href="${url}" style="display:inline-block;background:#8b1538;color:white;padding:12px 18px;text-decoration:none">Open the Compass</a></p><p>Sign in with this email address to join automatically.</p></div>`,
  );
}

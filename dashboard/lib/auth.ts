import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { getDb, isMongoConfigured } from "./mongodb";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SECURITY ERROR: JWT_SECRET environment variable is missing in production!");
    }
    return "dev_ephemeral_fallback_secret_local_testing_only";
  }
  return secret;
}

export const AUTH_COOKIE = "poke_vault_token";

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role: "admin" | "viewer";
  isApproved: boolean;
}

export function signToken(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isApproved: user.isApproved,
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as SessionUser;
    return decoded;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getSession(req?: Request): Promise<SessionUser | null> {
  let token: string | undefined;

  // 1. Check Bearer Authorization header or query param if req is provided
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
    if (!token) {
      try {
        const url = new URL(req.url);
        const queryToken = url.searchParams.get("token");
        if (queryToken) token = queryToken.trim();
      } catch { }
    }
  }

  // 2. Check Next.js header store
  if (!token) {
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    } catch { }
  }

  // 3. Check Next.js cookie store
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIE)?.value;
    } catch { }
  }

  if (!token) return null;

  const session = verifyToken(token);
  if (!session) return null;

  // Master Admin bypass: immediately validate without database roundtrip failure
  if (
    session.id === "master-admin" ||
    session.id === "env-admin" ||
    session.email === "admin@vault.local"
  ) {
    return session;
  }

  // If MongoDB is configured, verify user still exists and is approved
  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const user = await db.collection("users").findOne({ email: session.email });
      if (!user || !user.isApproved) {
        return null;
      }
      return {
        id: user._id.toString(),
        email: user.email,
        username: user.username || user.email.split("@")[0],
        role: user.role || "viewer",
        isApproved: user.isApproved,
      };
    } catch {
      // In case of temporary db hiccup, rely on signed token if valid
      return session.isApproved ? session : null;
    }
  }

  return session.isApproved ? session : null;
}

export async function setSessionCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch { }
}

export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE);
  } catch { }
}


import { NextResponse } from "next/server";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { comparePassword, setSessionCookie, signToken, SessionUser, AUTH_COOKIE } from "@/lib/auth";

// Basic in-memory rate limiting against brute force
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }
  if (record.count >= 5) {
    return false;
  }
  record.count += 1;
  return true;
}

function clearRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

export async function POST(req: Request) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown-ip";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait 60 seconds before trying again." },
        { status: 429 }
      );
    }

    const { email, password, masterKey } = await req.json();
    const adminInvite = process.env.ADMIN_INVITE_CODE;

    // Fast-path: Master Admin Invite Code / Key
    if (adminInvite && masterKey && masterKey.trim() === adminInvite.trim()) {
      clearRateLimit(clientIp);

      const user: SessionUser = {
        id: "master-admin",
        email: email?.trim().toLowerCase() || "admin@vault.local",
        username: "SuperAdmin",
        role: "admin",
        isApproved: true,
      };

      // Ensure Master Admin exists in database as approved admin
      if (isMongoConfigured()) {
        try {
          const db = await getDb();
          await db.collection("users").updateOne(
            { email: user.email },
            {
              $set: {
                email: user.email,
                username: user.username,
                role: "admin",
                isApproved: true,
                updatedAt: new Date(),
              },
              $setOnInsert: {
                createdAt: new Date(),
              },
            },
            { upsert: true }
          );
        } catch { }
      }

      const token = signToken(user);
      await setSessionCookie(token);

      const res = NextResponse.json({ success: true, token, user });
      res.cookies.set(AUTH_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (!isMongoConfigured()) {
      if (adminInvite && password === adminInvite) {
        clearRateLimit(clientIp);
        const user: SessionUser = {
          id: "env-admin",
          email: email.trim().toLowerCase(),
          username: email.split("@")[0],
          role: "admin",
          isApproved: true,
        };
        const token = signToken(user);
        await setSessionCookie(token);
        const res = NextResponse.json({ success: true, token, user });
        res.cookies.set(AUTH_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
        return res;
      }
      return NextResponse.json(
        { error: "Database not configured yet. Sign in with Master Passkey or configure MONGODB_URI." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials or user not found." }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    if (!user.isApproved) {
      return NextResponse.json(
        { error: "Account pending approval. An administrator must grant you access." },
        { status: 403 }
      );
    }

    clearRateLimit(clientIp);

    const sessionUser: SessionUser = {
      id: user._id.toString(),
      email: user.email,
      username: user.username || user.email.split("@")[0],
      role: user.role || "viewer",
      isApproved: user.isApproved,
    };

    const token = signToken(sessionUser);
    await setSessionCookie(token);

    const res = NextResponse.json({ success: true, token, user: sessionUser });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal login error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

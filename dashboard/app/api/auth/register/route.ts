import { NextResponse } from "next/server";
import { getDb, isMongoConfigured, initIndexes } from "@/lib/mongodb";
import { hashPassword, setSessionCookie, signToken, SessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, username, inviteCode } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (!isMongoConfigured()) {
      return NextResponse.json(
        { error: "MongoDB Atlas is not configured yet. Set MONGODB_URI in .env.local first." },
        { status: 400 }
      );
    }

    await initIndexes();
    const db = await getDb();
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db.collection("users").findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists." }, { status: 409 });
    }

    const adminInvite = process.env.ADMIN_INVITE_CODE;
    const hasAdminInvite = Boolean(adminInvite && inviteCode && inviteCode.trim() === adminInvite.trim());

    // Check if this is the very first user in the database
    const totalUsers = await db.collection("users").countDocuments();
    const isFirstUser = totalUsers === 0;

    // First user or user with valid invite code gets auto-approved as admin!
    const isApproved = isFirstUser || hasAdminInvite;
    const role: "admin" | "viewer" = isFirstUser || hasAdminInvite ? "admin" : "viewer";

    const passwordHash = await hashPassword(password);

    const newUserDoc = {
      email: normalizedEmail,
      username: username?.trim() || normalizedEmail.split("@")[0],
      passwordHash,
      role,
      isApproved,
      createdAt: new Date(),
    };

    const insertResult = await db.collection("users").insertOne(newUserDoc);

    const sessionUser: SessionUser = {
      id: insertResult.insertedId.toString(),
      email: normalizedEmail,
      username: newUserDoc.username,
      role,
      isApproved,
    };

    const token = isApproved ? signToken(sessionUser) : null;
    if (token) {
      await setSessionCookie(token);
    }

    const res = NextResponse.json({
      success: true,
      token,
      user: sessionUser,
      needsApproval: !isApproved,
      message: isApproved
        ? "Account created and approved successfully."
        : "Account created! Access is pending administrator approval.",
    });

    if (token) {
      res.cookies.set("poke_vault_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal registration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

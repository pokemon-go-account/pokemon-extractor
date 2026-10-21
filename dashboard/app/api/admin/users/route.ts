import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required." }, { status: 403 });
  }

  if (!isMongoConfigured()) {
    return NextResponse.json({ users: [] });
  }

  try {
    const db = await getDb();
    const users = await db
      .collection("users")
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        username: u.username,
        role: u.role,
        isApproved: u.isApproved,
        createdAt: u.createdAt,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required." }, { status: 403 });
  }

  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not connected." }, { status: 400 });
  }

  try {
    const { userId, isApproved, action } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const db = await getDb();

    if (action === "delete") {
      await db.collection("users").deleteOne({ _id: new ObjectId(userId) });
      return NextResponse.json({ success: true, message: "User removed." });
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isApproved: Boolean(isApproved) } }
    );

    return NextResponse.json({ success: true, message: "User status updated." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Update error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

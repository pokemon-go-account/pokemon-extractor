import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to submit a review." }, { status: 401 });
    }

    const body = await req.json();
    const { email, isChecked, isLiked, reviewNote, reviewStatus } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Account email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (isChecked !== undefined) {
      updateFields.isChecked = Boolean(isChecked);
    }
    if (isLiked !== undefined) {
      updateFields.isLiked = Boolean(isLiked);
    }
    if (reviewNote !== undefined) {
      updateFields.reviewNote = String(reviewNote).trim();
    }
    if (reviewStatus !== undefined) {
      updateFields.reviewStatus = String(reviewStatus);
    }

    // Always record who performed the review and timestamp
    updateFields.reviewedAt = new Date();
    updateFields.reviewedBy = session.username || session.email.split("@")[0] || "Operator";

    if (isMongoConfigured()) {
      const db = await getDb();
      const result = await db.collection("accounts").updateOne(
        { email: normalizedEmail },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        // If not found by exact email, try matching case-insensitively
        await db.collection("accounts").updateOne(
          { email: { $regex: new RegExp(`^${normalizedEmail}$`, "i") } },
          { $set: updateFields }
        );
      }
    }

    // Broadcast review event to real-time subscribers
    if (global._vaultHitEmitter) {
      global._vaultHitEmitter.emit("review", {
        email: normalizedEmail,
        ...updateFields,
        reviewedAt: (updateFields.reviewedAt as Date).toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      updated: {
        ...updateFields,
        reviewedAt: (updateFields.reviewedAt as Date).toISOString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Review update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

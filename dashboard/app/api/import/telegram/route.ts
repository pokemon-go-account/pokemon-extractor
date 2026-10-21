import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, isMongoConfigured, initIndexes } from "@/lib/mongodb";

interface ParsedHit {
  email: string;
  password?: string;
  level: number | string;
  pokeCoins?: number;
  stardust?: number;
  itemBag?: string | number;
  pokemonStorage?: string | number;
  isFirstTimeBuyer?: boolean | null;
  team?: string;
  gameEmail?: string;
  country?: string;
}

function parseTelegramText(text: string): ParsedHit[] {
  const blocks = text.split(/(?:✨\s*POKÉMON GO|👑\s*POKÉMON GO|🔥\s*POKÉMON GO|Account Result)/i);
  const hits: ParsedHit[] = [];

  for (const block of blocks) {
    if (!block.trim()) continue;

    let email = "";
    let password = "";
    let level: number | string = "Unknown";
    let pokeCoins = 0;
    let stardust = 0;
    let isFirstTimeBuyer: boolean | null = null;
    let team = "none";
    let gameEmail = "";
    let country = "";

    // Extract Combo: email:pass
    const comboMatch = block.match(/Combo:\s*([^\r\n<]+)/i) || block.match(/<code>([^:]+):([^<]+)<\/code>/i);
    if (comboMatch) {
      if (comboMatch[2]) {
        email = comboMatch[1].trim();
        password = comboMatch[2].trim();
      } else {
        const parts = comboMatch[1].split(":");
        email = parts[0]?.trim();
        password = parts.slice(1).join(":").trim();
      }
    }

    // Extract User
    if (!email) {
      const userMatch = block.match(/User:\s*<code>?([^\r\n<]+)/i);
      if (userMatch) email = userMatch[1].trim();
    }

    // Extract Pass
    if (!password) {
      const passMatch = block.match(/Pass:\s*<code>?([^\r\n<]+)/i);
      if (passMatch) password = passMatch[1].trim();
    }

    if (!email) continue;

    // Extract Level
    const lvlMatch = block.match(/Level:\s*(?:🎯|👑|🔥|⚡)?\s*<b>?Level\s*(\d+)<\/b>?/i) || block.match(/Level\s*(\d+)/i);
    if (lvlMatch) {
      level = parseInt(lvlMatch[1], 10);
    } else if (block.includes("NO_PLAYER_ACCOUNT") || block.includes("NO PLAYER ACCOUNT")) {
      level = "NO_PLAYER_ACCOUNT";
    }

    // Extract Coins
    const coinsMatch = block.match(/PokéCoins:\s*(?:🪙)?\s*<code>?([0-9,]+)/i);
    if (coinsMatch) {
      pokeCoins = parseInt(coinsMatch[1].replace(/,/g, ""), 10) || 0;
    }

    // Extract Dust
    const dustMatch = block.match(/Stardust:\s*(?:✨)?\s*<code>?([0-9,]+)/i);
    if (dustMatch) {
      stardust = parseInt(dustMatch[1].replace(/,/g, ""), 10) || 0;
    }

    // Spender Status
    if (block.includes("PRIOR SPENDER") || block.includes("Purchased Before")) {
      isFirstTimeBuyer = false;
    } else if (block.includes("First-Time Buyer") || block.includes("First Time Buyer: True")) {
      isFirstTimeBuyer = true;
    }

    // Team
    const teamMatch = block.match(/Team:\s*(?:[🔵🔴🟡⚪])?\s*([^\r\n<]+)/i);
    if (teamMatch) {
      team = teamMatch[1].trim();
    }

    // Game Email
    const gEmailMatch = block.match(/Game Email:\s*<code>?([^\r\n<]+)/i);
    if (gEmailMatch) {
      gameEmail = gEmailMatch[1].trim();
    }

    // Country
    const countryMatch = block.match(/Country:\s*(?:🌍)?\s*<code>?([^\r\n<]+)/i);
    if (countryMatch) {
      country = countryMatch[1].trim();
    }

    hits.push({
      email,
      password,
      level,
      pokeCoins,
      stardust,
      isFirstTimeBuyer,
      team,
      gameEmail,
      country,
    });
  }

  return hits;
}

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Administrator privileges required." }, { status: 403 });
  }

  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "MongoDB Atlas is not configured yet. Set MONGODB_URI in .env.local first." },
      { status: 400 }
    );
  }

  try {
    const { rawText } = await req.json();

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ error: "No Telegram text provided to parse." }, { status: 400 });
    }

    const parsedHits = parseTelegramText(rawText);

    if (parsedHits.length === 0) {
      return NextResponse.json({ error: "Could not parse any account hits from the text." }, { status: 400 });
    }

    await initIndexes();
    const db = await getDb();

    const operations = parsedHits.map((h) => ({
      updateOne: {
        filter: { email: h.email.toLowerCase() },
        update: {
          $set: {
            email: h.email.toLowerCase(),
            password: h.password || "",
            level: h.level,
            pokeCoins: h.pokeCoins || 0,
            stardust: h.stardust || 0,
            isFirstTimeBuyer: h.isFirstTimeBuyer,
            team: h.team || "none",
            gameEmail: h.gameEmail || h.email,
            country: h.country || "",
            source: "telegram_sync",
            extractedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const result = await db.collection("accounts").bulkWrite(operations);

    return NextResponse.json({
      success: true,
      parsedHitsCount: parsedHits.length,
      upsertedCount: result.upsertedCount + result.modifiedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Telegram import error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

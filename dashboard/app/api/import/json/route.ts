import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, isMongoConfigured, initIndexes } from "@/lib/mongodb";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "MongoDB Atlas is not configured yet. Please set MONGODB_URI in .env.local first." },
      { status: 400 }
    );
  }

  try {
    const rootDir = path.resolve(process.cwd(), "..");
    const levelsPath = path.join(rootDir, "levels_results.json");
    const partialPath = path.join(rootDir, "partial_results.json");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let items: any[] = [];
    let sourceFile = "";

    if (fs.existsSync(levelsPath)) {
      items = JSON.parse(fs.readFileSync(levelsPath, "utf-8"));
      sourceFile = "levels_results.json";
    } else if (fs.existsSync(partialPath)) {
      const p = JSON.parse(fs.readFileSync(partialPath, "utf-8"));
      items = p.results || [];
      sourceFile = "partial_results.json";
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No local JSON extraction files found to import." }, { status: 404 });
    }

    await initIndexes();
    const db = await getDb();

    let importedCount = 0;
    const operations = items
      .filter((item) => item && item.email)
      .map((item) => {
        const email = String(item.email).trim().toLowerCase();
        return {
          updateOne: {
            filter: { email },
            update: {
              $set: {
                email,
                password: item.password || "",
                level: item.level,
                pokeCoins: item.pokeCoins !== undefined && item.pokeCoins !== null ? Number(item.pokeCoins) : 0,
                stardust: item.stardust !== undefined && item.stardust !== null ? Number(item.stardust) : 0,
                itemBag: item.itemBag ?? null,
                pokemonStorage: item.pokemonStorage ?? null,
                isFirstTimeBuyer: item.isFirstTimeBuyer ?? null,
                isNianticKidsUser: Boolean(item.isNianticKidsUser),
                team: item.team ?? "none",
                gameEmail: item.gameEmail || email,
                country: item.country || "",
                error: item.error || null,
                source: "json_import",
                extractedAt: item.extractedAt ? new Date(item.extractedAt) : new Date(),
                updatedAt: new Date(),
              },
            },
            upsert: true,
          },
        };
      });

    if (operations.length > 0) {
      const res = await db.collection("accounts").bulkWrite(operations);
      importedCount = res.upsertedCount + res.modifiedCount;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      totalProcessed: operations.length,
      sourceFile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Import error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

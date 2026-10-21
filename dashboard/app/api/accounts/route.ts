import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { ExtractedAccount, DashboardMetrics } from "@/lib/types";
import fs from "fs";
import path from "path";

// Helper to read fallback accounts from local levels_results.json or partial_results.json
function getLocalFallbackAccounts(): ExtractedAccount[] {
  const rootDir = path.resolve(process.cwd(), "..");
  const levelsPath = path.join(rootDir, "levels_results.json");
  const partialPath = path.join(rootDir, "partial_results.json");

  let rawList: Record<string, unknown>[] = [];

  if (fs.existsSync(levelsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(levelsPath, "utf-8"));
      if (Array.isArray(data)) rawList = data;
    } catch { }
  } else if (fs.existsSync(partialPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(partialPath, "utf-8"));
      if (data && Array.isArray(data.results)) rawList = data.results;
    } catch { }
  }

  return rawList.map((item, idx) => ({
    _id: `local-${idx}`,
    email: String(item.email || ""),
    password: String(item.password || ""),
    level: item.level as number | string,
    pokeCoins: item.pokeCoins !== undefined && item.pokeCoins !== null ? Number(item.pokeCoins) : 0,
    stardust: item.stardust !== undefined && item.stardust !== null ? Number(item.stardust) : 0,
    itemBag: item.itemBag as string | number,
    pokemonStorage: item.pokemonStorage as string | number,
    isFirstTimeBuyer: item.isFirstTimeBuyer as boolean | null,
    isNianticKidsUser: Boolean(item.isNianticKidsUser),
    team: (item.team as string | number) ?? "none",
    gameEmail: String(item.gameEmail || item.email || ""),
    country: String(item.country || ""),
    error: (item.error as string) || null,
    source: "json_import",
    extractedAt: String(item.extractedAt || new Date().toISOString()),
  }));
}

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized access. Please sign in." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const levelTier = searchParams.get("levelTier") || "all";
  const spenderStatus = searchParams.get("spenderStatus") || "all";
  const team = searchParams.get("team") || "all";
  const sortBy = searchParams.get("sortBy") || "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "40", 10)));
  const since = searchParams.get("since");

  let allAccounts: ExtractedAccount[] = [];
  let isFromDatabase = false;

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: Record<string, any> = {};

      if (since) {
        const sinceDate = new Date(since);
        if (!isNaN(sinceDate.getTime())) {
          query.extractedAt = { $gt: sinceDate };
        }
      }

      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { gameEmail: { $regex: search, $options: "i" } },
          { country: { $regex: search, $options: "i" } },
        ];
      }

      if (levelTier === "50") {
        query.level = { $gte: 50 };
      } else if (levelTier === "40") {
        query.level = { $gte: 40 };
      } else if (levelTier === "30") {
        query.level = { $gte: 30 };
      } else if (levelTier === "failed") {
        query.level = { $type: "string" };
      } else {
        // Default: display all verified working hits
        query.level = { $type: "number" };
      }

      if (spenderStatus === "spenders") {
        query.isFirstTimeBuyer = false;
      } else if (spenderStatus === "first_time") {
        query.isFirstTimeBuyer = true;
      }

      if (team !== "all") {
        if (team === "none") {
          query.$or = [{ team: { $in: [0, "0", "none", "None", null] } }, { team: { $exists: false } }];
        } else {
          query.team = { $regex: team, $options: "i" };
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let sortConfig: Record<string, any> = { extractedAt: -1 };
      if (sortBy === "level_desc") {
        sortConfig = { level: -1 };
      } else if (sortBy === "coins_desc") {
        sortConfig = { pokeCoins: -1 };
      } else if (sortBy === "stardust_desc") {
        sortConfig = { stardust: -1 };
      }

      const totalMatching = await db.collection("accounts").countDocuments(query);
      const docs = await db
        .collection("accounts")
        .find(query)
        .sort(sortConfig)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      allAccounts = docs.map((d) => ({
        _id: d._id.toString(),
        email: d.email,
        password: d.password,
        level: d.level,
        pokeCoins: d.pokeCoins ?? 0,
        stardust: d.stardust ?? 0,
        itemBag: d.itemBag,
        pokemonStorage: d.pokemonStorage,
        isFirstTimeBuyer: d.isFirstTimeBuyer,
        isNianticKidsUser: d.isNianticKidsUser,
        team: d.team,
        gameEmail: d.gameEmail,
        country: d.country,
        error: d.error,
        source: d.source || "live_checker",
        extractedAt: d.extractedAt ? new Date(d.extractedAt).toISOString() : undefined,
      }));

      // Calculate global metrics from database
      const [metricsDoc] = await db.collection("accounts").aggregate([
        {
          $group: {
            _id: null,
            totalChecked: { $sum: 1 },
            successfulHits: {
              $sum: { $cond: [{ $isNumber: "$level" }, 1, 0] }
            },
            highLevelCount: {
              $sum: { $cond: [{ $and: [{ $isNumber: "$level" }, { $gte: ["$level", 40] }] }, 1, 0] }
            },
            maxLevelCount: {
              $sum: { $cond: [{ $and: [{ $isNumber: "$level" }, { $gte: ["$level", 50] }] }, 1, 0] }
            },
            priorBuyersCount: {
              $sum: { $cond: [{ $eq: ["$isFirstTimeBuyer", false] }, 1, 0] }
            },
            totalCoins: { $sum: { $ifNull: ["$pokeCoins", 0] } },
            totalStardust: { $sum: { $ifNull: ["$stardust", 0] } },
            mysticCount: {
              $sum: { $cond: [{ $and: [{ $isNumber: "$level" }, { $in: ["$team", ["Mystic", "mystic", "1", 1]] }] }, 1, 0] }
            },
            valorCount: {
              $sum: { $cond: [{ $and: [{ $isNumber: "$level" }, { $in: ["$team", ["Valor", "valor", "2", 2]] }] }, 1, 0] }
            },
            instinctCount: {
              $sum: { $cond: [{ $and: [{ $isNumber: "$level" }, { $in: ["$team", ["Instinct", "instinct", "3", 3]] }] }, 1, 0] }
            },
          }
        }
      ]).toArray();

      const metrics: DashboardMetrics = metricsDoc ? {
        totalChecked: metricsDoc.totalChecked || 0,
        successfulHits: metricsDoc.successfulHits || 0,
        highLevelCount: metricsDoc.highLevelCount || 0,
        maxLevelCount: metricsDoc.maxLevelCount || 0,
        priorBuyersCount: metricsDoc.priorBuyersCount || 0,
        totalCoins: metricsDoc.totalCoins || 0,
        totalStardust: metricsDoc.totalStardust || 0,
        teamBreakdown: {
          mystic: metricsDoc.mysticCount || 0,
          valor: metricsDoc.valorCount || 0,
          instinct: metricsDoc.instinctCount || 0,
          none: Math.max(0, (metricsDoc.successfulHits || 0) - (metricsDoc.mysticCount || 0) - (metricsDoc.valorCount || 0) - (metricsDoc.instinctCount || 0)),
        },
      } : {
        totalChecked: totalMatching,
        successfulHits: totalMatching,
        highLevelCount: 0,
        maxLevelCount: 0,
        priorBuyersCount: 0,
        totalCoins: 0,
        totalStardust: 0,
        teamBreakdown: { mystic: 0, valor: 0, instinct: 0, none: 0 },
      };

      return NextResponse.json({
        accounts: allAccounts,
        total: totalMatching,
        page,
        limit,
        totalPages: Math.ceil(totalMatching / limit),
        metrics,
        source: "mongodb_atlas",
      });
    } catch (dbErr) {
      console.warn("MongoDB query failed, falling back to local files:", dbErr);
    }
  }

  // Fallback to local files if MongoDB is not active
  allAccounts = getLocalFallbackAccounts();
  isFromDatabase = false;

  // Filter in memory for fallback
  let filtered = allAccounts.filter((acc) => {
    if (search) {
      const s = search.toLowerCase();
      const match =
        acc.email.toLowerCase().includes(s) ||
        (acc.gameEmail && acc.gameEmail.toLowerCase().includes(s)) ||
        (acc.country && acc.country.toLowerCase().includes(s));
      if (!match) return false;
    }

    const numLvl = Number(acc.level);
    const isNum = !isNaN(numLvl);

    if (levelTier === "50" && numLvl !== 50) return false;
    if (levelTier === "40" && (!isNum || numLvl < 40)) return false;
    if (levelTier === "30" && (!isNum || numLvl < 30)) return false;
    if (levelTier === "failed" && isNum) return false;

    if (spenderStatus === "spenders" && acc.isFirstTimeBuyer !== false) return false;
    if (spenderStatus === "first_time" && acc.isFirstTimeBuyer !== true) return false;

    if (team !== "all") {
      const t = String(acc.team || "").toLowerCase();
      if (team === "none" && (t !== "none" && t !== "0" && t !== "")) return false;
      if (team !== "none" && !t.includes(team)) return false;
    }

    return true;
  });

  // Sort
  if (sortBy === "level_desc") {
    filtered.sort((a, b) => Number(b.level || 0) - Number(a.level || 0));
  } else if (sortBy === "coins_desc") {
    filtered.sort((a, b) => Number(b.pokeCoins || 0) - Number(a.pokeCoins || 0));
  } else if (sortBy === "stardust_desc") {
    filtered.sort((a, b) => Number(b.stardust || 0) - Number(a.stardust || 0));
  }

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const successful = allAccounts.filter((a) => !isNaN(Number(a.level)));
  const metrics: DashboardMetrics = {
    totalChecked: allAccounts.length,
    successfulHits: successful.length,
    highLevelCount: successful.filter((a) => Number(a.level) >= 40).length,
    maxLevelCount: successful.filter((a) => Number(a.level) === 50).length,
    priorBuyersCount: successful.filter((a) => a.isFirstTimeBuyer === false).length,
    totalCoins: successful.reduce((acc, curr) => acc + (Number(curr.pokeCoins) || 0), 0),
    totalStardust: successful.reduce((acc, curr) => acc + (Number(curr.stardust) || 0), 0),
    teamBreakdown: {
      mystic: successful.filter((a) => String(a.team).toLowerCase().includes("mystic") || a.team === "1").length,
      valor: successful.filter((a) => String(a.team).toLowerCase().includes("valor") || a.team === "2").length,
      instinct: successful.filter((a) => String(a.team).toLowerCase().includes("instinct") || a.team === "3").length,
      none: successful.filter((a) => !a.team || a.team === "0" || a.team === "none").length,
    },
  };

  return NextResponse.json({
    accounts: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    metrics,
    source: isFromDatabase ? "mongodb_atlas" : "local_file_fallback",
  });
}

export interface ExtractedAccount {
  _id?: string;
  email: string;
  password?: string;
  level: number | string;
  pokeCoins?: number | null;
  stardust?: number | null;
  itemBag?: string | number | null;
  pokemonStorage?: string | number | null;
  isFirstTimeBuyer?: boolean | null;
  isNianticKidsUser?: boolean;
  team?: string | number;
  gameEmail?: string;
  country?: string;
  error?: string | null;
  source?: "live_checker" | "telegram_sync" | "json_import";
  extractedAt?: string;
  updatedAt?: string;

  // Review & Verification Fields
  isChecked?: boolean;
  isLiked?: boolean;
  reviewNote?: string;
  reviewStatus?: "verified" | "high_value" | "flagged" | "dead" | string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface DashboardMetrics {
  totalChecked: number;
  successfulHits: number;
  highLevelCount: number; // level >= 40
  maxLevelCount: number;  // level === 50
  priorBuyersCount: number;
  totalCoins: number;
  totalStardust: number;
  teamBreakdown: {
    mystic: number;
    valor: number;
    instinct: number;
    none: number;
  };
}

export interface FilterOptions {
  search: string;
  levelTier: "all" | "50" | "40" | "30" | "failed";
  spenderStatus: "all" | "spenders" | "first_time" | "unknown";
  team: "all" | "mystic" | "valor" | "instinct" | "none";
  sortBy: "newest" | "level_desc" | "coins_desc" | "stardust_desc";
  reviewFilter?: "all" | "checked" | "liked" | "unreviewed";
  page: number;
  limit: number;
}

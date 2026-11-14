import { PANDASCORE_TOKEN } from "./config";

// Global in-memory cache for SSR Node.js server to avoid rate limiting
const MEMORY_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes global cache

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs = CACHE_TTL_MS): Promise<T> {
  const cached = MEMORY_CACHE.get(key);
  const now = Date.now();
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }
  try {
    const data = await fetcher();
    MEMORY_CACHE.set(key, { data, timestamp: now });
    return data;
  } catch (err) {
    if (cached) {
      console.warn(`[PandaScore] API error for key ${key}, falling back to stale cache:`, err);
      return cached.data;
    }
    throw err;
  }
}

export interface PandaScoreMatch {
  id: number;
  name: string;
  status: "not_started" | "running" | "finished" | "canceled";
  begin_at: string | null;
  end_at: string | null;
  scheduled_at: string | null;
  number_of_games: number;
  match_type: string;
  streams_list: {
    language: string;
    raw_url: string | null;
    embed_url: string | null;
    official: boolean;
  }[];
}

export async function fetchTournamentTeamsAndPlayers(tournamentId: number): Promise<any[]> {
  try {
    const res = await fetch(`https://api.pandascore.co/tournaments/${tournamentId}/teams`, {
      headers: {
        Authorization: `Bearer ${PANDASCORE_TOKEN}`,
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[PandaScore] fetch teams failed for tournament ${tournamentId}:`, err);
    return [];
  }
}

export interface PandaScoreTournament {
  id: number;
  name: string;
  begin_at: string | null;
  end_at: string | null;
  league: {
    id: number;
    name: string;
    image_url: string | null;
    url: string | null;
  };
  serie: {
    id: number;
    name: string;
    full_name: string | null;
    year: number | null;
  } | null;
  videogame: {
    id: number;
    name: string;
    slug: string;
  };
  tier: string | null;
  matches: PandaScoreMatch[];
}

export interface TournamentEvent {
  id: number;
  game: "cs2" | "valorant" | "lol" | "r6";
  gameName: string;
  tournamentName: string;
  serieName: string;
  leagueName: string;
  leagueImage: string | null;
  beginAt: string | null;
  endAt: string | null;
  status: "upcoming" | "running" | "finished";
  tier: string | null;
  matchCount: number;
  runningMatches: number;
  url: string | null;
}

export interface MatchEvent {
  id: number;
  game: "cs2" | "valorant" | "lol" | "r6";
  gameName: string;
  name: string;
  status: "not_started" | "running" | "finished" | "canceled";
  beginAt: string | null;
  scheduledAt: string | null;
  tournamentName: string;
  leagueName: string;
  leagueImage: string | null;
  numberOfGames: number;
  tier: string | null;
  opponents: {
    name: string;
    acronym: string;
    imageUrl: string | null;
    winner: boolean;
  }[];
  scoreA: number;
  scoreB: number;
}

const GAME_SLUGS: Record<string, { slug: string; name: string }> = {
  cs2: { slug: "csgo", name: "CS2" },
  valorant: { slug: "valorant", name: "特戰英豪" },
  lol: { slug: "lol", name: "英雄聯盟" },
  r6: { slug: "r6siege", name: "虹彩六號" },
};

const PANDASCORE_HEADERS = {
  Authorization: `Bearer ${PANDASCORE_TOKEN}`,
  Accept: "application/json",
} as const;

async function pandascoreGet<T>(url: string, label: string): Promise<T[]> {
  try {
    const res = await fetch(url, {
      headers: PANDASCORE_HEADERS,
      next: { revalidate: 900 },
    });
    if (!res.ok) {
      console.error(`[PandaScore] ${label} failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[PandaScore] ${label} exception:`, err);
    return [];
  }
}

function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  const unique: T[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  }
  return unique;
}

async function fetchTournamentsForGame(
  gameKey: string
): Promise<PandaScoreTournament[]> {
  const config = GAME_SLUGS[gameKey];
  if (!config) return [];

  // CS2 仍走 /csgo/（PandaScore 舊路徑）。預設 /tournaments 等於 upcoming，
  // 進行中的階段（例如 BLAST Open Playoffs）只出現在 /tournaments/running。
  const [upcoming, running, past] = await Promise.all([
    pandascoreGet<PandaScoreTournament>(
      `https://api.pandascore.co/${config.slug}/tournaments/upcoming?per_page=50`,
      `${gameKey} tournaments/upcoming`,
    ),
    pandascoreGet<PandaScoreTournament>(
      `https://api.pandascore.co/${config.slug}/tournaments/running?per_page=50`,
      `${gameKey} tournaments/running`,
    ),
    pandascoreGet<PandaScoreTournament>(
      `https://api.pandascore.co/${config.slug}/tournaments/past?per_page=50`,
      `${gameKey} tournaments/past`,
    ),
  ]);

  return dedupeById([...running, ...upcoming, ...past]);
}

function matchListPath(status?: string): string {
  if (status === "running") return "matches/running";
  if (status === "not_started" || status === "upcoming") return "matches/upcoming";
  if (status === "finished") return "matches/past";
  return "matches";
}

async function fetchMatchesForGame(
  gameKey: string,
  status?: string
): Promise<any[]> {
  const config = GAME_SLUGS[gameKey];
  if (!config) return [];

  return pandascoreGet<any>(
    `https://api.pandascore.co/${config.slug}/${matchListPath(status)}?per_page=50`,
    `${gameKey} ${matchListPath(status)}`,
  );
}

const DISPLAY_TIERS = new Set(["s", "a", "b", "c"]);

async function fetchPastMatchesForRunningTournaments(
  gameKey: string,
  tournaments: PandaScoreTournament[],
): Promise<any[]> {
  const config = GAME_SLUGS[gameKey];
  if (!config) return [];

  const ids = tournaments
    .filter((t) => {
      const tier = (t.tier || "").toLowerCase();
      return DISPLAY_TIERS.has(tier) && determineTournamentStatus(t) === "running";
    })
    .map((t) => t.id);
  if (ids.length === 0) return [];

  return pandascoreGet<any>(
    `https://api.pandascore.co/${config.slug}/matches/past?filter[tournament_id]=${ids.join(",")}&per_page=50`,
    `${gameKey} matches/past by running tournaments`,
  );
}

// 匯出僅為了讓 pandascore.test.ts 能直接測這段分支，執行期沒有其他呼叫端。
export function determineTournamentStatus(
  tournament: PandaScoreTournament
): "upcoming" | "running" | "finished" {
  const now = new Date();
  const begin = tournament.begin_at ? new Date(tournament.begin_at) : null;
  const end = tournament.end_at ? new Date(tournament.end_at) : null;

  // 如果有進行中的比賽 → 進行中
  const hasRunning = tournament.matches.some((m) => m.status === "running");
  if (hasRunning) return "running";

  // 如果已過結束時間
  if (end && now > end) {
    // 但還有未開始的比賽 → 可能是延期，標為進行中
    const hasUpcoming = tournament.matches.some(
      (m) => m.status === "not_started"
    );
    if (hasUpcoming) return "running";
    // 全部結束 → 已完結
    return "finished";
  }

  // 如果已過開始時間 → 應該是進行中（除非全部已完結）
  if (begin && now >= begin) {
    // [].every() 對空陣列是 true；賽程還沒灌進來時不能當成已完賽。
    if (tournament.matches.length === 0) return "running";
    const allFinished = tournament.matches.every(
      (m) => m.status === "finished" || m.status === "canceled"
    );
    if (allFinished) return "finished";
    return "running";
  }

  // 還沒到開始時間 → 即將開始
  return "upcoming";
}

function transformTournament(
  tournament: PandaScoreTournament,
  gameKey: string
): TournamentEvent {
  const gameConfig = GAME_SLUGS[gameKey];
  const status = determineTournamentStatus(tournament);
  const runningMatches = tournament.matches.filter(
    (m) => m.status === "running"
  ).length;

  return {
    id: tournament.id,
    game: gameKey as "cs2" | "valorant" | "lol" | "r6",
    gameName: gameConfig.name,
    tournamentName: tournament.name,
    serieName: tournament.serie?.full_name || tournament.serie?.name || "",
    leagueName: tournament.league?.name || "",
    leagueImage: tournament.league?.image_url || null,
    beginAt: tournament.begin_at,
    endAt: tournament.end_at,
    status,
    tier: tournament.tier,
    matchCount: tournament.matches.length,
    runningMatches,
    url: tournament.league?.url || null,
  };
}

const STAGE_KEYWORDS = [
  "group",
  "playoffs",
  "play-in",
  "stage",
  "qualifier",
  "finals",
  "semifinals",
  "quarterfinals",
  "round",
  "bracket",
  "swiss",
];

function isStageName(name: string): boolean {
  const lower = name.toLowerCase();
  return STAGE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function resolveGroupedStatus(
  group: TournamentEvent[],
  runningMatches: number,
): TournamentEvent["status"] {
  if (runningMatches > 0) return "running";
  if (group.some((e) => e.status === "running")) return "running";
  const hasFinished = group.some((e) => e.status === "finished");
  const hasUpcoming = group.some((e) => e.status === "upcoming");
  if (hasFinished && hasUpcoming) return "running";
  if (hasFinished && !hasUpcoming) return "finished";
  if (hasUpcoming) return "upcoming";
  return group[0]?.status ?? "upcoming";
}

/** 把同一 serie+league 的階段（小組／決賽）合成一張賽事卡。 */
export function mergeStageGroup(group: TournamentEvent[]): TournamentEvent {
  if (group.length === 1) return group[0];

  const allStage = group.every((e) => isStageName(e.tournamentName));
  const sorted = [...group].sort((a, b) => {
    if (!allStage) {
      const aIsStage = isStageName(a.tournamentName) ? 1 : 0;
      const bIsStage = isStageName(b.tournamentName) ? 1 : 0;
      if (aIsStage !== bIsStage) return aIsStage - bIsStage;
    }
    return b.matchCount - a.matchCount;
  });
  const representative = sorted[0];
  const begins = group.map((e) => e.beginAt).filter(Boolean) as string[];
  const ends = group.map((e) => e.endAt).filter(Boolean) as string[];
  const runningMatches = group.reduce((sum, e) => sum + e.runningMatches, 0);

  return {
    ...representative,
    matchCount: group.reduce((sum, e) => sum + e.matchCount, 0),
    runningMatches,
    beginAt: begins.length > 0 ? [...begins].sort()[0] : null,
    endAt: ends.length > 0 ? [...ends].sort().reverse()[0] : null,
    status: resolveGroupedStatus(group, runningMatches),
  };
}

export function matchScoresFromResults(
  results: { team_id?: number; score?: number }[] | undefined,
  opponentIds: (number | undefined)[],
): { scoreA: number; scoreB: number } {
  if (!results || results.length < 2) {
    return { scoreA: 0, scoreB: 0 };
  }
  const aId = opponentIds[0];
  const bId = opponentIds[1];
  if (aId != null && bId != null) {
    const byId = new Map<number, number>();
    for (const row of results) {
      if (row.team_id != null) byId.set(row.team_id, row.score ?? 0);
    }
    if (byId.has(aId) || byId.has(bId)) {
      return { scoreA: byId.get(aId) ?? 0, scoreB: byId.get(bId) ?? 0 };
    }
  }
  return { scoreA: results[0]?.score || 0, scoreB: results[1]?.score || 0 };
}

function tournamentFromMatch(match: any, gameKey: string): PandaScoreTournament {
  return {
    id: match.tournament?.id ?? match.tournament_id ?? 0,
    name: match.tournament?.name || "Unknown",
    begin_at: match.tournament?.begin_at ?? null,
    end_at: match.tournament?.end_at ?? null,
    league: match.league ?? { id: 0, name: "Unknown", image_url: null, url: null },
    serie: match.serie ?? null,
    videogame: match.videogame ?? { id: 0, name: gameKey, slug: gameKey },
    tier: match.tournament?.tier ?? null,
    matches: [match],
  };
}

function transformMatch(
  match: any,
  tournament: PandaScoreTournament,
  gameKey: string
): MatchEvent {
  const gameConfig = GAME_SLUGS[gameKey];
  const winnerId = match.winner_id;
  const opponentRows = match.opponents || [];
  const opponents = opponentRows.map((o: any) => ({
    name: o.opponent?.name || "",
    acronym: o.opponent?.acronym || "",
    imageUrl: o.opponent?.image_url || null,
    winner: o.opponent?.id === winnerId,
  }));

  let { scoreA, scoreB } = matchScoresFromResults(
    match.results,
    opponentRows.map((o: any) => o.opponent?.id as number | undefined),
  );
  if (
    (!match.results || match.results.length < 2) &&
    match.number_of_games &&
    winnerId &&
    opponents.length === 2
  ) {
    const totalGames = match.number_of_games;
    const winThreshold = Math.ceil(totalGames / 2);
    if (opponents[0].winner) {
      scoreA = winThreshold;
      scoreB = totalGames - winThreshold;
    } else if (opponents[1].winner) {
      scoreA = totalGames - winThreshold;
      scoreB = winThreshold;
    }
  }

  const serie = match.serie || tournament.serie;
  const league = match.league || tournament.league;
  const tournamentName = match.tournament?.name || tournament.name;
  const tier = match.tournament?.tier || tournament.tier;

  return {
    id: match.id,
    game: gameKey as "cs2" | "valorant" | "lol" | "r6",
    gameName: gameConfig.name,
    name: match.name,
    status: match.status,
    beginAt: match.begin_at,
    scheduledAt: match.scheduled_at,
    tournamentName: serie?.full_name
      ? `${serie.full_name} — ${tournamentName}`
      : serie?.name
        ? `${serie.name} — ${tournamentName}`
        : tournamentName,
    leagueName: league?.name || "",
    leagueImage: league?.image_url || null,
    numberOfGames: match.number_of_games,
    tier,
    opponents,
    scoreA,
    scoreB,
  };
}

export async function fetchAllTournamentEvents(): Promise<{
  upcoming: TournamentEvent[];
  running: TournamentEvent[];
  finished: TournamentEvent[];
}> {
  return cachedFetch("all_tournament_events", async () => {
    const allGames = ["cs2", "valorant", "lol", "r6"];

    const results = await Promise.all(
      allGames.map((game) => fetchTournamentsForGame(game))
    );

  const allEvents: TournamentEvent[] = [];

  for (let i = 0; i < allGames.length; i++) {
    const gameKey = allGames[i];
    const tournaments = results[i];
    for (const tournament of tournaments) {
      allEvents.push(transformTournament(tournament, gameKey));
    }
  }

  // Group by parent tournament (serie + league), keep only the main one (not Group/Stage/Playoffs)
  const grouped = new Map<string, TournamentEvent[]>();
  for (const event of allEvents) {
    const key = `${event.game}::${event.serieName}::${event.leagueName}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(event);
  }

  const deduped: TournamentEvent[] = [];
  for (const group of grouped.values()) {
    deduped.push(mergeStageGroup(group));
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filtered = deduped.filter((e) => {
    if (e.status === "finished") {
      const end = e.endAt ? new Date(e.endAt) : null;
      return !end || end >= cutoff;
    }
    return true;
  });

  const tierOrder: Record<string, number> = {
    s: 0,
    a: 1,
    b: 2,
    c: 3,
  };

  const gameOrder: Record<string, number> = {
    cs2: 0,
    valorant: 1,
    lol: 2,
    r6: 3,
  };

  const sortByTier = (a: TournamentEvent, b: TournamentEvent) => {
    const ta = (a.tier || "z").toLowerCase();
    const tb = (b.tier || "z").toLowerCase();
    const ra = tierOrder[ta] ?? 999;
    const rb = tierOrder[tb] ?? 999;
    if (ra !== rb) return ra - rb;
    // Same tier: CS2 first
    const ga = gameOrder[a.game] ?? 999;
    const gb = gameOrder[b.game] ?? 999;
    if (ga !== gb) return ga - gb;
    // Same tier & game: sort by begin date
    const da = a.beginAt ? new Date(a.beginAt).getTime() : Infinity;
    const db = b.beginAt ? new Date(b.beginAt).getTime() : Infinity;
    return da - db;
  };

  const running = filtered
    .filter((e) => e.status === "running")
    .sort(sortByTier);

  const upcoming = filtered
    .filter((e) => e.status === "upcoming")
    .sort(sortByTier);

  const finished = filtered
    .filter((e) => e.status === "finished")
    .sort((a, b) => {
      const ta = (a.tier || "z").toLowerCase();
      const tb = (b.tier || "z").toLowerCase();
      const ra = tierOrder[ta] ?? 999;
      const rb = tierOrder[tb] ?? 999;
      if (ra !== rb) return ra - rb;
      // Same tier: newest finished first
      const da = a.endAt ? new Date(a.endAt).getTime() : 0;
      const db = b.endAt ? new Date(b.endAt).getTime() : 0;
      return db - da;
    });

    return { upcoming, running, finished };
  });
}

export async function fetchAllMatches(): Promise<{
  running: MatchEvent[];
  upcoming: MatchEvent[];
  finished: MatchEvent[];
}> {
  return cachedFetch("all_matches", async () => {
    const allGames = ["cs2", "valorant", "lol", "r6"];

    const tournamentResults = await Promise.all(
      allGames.map((game) => fetchTournamentsForGame(game))
    );

  const runningMatchResults = await Promise.all(
    allGames.map((game) => fetchMatchesForGame(game, "running"))
  );

  const upcomingMatchResults = await Promise.all(
    allGames.map((game) => fetchMatchesForGame(game, "not_started"))
  );

  const finishedMatchResults = await Promise.all(
    allGames.map((game) => fetchMatchesForGame(game, "finished"))
  );

  const extraFinishedResults = await Promise.all(
    allGames.map((game, i) =>
      fetchPastMatchesForRunningTournaments(game, tournamentResults[i]),
    ),
  );

  const running: MatchEvent[] = [];
  const upcoming: MatchEvent[] = [];
  const finished: MatchEvent[] = [];

  const resolveTournament = (
    match: any,
    tournaments: PandaScoreTournament[],
    gameKey: string,
  ): PandaScoreTournament => {
    const tournamentId = match.tournament_id ?? match.tournament?.id;
    const found =
      tournaments.find((t) => t.id === tournamentId) ||
      tournaments.find((t) => t.matches.some((m) => m.id === match.id));
    return found ?? tournamentFromMatch(match, gameKey);
  };

  for (let i = 0; i < allGames.length; i++) {
    const gameKey = allGames[i];

    for (const match of runningMatchResults[i]) {
      running.push(
        transformMatch(match, resolveTournament(match, tournamentResults[i], gameKey), gameKey),
      );
    }

    for (const match of upcomingMatchResults[i]) {
      upcoming.push(
        transformMatch(match, resolveTournament(match, tournamentResults[i], gameKey), gameKey),
      );
    }

    const finishedRaw = dedupeById([
      ...extraFinishedResults[i],
      ...finishedMatchResults[i],
    ]);
    for (const match of finishedRaw) {
      finished.push(
        transformMatch(match, resolveTournament(match, tournamentResults[i], gameKey), gameKey),
      );
    }
  }

  running.sort((a, b) => {
    const da = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
    const db = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
    return da - db;
  });

  upcoming.sort((a, b) => {
    const da = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
    const db = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
    return da - db;
  });

    finished.sort((a, b) => {
      const da = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
      const db = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
      return db - da;
    });

    return { running, upcoming, finished };
  });
}

export function formatTournamentDate(beginAt: string | null, endAt: string | null): string {
  if (!beginAt) return "日期待定";

  const begin = new Date(beginAt);
  const now = new Date();
  const diffMs = begin.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // 已經開始或今天開始 → 進行中
  if (diffDays <= 0) return "進行中";
  if (diffDays === 1) return "明天";
  if (diffDays <= 7) return `${diffDays} 天後`;

  return new Intl.DateTimeFormat("zh-TW", {
    month: "short",
    day: "numeric",
  }).format(begin);
}

export function formatMatchDate(scheduledAt: string | null): string {
  if (!scheduledAt) return "日期待定";

  const date = new Date(scheduledAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours <= 0) return "進行中";
  if (diffHours < 24) return `${diffHours} 小時後`;
  if (diffDays === 1) return "明天";
  if (diffDays <= 7) return `${diffDays} 天後`;

  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Absolute match datetime in Asia/Taipei, e.g. `8/24 21:30`. */
export function formatMatchDateTimeTaipei(scheduledAt: string | null): string {
  if (!scheduledAt) return "時間待定";
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return "時間待定";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function getGameColor(game: string): string {
  switch (game) {
    case "cs2":
      return "#f59e0b";
    case "valorant":
      return "#ef4444";
    case "lol":
      return "#3b82f6";
    case "r6":
      return "#a855f7";
    default:
      return "#6b7280";
  }
}

export async function fetchEWCTeamsAndPlayers(game: string): Promise<any[]> {
  const config = GAME_SLUGS[game];
  if (!config) return [];
  
  try {
    // Cache for 24 hours (86400 seconds) to avoid consuming paid API quota
    const [activeRes, pastRes] = await Promise.all([
      fetch(`https://api.pandascore.co/${config.slug}/tournaments?per_page=50`, {
        headers: {
          Authorization: `Bearer ${PANDASCORE_TOKEN}`,
          Accept: "application/json",
        },
        next: { revalidate: 86400 },
      }),
      fetch(`https://api.pandascore.co/${config.slug}/tournaments/past?per_page=50`, {
        headers: {
          Authorization: `Bearer ${PANDASCORE_TOKEN}`,
          Accept: "application/json",
        },
        next: { revalidate: 86400 },
      })
    ]);

    const activeTours = activeRes.ok ? await activeRes.json() : [];
    const pastTours = pastRes.ok ? await pastRes.json() : [];
    const tournaments = [
      ...(Array.isArray(activeTours) ? activeTours : []),
      ...(Array.isArray(pastTours) ? pastTours : [])
    ];
    
    // Find EWC tournaments, prioritize EWC 2024 or main stage
    const ewcTournaments = tournaments.filter(t => {
      const str = `${t.name} ${t.serie?.full_name || ''} ${t.league?.name || ''}`.toLowerCase();
      // Ensure we look for main stages, excluding qualifiers if possible unless nothing else exists
      return (str.includes("esports world cup") || str.includes("ewc")) && !str.includes("qualifier");
    });
    
    // If no non-qualifiers, fallback to any EWC stage
    const matchedTours = ewcTournaments.length > 0 ? ewcTournaments : tournaments.filter(t => {
      const str = `${t.name} ${t.serie?.full_name || ''} ${t.league?.name || ''}`.toLowerCase();
      return str.includes("esports world cup") || str.includes("ewc");
    });

    if (matchedTours.length === 0) return [];
    
    // Query teams for matched EWC tournaments in parallel, cached for 24 hours
    const results = await Promise.all(
      matchedTours.map(async (t) => {
        try {
          const res = await fetch(`https://api.pandascore.co/tournaments/${t.id}/teams`, {
            headers: {
              Authorization: `Bearer ${PANDASCORE_TOKEN}`,
              Accept: "application/json",
            },
            next: { revalidate: 86400 },
          });
          const teams = res.ok ? await res.json() : [];
          return { tournament: t, teams: Array.isArray(teams) ? teams : [] };
        } catch {
          return { tournament: t, teams: [] };
        }
      })
    );
    
    const sorted = results.sort((a, b) => b.teams.length - a.teams.length);
    return sorted[0] ? sorted[0].teams : [];
  } catch (err) {
    console.error(`[PandaScore] fetchEWCTeamsAndPlayers failed for ${game}:`, err);
    return [];
  }
}

"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import type {
  TournamentEvent,
  MatchEvent,
} from "@/lib/pandascore";
import {
  formatTournamentDate,
  formatMatchDate,
} from "@/lib/pandascore";

interface TournamentSidebarProps {
  upcoming: TournamentEvent[];
  running: TournamentEvent[];
  finished: TournamentEvent[];
}

interface MatchSidebarProps {
  upcoming: MatchEvent[];
  running: MatchEvent[];
  finished: MatchEvent[];
}

// Game logos with dark/light variants
const GAME_LOGOS: Record<string, string> = {
  cs2: "/cs2v2.webp",
  valorant: "/valorantct.png",
  lol: "/lolesports.png",
  r6: "/rainbow6.png",
};

// Global league logo overrides (independent of game)
const GLOBAL_LEAGUE_OVERRIDES: Record<string, string> = {
  "esports world cup": "/event/esportsworldcup.png",
  "esports world": "/event/esportsworldcup.png",
  "esports nations cup": "/event/esportsnationscup.webp",
  "esports nation": "/event/esportsnationscup.webp",
};

// League logo overrides grouped by game slug
const GAME_LEAGUE_OVERRIDES: Record<string, Record<string, string>> = {
  lol: {
    lck: "/event/lck.png",
    lcs: "/event/lol-lcs.png",
    lec: "/event/lol-lec.png",
    lpl: "/event/lol-lpl.png",
    cblol: "/event/lol-cblol.png",
    lcp: "/event/lol-lcp.png",
    msi: "/event/lol-msi.webp",
    "mid-season invitational": "/event/lol-msi.webp",
    worlds: "/event/lol-worlds.png",
  },
  valorant: {
    "vct americas": "/event/vct-america.avif",
    "vct champions": "/event/vct-champion.avif",
    "vct cn": "/event/vct-cn.avif",
    "vct emea": "/event/vct-emea.avif",
    "game changers": "/event/vct-gamechanger.avif",
    "vct game changers": "/event/vct-gamechanger.avif",
    master: "/event/vct-master.avif",
    masters: "/event/vct-master.avif",
    "vct masters": "/event/vct-master.avif",
    "vct pacific": "/event/vct-pacific.avif",
    vcl: "/event/vct-vcl.avif",
    champions: "/event/vct-champion.avif",
    challengers: "/event/vct-vcl.avif",
    vct: "/event/vct-general.png",
  },
  cs2: {
    blast: "/event/blast.svg",
    pgl: "/event/pgl.webp",
    iem: "/event/iem.webp",
  },
  r6: {
    "north america league": "/event/r6-nal.png",
    "south america league": "/event/r6-sal.png",
    "asia pacific league": "/event/r6-apac.png",
    "europe mena league": "/event/r6-eml.png",
    eml: "/event/r6-eml.png",
    cnl: "/event/r6-cnl.png",
    apac: "/event/r6-apac.png",
    nal: "/event/r6-nal.png",
    sal: "/event/r6-sal.png",
  },
};

function getLeagueLogoUrl(
  url: string | null,
  name: string,
  game: string,
  tournamentName?: string | null,
): string | null {
  const searchStr = `${name} ${tournamentName || ""}`.toLowerCase();

  // 1. Check global overrides first (multi-game events like Esports World Cup)
  for (const [key, overrideUrl] of Object.entries(GLOBAL_LEAGUE_OVERRIDES)) {
    if (searchStr.includes(key)) {
      return overrideUrl;
    }
  }

  // 2. Check game-specific overrides
  const overrides = GAME_LEAGUE_OVERRIDES[game.toLowerCase()];
  if (overrides) {
    for (const [key, overrideUrl] of Object.entries(overrides)) {
      if (searchStr.includes(key)) {
        return overrideUrl;
      }
    }
  }

  // Fallback to API-provided league image
  if (url) return url;
  // Final fallback to game logo
  return GAME_LOGOS[game] || null;
}

function LeagueLogo({
  url,
  name,
  game,
  tournamentName,
}: {
  url: string | null;
  name: string;
  game: string;
  tournamentName?: string | null;
}) {
  const src = getLeagueLogoUrl(url, name, game, tournamentName);
  const isOverride =
    !!src &&
    (Object.values(GLOBAL_LEAGUE_OVERRIDES).includes(src) ||
      Object.values(GAME_LEAGUE_OVERRIDES).some((overrides) =>
        Object.values(overrides).includes(src),
      ));
  const isApi = !!url && src === url;
  const isFallback = !isOverride && !isApi;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`w-5 h-5 object-contain rounded-sm ${isFallback ? "brightness-0 dark:invert" : ""}`}
      />
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-[7px] font-bold text-zinc-500 dark:text-zinc-400">
      {name?.slice(0, 1) || "?"}
    </div>
  );
}

function TeamLogo({ url, acronym }: { url: string | null; acronym: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={acronym}
        className="w-5 h-5 object-contain rounded-sm"
      />
    );
  }
  if (acronym === "TBD") {
    return (
      <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
        <span className="text-[7px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
          TBD
        </span>
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-[8px] font-bold text-zinc-500 dark:text-zinc-400">
      {acronym?.slice(0, 2) || "?"}
    </div>
  );
}

/* ─── Toggle Tabs (small, right-aligned) ─── */
function SidebarTabs({
  active,
  onChange,
}: {
  active: "live" | "finished";
  onChange: (v: "live" | "finished") => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 w-fit">
      <button
        onClick={() => onChange("live")}
        className={`text-[9px] font-bold uppercase tracking-wider py-1 px-2 rounded-md transition-colors ${
          active === "live"
            ? "bg-white dark:bg-zinc-700 text-red-500 shadow-sm"
            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        }`}
      >
        進行中
      </button>
      <button
        onClick={() => onChange("finished")}
        className={`text-[9px] font-bold uppercase tracking-wider py-1 px-2 rounded-md transition-colors ${
          active === "finished"
            ? "bg-white dark:bg-zinc-700 text-[var(--ink)] dark:text-zinc-200 shadow-sm"
            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        }`}
      >
        已完結
      </button>
    </div>
  );
}

/* ─── Tournament Card (Left Sidebar) ─── */
function TournamentCard({ event }: { event: TournamentEvent }) {
  const isRunning = event.status === "running";
  const isFinished = event.status === "finished";
  const dateText = isRunning
    ? "進行中"
    : isFinished
      ? "已完結"
      : formatTournamentDate(event.beginAt, event.endAt);

  const stageKeywords = [
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
  const isStageName = (name: string) =>
    stageKeywords.some((kw) => name.toLowerCase().includes(kw));

  // If tournament name is a stage/phase, show serie name only
  const displayName = isStageName(event.tournamentName)
    ? event.serieName || event.tournamentName
    : event.serieName && event.serieName !== event.tournamentName
      ? `${event.tournamentName} — ${event.serieName}`
      : event.tournamentName || event.serieName;

  return (
    <div className="group p-3 rounded-xl bg-[var(--surface-elevated)] dark:bg-zinc-900/60 border border-[var(--line)] dark:border-zinc-800 hover:border-[var(--accent)]/30 dark:hover:border-zinc-700 transition-[border-color] min-h-[84px] flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-1.5">
        <LeagueLogo
          url={event.leagueImage}
          name={event.leagueName}
          game={event.game}
          tournamentName={`${event.tournamentName} ${event.serieName || ""}`}
        />
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${isRunning ? "text-red-500" : "text-[var(--ink-soft)] dark:text-zinc-500"}`}
        >
          {dateText}
        </span>
        <span className="text-[10px] text-[var(--ink-soft)] dark:text-zinc-500 font-medium ml-auto">
          {event.game?.toUpperCase()}
        </span>
      </div>
      <p className="text-[12px] font-semibold text-[var(--ink)] dark:text-zinc-200 leading-snug line-clamp-2 group-hover:text-[var(--accent)] dark:group-hover:text-white transition-colors">
        {displayName}
      </p>
      <p className="text-[10px] text-[var(--ink-soft)] dark:text-zinc-500 mt-1 truncate">
        {event.leagueName}
      </p>
    </div>
  );
}

/* ─── Live Match Card (Right Sidebar) ─── */
function LiveMatchCard({ event }: { event: MatchEvent }) {
  const isRunning = event.status === "running";
  const dateText = isRunning ? "進行中" : formatMatchDate(event.scheduledAt);

  const oppA = event.opponents?.[0];
  const oppB = event.opponents?.[1];
  const teamA = oppA?.acronym || "?";
  const teamB = oppB?.acronym || "?";

  return (
    <div className="group p-3 rounded-xl bg-[var(--surface-elevated)] dark:bg-zinc-900/60 border border-[var(--line)] dark:border-zinc-800 hover:border-[var(--accent)]/30 dark:hover:border-zinc-700 transition-[border-color] min-h-[84px] flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-1.5">
        <LeagueLogo
          url={event.leagueImage}
          name={event.leagueName}
          game={event.game}
          tournamentName={event.tournamentName}
        />
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${isRunning ? "text-red-500" : "text-[var(--ink-soft)] dark:text-zinc-500"}`}
        >
          {dateText}
        </span>
        <span className="text-[10px] text-[var(--ink-soft)] dark:text-zinc-500 font-medium ml-auto">
          {event.game?.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <TeamLogo
            url={oppA?.imageUrl || null}
            acronym={oppA?.acronym || "?"}
          />
          <span className="text-[12px] font-semibold text-[var(--ink)] dark:text-zinc-200 truncate">
            {teamA}
          </span>
        </div>
        <span className="text-[10px] text-[var(--ink-soft)] dark:text-zinc-500 mx-2 shrink-0">
          vs
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] font-semibold text-[var(--ink)] dark:text-zinc-200 truncate">
            {teamB}
          </span>
          <TeamLogo
            url={oppB?.imageUrl || null}
            acronym={oppB?.acronym || "?"}
          />
        </div>
      </div>

      <p className="text-[10px] text-[var(--ink-soft)] dark:text-zinc-500 mt-1 truncate">
        {event.leagueName}
      </p>
    </div>
  );
}

/* ─── Finished Match Card (Right Sidebar) ─── */
function FinishedMatchCard({ event }: { event: MatchEvent }) {
  const oppA = event.opponents?.[0];
  const oppB = event.opponents?.[1];
  const teamA = oppA?.acronym || "?";
  const teamB = oppB?.acronym || "?";
  const winnerA = oppA?.winner;
  const winnerB = oppB?.winner;

  return (
    <div className="group p-3 rounded-xl bg-[var(--surface-elevated)] dark:bg-zinc-900/60 border border-[var(--line)] dark:border-zinc-800 hover:border-[var(--accent)]/30 dark:hover:border-zinc-700 transition-[border-color] min-h-[84px] flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-1.5">
        <LeagueLogo
          url={event.leagueImage}
          name={event.leagueName}
          game={event.game}
          tournamentName={event.tournamentName}
        />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] dark:text-zinc-500">
          已完結
        </span>
        <span className="text-[10px] text-[var(--ink-soft)] dark:text-zinc-500 font-medium ml-auto">
          {event.game?.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <TeamLogo
            url={oppA?.imageUrl || null}
            acronym={oppA?.acronym || "?"}
          />
          <span
            className={`text-[12px] font-semibold truncate ${winnerA ? "text-[var(--ink)] dark:text-zinc-200" : "text-[var(--ink-soft)] dark:text-zinc-500"}`}
          >
            {teamA}
          </span>
        </div>
        <div className="flex items-center gap-1 mx-2 shrink-0">
          <span
            className={`text-[13px] font-black ${winnerA ? "text-[var(--ink)] dark:text-zinc-200" : "text-[var(--ink-soft)] dark:text-zinc-500"}`}
          >
            {event.scoreA}
          </span>
          <span className="text-[10px] text-[var(--ink-soft)] dark:text-zinc-500">
            -
          </span>
          <span
            className={`text-[13px] font-black ${winnerB ? "text-[var(--ink)] dark:text-zinc-200" : "text-[var(--ink-soft)] dark:text-zinc-500"}`}
          >
            {event.scoreB}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-[12px] font-semibold truncate ${winnerB ? "text-[var(--ink)] dark:text-zinc-200" : "text-[var(--ink-soft)] dark:text-zinc-500"}`}
          >
            {teamB}
          </span>
          <TeamLogo
            url={oppB?.imageUrl || null}
            acronym={oppB?.acronym || "?"}
          />
        </div>
      </div>

      <p className="text-[10px] text-[var(--ink-soft)] dark:text-zinc-500 mt-1 truncate">
        {event.leagueName}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════
   LEFT SIDEBAR — Tournaments (with toggle)
   ═══════════════════════════════════════ */
export default function TournamentSidebar({
  upcoming,
  running,
  finished,
}: TournamentSidebarProps) {
  const [tab, setTab] = useState<"live" | "finished">("live");

  const liveEvents = [...running, ...upcoming]
    .filter((e) => {
      const tier = e.tier?.toLowerCase();
      return tier === "a" || tier === "b" || tier === "c" || tier === "s";
    })
    .sort((a, b) => {
      const tierOrder: Record<string, number> = { s: 0, a: 1, b: 2, c: 3 };
      const ta = (a.tier || "").toLowerCase();
      const tb = (b.tier || "").toLowerCase();
      const ra = tierOrder[ta] ?? 99;
      const rb = tierOrder[tb] ?? 99;
      if (ra !== rb) return ra - rb;

      // If same tier, running matches first
      if (a.status !== b.status) {
        return a.status === "running" ? -1 : 1;
      }
      return 0;
    });

  const finishedEvents = (finished || [])
    .filter((e) => {
      const tier = e.tier?.toLowerCase();
      return tier === "a" || tier === "b" || tier === "c" || tier === "s";
    })
    .sort((a, b) => {
      const tierOrder: Record<string, number> = { s: 0, a: 1, b: 2, c: 3 };
      const ta = (a.tier || "").toLowerCase();
      const tb = (b.tier || "").toLowerCase();
      const ra = tierOrder[ta] ?? 99;
      const rb = tierOrder[tb] ?? 99;
      if (ra !== rb) return ra - rb;

      // If same tier, newest finished first
      const da = a.endAt ? new Date(a.endAt).getTime() : 0;
      const db = b.endAt ? new Date(b.endAt).getTime() : 0;
      return db - da;
    });

  const displayEvents = (tab === "live" ? liveEvents : finishedEvents).slice(
    0,
    5,
  );

  const hasAny = displayEvents.length > 0;

  return (
    <div className="w-[200px] shrink-0 max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-none">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-[var(--ink)] dark:text-zinc-300">
          <a
            href="/matches"
            className="hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            賽事資訊
          </a>
        </h3>
        <SidebarTabs active={tab} onChange={setTab} />
      </div>

      {hasAny ? (
        <div className="flex flex-col gap-2">
          {displayEvents.map((event) => (
            <TournamentCard key={`${tab}-${event.id}`} event={event} />
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-[var(--ink-soft)] dark:text-zinc-500 py-2">
          暫無{tab === "live" ? "進行中" : "已完結"}賽事
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   RIGHT SIDEBAR — Matches (with toggle)
   ═══════════════════════════════════════ */
export function MatchSidebar({
  upcoming,
  running,
  finished,
}: MatchSidebarProps) {
  const [tab, setTab] = useState<"live" | "finished">("live");

  const liveMatches = [...running, ...upcoming].filter((m) => {
    const tier = m.tier?.toLowerCase();
    return tier === "a" || tier === "b" || tier === "c" || tier === "s";
  });

  const finishedMatches = (finished || []).filter((m) => {
    const tier = m.tier?.toLowerCase();
    return tier === "a" || tier === "b" || tier === "c" || tier === "s";
  });

  const displayMatches = (tab === "live" ? liveMatches : finishedMatches).slice(
    0,
    5,
  );

  const hasAny = displayMatches.length > 0;

  return (
    <div className="w-[200px] shrink-0 max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-none">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-[var(--ink)] dark:text-zinc-300">
          <a
            href="/matches"
            className="hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            最近對戰
          </a>
        </h3>
        <SidebarTabs active={tab} onChange={setTab} />
      </div>

      {hasAny ? (
        <div className="flex flex-col gap-2">
          {displayMatches.map((match) =>
            tab === "live" ? (
              <LiveMatchCard key={`live-${match.id}`} event={match} />
            ) : (
              <FinishedMatchCard key={`finished-${match.id}`} event={match} />
            ),
          )}
        </div>
      ) : (
        <p className="text-[12px] text-[var(--ink-soft)] dark:text-zinc-500 py-2">
          暫無{tab === "live" ? "進行中" : "已完結"}對局
        </p>
      )}
    </div>
  );
}

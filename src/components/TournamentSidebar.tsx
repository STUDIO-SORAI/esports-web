"use client";

import { useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import type { TournamentEvent, MatchEvent } from "@/lib/pandascore";
import { formatTournamentDate, formatMatchDate } from "@/lib/pandascore";
import { Badge } from "@/components/arc/badge/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/arc";

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

const GAME_LOGOS: Record<string, string> = {
  cs2: "/games/cs2/color.png",
  valorant: "/games/valorant/color.png",
  lol: "/games/lol/color.png",
  r6: "/games/r6/white.png",
};

const GLOBAL_LEAGUE_OVERRIDES: Record<string, string> = {
  "esports world cup": "/event/esportsworldcup.png",
  "esports world": "/event/esportsworldcup.png",
  "esports nations cup": "/event/esportsnationscup.webp",
  "esports nation": "/event/esportsnationscup.webp",
};

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

  for (const [key, overrideUrl] of Object.entries(GLOBAL_LEAGUE_OVERRIDES)) {
    if (searchStr.includes(key)) {
      return overrideUrl;
    }
  }

  const overrides = GAME_LEAGUE_OVERRIDES[game.toLowerCase()];
  if (overrides) {
    for (const [key, overrideUrl] of Object.entries(overrides)) {
      if (searchStr.includes(key)) {
        return overrideUrl;
      }
    }
  }

  if (url) return url;
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
        className={`w-5 h-5 object-contain shrink-0 ${isFallback ? "brightness-0 dark:invert" : ""}`}
      />
    );
  }
  return (
    <div className="w-5 h-5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] flex items-center justify-center text-[8px] font-medium text-[var(--text-secondary)] shrink-0">
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
        className="w-5 h-5 object-contain shrink-0"
      />
    );
  }
  if (acronym === "TBD") {
    return (
      <div className="w-5 h-5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
        <span className="text-[7px] font-medium text-[var(--text-muted)]">
          TBD
        </span>
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] flex items-center justify-center text-[8px] font-medium text-[var(--text-secondary)] shrink-0">
      {acronym?.slice(0, 2) || "?"}
    </div>
  );
}

function SidebarTabs({
  active,
  onChange,
}: {
  active: "live" | "finished";
  onChange: (v: "live" | "finished") => void;
}) {
  return (
    <Tabs value={active} onValueChange={(v) => onChange(v as "live" | "finished")} size="sm">
      <TabsList size="sm">
        <TabsTrigger value="live" size="sm">
          進行中
        </TabsTrigger>
        <TabsTrigger value="finished" size="sm">
          已完結
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

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

  const displayName = isStageName(event.tournamentName)
    ? event.serieName || event.tournamentName
    : event.serieName && event.serieName !== event.tournamentName
      ? `${event.tournamentName} · ${event.serieName}`
      : event.tournamentName || event.serieName;

  return (
    <div className="p-2.5 rounded-[var(--radius-panel)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-[background-color,transform] duration-150 flex flex-col gap-1.5 shadow-xs">
      <div className="flex items-center gap-1.5">
        <LeagueLogo
          url={event.leagueImage}
          name={event.leagueName}
          game={event.game}
          tournamentName={`${event.tournamentName} ${event.serieName || ""}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[var(--foreground)] truncate leading-tight">
            {displayName}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] truncate">
            {event.leagueName}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
        <span className={`font-medium ${isRunning ? "text-[var(--accent)]" : ""}`}>
          {dateText}
        </span>
        {event.tier ? (
          <span className="font-medium">Tier {event.tier.toUpperCase()}</span>
        ) : null}
      </div>
    </div>
  );
}

function LiveMatchCard({ event }: { event: MatchEvent }) {
  const oppA = event.opponents?.[0];
  const oppB = event.opponents?.[1];
  const teamA = oppA?.acronym || "?";
  const teamB = oppB?.acronym || "?";
  const isRunning = event.status === "running";

  return (
    <div className="p-2.5 rounded-[var(--radius-panel)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-[background-color,transform] duration-150 flex flex-col gap-1.5 shadow-xs">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[var(--text-muted)] truncate max-w-[110px]">
          {event.leagueName}
        </span>
        {isRunning ? (
          <span className="inline-flex items-center gap-1 text-[var(--accent)] font-medium">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]" />
            </span>
            LIVE
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">
            {formatMatchDate(event.scheduledAt)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <TeamLogo url={oppA?.imageUrl || null} acronym={teamA} />
          <span className="font-medium text-[var(--foreground)] truncate">{teamA}</span>
        </div>
        {isRunning ? (
          <span className="font-medium text-[var(--foreground)] px-1 shrink-0 tabular-nums">
            {event.scoreA} - {event.scoreB}
          </span>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)] px-1 shrink-0">vs</span>
        )}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
          <span className="font-medium text-[var(--foreground)] truncate text-right">{teamB}</span>
          <TeamLogo url={oppB?.imageUrl || null} acronym={teamB} />
        </div>
      </div>
    </div>
  );
}

function FinishedMatchCard({ event }: { event: MatchEvent }) {
  const oppA = event.opponents?.[0];
  const oppB = event.opponents?.[1];
  const teamA = oppA?.acronym || "?";
  const teamB = oppB?.acronym || "?";
  const winnerA = !!oppA?.winner;
  const winnerB = !!oppB?.winner;

  return (
    <div className="p-2.5 rounded-[var(--radius-panel)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-[background-color,transform] duration-150 flex flex-col gap-1.5 shadow-xs">
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span className="truncate max-w-[110px]">{event.leagueName}</span>
        <span>已完結</span>
      </div>

      <div className="flex items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <TeamLogo url={oppA?.imageUrl || null} acronym={teamA} />
          <span
            className={`font-medium truncate ${
              winnerA ? "text-[var(--foreground)]" : "text-[var(--text-muted)]"
            }`}
          >
            {teamA}
          </span>
        </div>
        <span className="font-medium text-[var(--foreground)] px-1 shrink-0 tabular-nums">
          <span className={winnerA ? "text-[var(--foreground)]" : "text-[var(--text-muted)]"}>
            {event.scoreA}
          </span>
          <span className="text-[var(--text-muted)] mx-0.5">-</span>
          <span className={winnerB ? "text-[var(--foreground)]" : "text-[var(--text-muted)]"}>
            {event.scoreB}
          </span>
        </span>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
          <span
            className={`font-medium truncate text-right ${
              winnerB ? "text-[var(--foreground)]" : "text-[var(--text-muted)]"
            }`}
          >
            {teamB}
          </span>
          <TeamLogo url={oppB?.imageUrl || null} acronym={teamB} />
        </div>
      </div>
    </div>
  );
}

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
      const da = a.endAt ? new Date(a.endAt).getTime() : 0;
      const db = b.endAt ? new Date(b.endAt).getTime() : 0;
      return db - da;
    });

  const displayEvents = (tab === "live" ? liveEvents : finishedEvents).slice(
    0,
    4,
  );

  const hasAny = displayEvents.length > 0;

  return (
    <div className="w-[200px] shrink-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-[var(--foreground)]">
          <a
            href="/matches"
            className="hover:text-[var(--accent)] transition-colors"
          >
            賽事資訊
          </a>
        </h3>
        <SidebarTabs active={tab} onChange={setTab} />
      </div>

      {hasAny ? (
        <MotionConfig reducedMotion="user">
          <div className="flex flex-col gap-2" key={tab}>
            {displayEvents.map((event, index) => (
              <motion.div
                key={`${tab}-${event.id}`}
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{
                  duration: 0.22,
                  delay: index * 0.045,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <TournamentCard event={event} />
              </motion.div>
            ))}
          </div>
        </MotionConfig>
      ) : (
        <p className="text-xs text-[var(--text-muted)] py-2">
          暫無{tab === "live" ? "進行中" : "已完結"}賽事
        </p>
      )}
    </div>
  );
}

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
    <div className="w-[200px] shrink-0 flex-1 min-h-0 overflow-y-auto scrollbar-none flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-[var(--foreground)]">
          <a
            href="/matches"
            className="hover:text-[var(--accent)] transition-colors"
          >
            最近對戰
          </a>
        </h3>
        <SidebarTabs active={tab} onChange={setTab} />
      </div>

      {hasAny ? (
        <MotionConfig reducedMotion="user">
          <div className="flex flex-col gap-2" key={tab}>
            {displayMatches.map((match, index) => (
              <motion.div
                key={`${tab}-${match.id}`}
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{
                  duration: 0.22,
                  delay: index * 0.045,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {tab === "live" ? (
                  <LiveMatchCard event={match} />
                ) : (
                  <FinishedMatchCard event={match} />
                )}
              </motion.div>
            ))}
          </div>
        </MotionConfig>
      ) : (
        <p className="text-xs text-[var(--text-muted)] py-2">
          暫無{tab === "live" ? "進行中" : "已完結"}對局
        </p>
      )}
    </div>
  );
}

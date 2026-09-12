"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MatchEvent, TournamentEvent } from "@/lib/pandascore";
import {
  formatMatchDate,
  formatMatchDateTimeTaipei,
  formatTournamentDate,
} from "@/lib/pandascore";
import {
  ALL_MAJOR_TIERS,
  allMajorTiersSelected,
  matchesSelectedTiers,
  toggleMatchTier,
  type MajorTier,
} from "@/lib/matchFilters";

type GameFilter = "all" | "valorant" | "lol" | "r6" | "cs2";
type TourTab = "live" | "finished";

interface MatchesPageProps {
  matches: {
    running: MatchEvent[];
    upcoming: MatchEvent[];
    finished: MatchEvent[];
  };
  tournaments: {
    running: TournamentEvent[];
    upcoming: TournamentEvent[];
    finished: TournamentEvent[];
  };
}

const GAMES: { key: GameFilter; label: string; short: string; logo: string }[] = [
  { key: "all", label: "全部", short: "全部", logo: "" },
  { key: "valorant", label: "特戰英豪", short: "特戰", logo: "/valorantct.png" },
  { key: "lol", label: "英雄聯盟", short: "LoL", logo: "/lolesports.png" },
  { key: "r6", label: "虹彩六號", short: "R6", logo: "/rainbow6.png" },
  { key: "cs2", label: "CS2", short: "CS2", logo: "/cs2v2.webp" },
];

const GAME_LOGOS: Record<string, string> = {
  cs2: "/cs2v2.webp",
  valorant: "/valorantct.png",
  lol: "/lolesports.png",
  r6: "/rainbow6.png",
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
    vct: "/event/vct-champion.avif",
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

const TIER_ORDER: Record<string, number> = { s: 0, a: 1, b: 2, c: 3 };

const TIER_CHIPS: { key: MajorTier; label: string }[] = [
  { key: "s", label: "S" },
  { key: "a", label: "A" },
  { key: "b", label: "B" },
  { key: "c", label: "C" },
];

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

function getLeagueLogoUrl(
  url: string | null,
  name: string,
  game: string,
  tournamentName?: string | null,
): string | null {
  const searchStr = `${name} ${tournamentName || ""}`.toLowerCase();

  for (const [key, overrideUrl] of Object.entries(GLOBAL_LEAGUE_OVERRIDES)) {
    if (searchStr.includes(key)) return overrideUrl;
  }

  const overrides = GAME_LEAGUE_OVERRIDES[game.toLowerCase()];
  if (overrides) {
    for (const [key, overrideUrl] of Object.entries(overrides)) {
      if (searchStr.includes(key)) return overrideUrl;
    }
  }

  if (url) return url;
  return GAME_LOGOS[game] || null;
}

function tournamentDisplayName(event: TournamentEvent): string {
  const isStageName = (name: string) =>
    STAGE_KEYWORDS.some((kw) => name.toLowerCase().includes(kw));

  if (isStageName(event.tournamentName)) {
    return event.serieName || event.tournamentName;
  }
  if (event.serieName && event.serieName !== event.tournamentName) {
    return `${event.tournamentName} — ${event.serieName}`;
  }
  return event.tournamentName || event.serieName;
}

function LeagueLogo({
  url,
  name,
  game,
  tournamentName,
  size = "md",
}: {
  url: string | null;
  name: string;
  game: string;
  tournamentName?: string | null;
  size?: "sm" | "md";
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
  const box = size === "sm" ? "w-5 h-5" : "w-7 h-7";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${box} object-contain rounded-sm shrink-0 ${isFallback ? "brightness-0 dark:invert" : ""}`}
      />
    );
  }

  return (
    <div
      className={`${box} rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-[8px] font-bold text-zinc-500 dark:text-zinc-400 shrink-0`}
    >
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
        className="w-6 h-6 object-contain rounded-sm shrink-0"
      />
    );
  }
  if (acronym === "TBD") {
    return (
      <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 flex items-center justify-center shrink-0">
        <span className="text-[7px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
          TBD
        </span>
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-[9px] font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
      {acronym?.slice(0, 2) || "?"}
    </div>
  );
}

function GameBadge({ game }: { game: string }) {
  const logo = GAME_LOGOS[game];
  const label =
    GAMES.find((g) => g.key === game)?.label || game.toUpperCase();
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[var(--ink-soft)] dark:text-zinc-500">
      {logo ? (
        <img
          src={logo}
          alt={label}
          className="w-3.5 h-3.5 object-contain brightness-0 dark:invert opacity-70"
        />
      ) : null}
      {label}
    </span>
  );
}

function StatusPill({
  status,
}: {
  status: "running" | "upcoming" | "finished" | "not_started" | "canceled";
}) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-500">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
        </span>
        進行中
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] dark:text-zinc-500">
        已完結
      </span>
    );
  }
  if (status === "canceled") {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        已取消
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] dark:text-zinc-500">
      即將開始
    </span>
  );
}

function MatchRow({ event }: { event: MatchEvent }) {
  const isRunning = event.status === "running";
  const isFinished = event.status === "finished";
  const oppA = event.opponents?.[0];
  const oppB = event.opponents?.[1];
  const teamA = oppA?.acronym || oppA?.name || "?";
  const teamB = oppB?.acronym || oppB?.name || "?";
  const winnerA = !!oppA?.winner;
  const winnerB = !!oppB?.winner;
  const relative = isRunning
    ? null
    : isFinished
      ? null
      : formatMatchDate(event.scheduledAt);
  const absolute = formatMatchDateTimeTaipei(
    event.scheduledAt || event.beginAt,
  );

  return (
    <article className="group p-4 rounded-2xl bg-[var(--surface-elevated)] dark:bg-zinc-900/60 border border-[var(--line)] dark:border-zinc-800 hover:border-[var(--accent)]/30 dark:hover:border-zinc-700 transition-all">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <LeagueLogo
            url={event.leagueImage}
            name={event.leagueName}
            game={event.game}
            tournamentName={event.tournamentName}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[var(--ink)] dark:text-zinc-200 truncate">
              {event.leagueName || "未知聯賽"}
            </p>
            <p className="text-[10px] text-[var(--ink-soft)] dark:text-zinc-500 truncate">
              {event.tournamentName}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusPill
            status={
              isRunning
                ? "running"
                : isFinished
                  ? "finished"
                  : event.status === "canceled"
                    ? "canceled"
                    : "upcoming"
            }
          />
          <GameBadge game={event.game} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TeamLogo
            url={oppA?.imageUrl || null}
            acronym={oppA?.acronym || "?"}
          />
          <span
            className={`text-sm font-bold truncate ${
              isFinished && !winnerA
                ? "text-[var(--ink-soft)] dark:text-zinc-500"
                : "text-[var(--ink)] dark:text-zinc-100"
            }`}
          >
            {teamA}
          </span>
        </div>

        {isFinished || isRunning ? (
          <div className="flex items-center gap-1.5 shrink-0 px-2">
            <span
              className={`text-base font-black tabular-nums ${
                isFinished && !winnerA
                  ? "text-[var(--ink-soft)] dark:text-zinc-500"
                  : "text-[var(--ink)] dark:text-zinc-100"
              }`}
            >
              {event.scoreA}
            </span>
            <span className="text-[11px] text-[var(--ink-soft)] dark:text-zinc-500">
              -
            </span>
            <span
              className={`text-base font-black tabular-nums ${
                isFinished && !winnerB
                  ? "text-[var(--ink-soft)] dark:text-zinc-500"
                  : "text-[var(--ink)] dark:text-zinc-100"
              }`}
            >
              {event.scoreB}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-bold text-[var(--ink-soft)] dark:text-zinc-500 shrink-0 px-2">
            vs
          </span>
        )}

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span
            className={`text-sm font-bold truncate text-right ${
              isFinished && !winnerB
                ? "text-[var(--ink-soft)] dark:text-zinc-500"
                : "text-[var(--ink)] dark:text-zinc-100"
            }`}
          >
            {teamB}
          </span>
          <TeamLogo
            url={oppB?.imageUrl || null}
            acronym={oppB?.acronym || "?"}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[var(--ink-soft)] dark:text-zinc-500">
        <span>
          {absolute}
          {relative ? ` · ${relative}` : ""}
        </span>
        {event.numberOfGames > 0 ? (
          <span className="uppercase tracking-wider font-bold">
            Bo{event.numberOfGames}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function TournamentCarouselCard({ event }: { event: TournamentEvent }) {
  const isRunning = event.status === "running";
  const isFinished = event.status === "finished";
  const dateText = isRunning
    ? "進行中"
    : isFinished
      ? "已完結"
      : formatTournamentDate(event.beginAt, event.endAt);
  const displayName = tournamentDisplayName(event);

  return (
    <article className="snap-start shrink-0 w-[240px] sm:w-[260px] p-3.5 rounded-2xl bg-[var(--surface-elevated)] dark:bg-zinc-900/70 border border-[var(--line)] dark:border-zinc-800 hover:border-[var(--accent)]/30 dark:hover:border-zinc-700 transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <LeagueLogo
            url={event.leagueImage}
            name={event.leagueName}
            game={event.game}
            tournamentName={`${event.tournamentName} ${event.serieName || ""}`}
          />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[var(--ink)] dark:text-zinc-100 leading-snug line-clamp-2">
              {displayName}
            </p>
            <p className="text-[10px] text-[var(--ink-soft)] dark:text-zinc-500 mt-0.5 truncate">
              {event.leagueName}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <StatusPill
          status={
            isRunning ? "running" : isFinished ? "finished" : "upcoming"
          }
        />
        <GameBadge game={event.game} />
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--ink-soft)] dark:text-zinc-500">
        <span className="font-bold tracking-wider">{dateText}</span>
        {event.tier ? (
          <span className="font-black uppercase tracking-[0.16em]">
            Tier {event.tier.toUpperCase()}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function CarouselScrollButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "向左滑動" : "向右滑動"}
      className={`hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 shadow-sm hover:border-red-400 hover:text-red-500 transition-colors ${
        direction === "left" ? "left-1" : "right-1"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {direction === "left" ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  );
}

function TournamentCarousel({
  live,
  finished,
  filterKey,
}: {
  live: TournamentEvent[];
  finished: TournamentEvent[];
  filterKey: string;
}) {
  const [tab, setTab] = useState<TourTab>("live");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const items = tab === "live" ? live : finished;
  const emptyLabel =
    tab === "live"
      ? "目前沒有進行中或即將開始的主要賽事"
      : "目前沒有近期完結的賽事";

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: 0 });
  }, [tab, filterKey]);

  const scrollByCards = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <section className="w-full">
      <div className="max-w-[1240px] mx-auto px-4 md:px-6 xl:px-8 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-lg md:text-xl font-serif font-black text-[var(--ink)] dark:text-zinc-100 shrink-0">
            {tab === "live" ? "主要賽事" : "近期完結"}
          </h2>
          <span className="text-xs font-bold text-[var(--ink-soft)] dark:text-zinc-500 tabular-nums">
            {items.length} 場
          </span>
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 w-fit shrink-0">
          <button
            type="button"
            onClick={() => setTab("live")}
            className={`text-[10px] font-bold tracking-wider py-1.5 px-2.5 rounded-md transition-colors ${
              tab === "live"
                ? "bg-white dark:bg-zinc-700 text-red-500 shadow-sm"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            進行中
          </button>
          <button
            type="button"
            onClick={() => setTab("finished")}
            className={`text-[10px] font-bold tracking-wider py-1.5 px-2.5 rounded-md transition-colors ${
              tab === "finished"
                ? "bg-white dark:bg-zinc-700 text-[var(--ink)] dark:text-zinc-200 shadow-sm"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            近期完結
          </button>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 md:px-6 xl:px-8">
        {items.length > 0 ? (
          <div className="relative group/carousel">
            <CarouselScrollButton
              direction="left"
              onClick={() => scrollByCards(-1)}
            />
            <CarouselScrollButton
              direction="right"
              onClick={() => scrollByCards(1)}
            />
            <div
              ref={scrollerRef}
              className="flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1 scroll-smooth"
            >
              {items.map((t) => (
                <TournamentCarouselCard key={`${tab}-${t.id}`} event={t} />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-8 text-center text-sm text-[var(--ink-soft)] dark:text-zinc-500">
            {emptyLabel}
          </div>
        )}
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  count,
  accent,
}: {
  title: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-4">
      <h2
        className={`text-lg md:text-xl font-serif font-black ${
          accent
            ? "text-red-500"
            : "text-[var(--ink)] dark:text-zinc-100"
        }`}
      >
        {title}
      </h2>
      <span className="text-xs font-bold text-[var(--ink-soft)] dark:text-zinc-500 tabular-nums">
        {count} 場
      </span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-10 text-center text-sm text-[var(--ink-soft)] dark:text-zinc-500">
      {label}
    </div>
  );
}

export default function MatchesPage({ matches, tournaments }: MatchesPageProps) {
  const [game, setGame] = useState<GameFilter>("all");
  const [tiers, setTiers] = useState<MajorTier[]>(ALL_MAJOR_TIERS);
  const selectedTiers = useMemo(() => new Set(tiers), [tiers]);
  const tiersAllOn = allMajorTiersSelected(tiers);

  const byFilters = useCallback(
    (tier: string | null | undefined, itemGame: string) =>
      matchesSelectedTiers(tier, selectedTiers) &&
      (game === "all" || itemGame === game),
    [game, selectedTiers],
  );

  const running = useMemo(
    () => matches.running.filter((m) => byFilters(m.tier, m.game)),
    [matches.running, byFilters],
  );
  const upcoming = useMemo(
    () =>
      matches.upcoming.filter((m) => byFilters(m.tier, m.game)).slice(0, 24),
    [matches.upcoming, byFilters],
  );
  const finished = useMemo(
    () =>
      matches.finished.filter((m) => byFilters(m.tier, m.game)).slice(0, 24),
    [matches.finished, byFilters],
  );

  const tourList = useMemo(() => {
    const byGame = (t: TournamentEvent) => byFilters(t.tier, t.game);

    const live = [...tournaments.running, ...tournaments.upcoming]
      .filter(byGame)
      .sort((a, b) => {
        const ta = (a.tier || "").toLowerCase();
        const tb = (b.tier || "").toLowerCase();
        const ra = TIER_ORDER[ta] ?? 99;
        const rb = TIER_ORDER[tb] ?? 99;
        if (ra !== rb) return ra - rb;
        if (a.status !== b.status) return a.status === "running" ? -1 : 1;
        return 0;
      });

    const done = tournaments.finished
      .filter(byGame)
      .sort((a, b) => {
        const da = a.endAt ? new Date(a.endAt).getTime() : 0;
        const db = b.endAt ? new Date(b.endAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 12);

    return { live: live.slice(0, 16), done };
  }, [tournaments, byFilters]);

  const totalVisible =
    running.length +
    upcoming.length +
    finished.length +
    tourList.live.length +
    tourList.done.length;

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <div className="max-w-[1240px] mx-auto px-4 md:px-6 xl:px-8 w-full flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-500 mb-2">
              Match Center
            </p>
            <h1 className="text-3xl md:text-4xl font-serif font-black text-[var(--ink)] dark:text-zinc-50">
              賽事資訊
            </h1>
            <p className="mt-2 text-sm text-[var(--ink-soft)] dark:text-zinc-400 max-w-2xl leading-relaxed">
              整理特戰英豪、英雄聯盟、虹彩六號與 CS2
              的進行中對局、近期賽程與主要大賽狀態。時間顯示為台北時區（Asia/Taipei）。
            </p>
          </div>
          <p className="text-[11px] text-[var(--ink-soft)] dark:text-zinc-500 font-medium shrink-0">
            資料來源 PandaScore · 約每 10 分鐘更新
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 w-full sm:w-fit"
            role="group"
            aria-label="依遊戲篩選"
          >
            {GAMES.map((g) => {
              const active = game === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setGame(g.key)}
                  className={`inline-flex items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors flex-1 sm:flex-initial min-w-0 ${
                    active
                      ? "bg-white dark:bg-zinc-700 text-[var(--ink)] dark:text-zinc-100 shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {g.logo ? (
                    <img
                      src={g.logo}
                      alt=""
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain shrink-0 ${
                        active
                          ? "brightness-0 dark:invert"
                          : "brightness-0 dark:invert opacity-50"
                      }`}
                    />
                  ) : null}
                  <span className="sm:hidden truncate">{g.short}</span>
                  <span className="hidden sm:inline">{g.label}</span>
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 w-full sm:w-fit"
            role="group"
            aria-label="依層級篩選"
          >
            <span className="hidden sm:inline px-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 shrink-0">
              層級
            </span>
            <button
              type="button"
              onClick={() => setTiers(ALL_MAJOR_TIERS)}
              aria-pressed={tiersAllOn}
              className={`inline-flex items-center justify-center px-1.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors flex-1 sm:flex-initial min-w-0 ${
                tiersAllOn
                  ? "bg-white dark:bg-zinc-700 text-[var(--ink)] dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              全部
            </button>
            {TIER_CHIPS.map((chip) => {
              const active = selectedTiers.has(chip.key);
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setTiers(toggleMatchTier(tiers, chip.key))}
                  aria-pressed={active}
                  aria-label={`Tier ${chip.label}`}
                  className={`inline-flex items-center justify-center min-w-0 flex-1 sm:flex-initial sm:min-w-9 px-1.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors ${
                    active
                      ? "bg-white dark:bg-zinc-700 text-[var(--ink)] dark:text-zinc-100 shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {totalVisible === 0 ? (
        <div className="max-w-[1240px] mx-auto px-4 md:px-6 xl:px-8 w-full">
          <EmptyState
            label={
              tiers.length === 0
                ? "沒有勾選任何層級，請至少選一個。"
                : !tiersAllOn
                  ? "沒有符合目前層級篩選的賽事，試試勾選其他層級。"
                  : "目前沒有可顯示的賽事資料，請稍後再試，或確認 PandaScore API 設定。"
            }
          />
        </div>
      ) : (
        <>
          <TournamentCarousel
            live={tourList.live}
            finished={tourList.done}
            filterKey={`${game}:${tiers.join(",")}`}
          />

          <div className="max-w-[1240px] mx-auto px-4 md:px-6 xl:px-8 w-full flex flex-col gap-10 md:gap-12">
            <section>
              <SectionHeader title="進行中" count={running.length} accent />
              {running.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {running.map((m) => (
                    <MatchRow key={`live-${m.id}`} event={m} />
                  ))}
                </div>
              ) : (
                <EmptyState label="目前沒有進行中的對局" />
              )}
            </section>

            <section>
              <SectionHeader title="即將開始" count={upcoming.length} />
              {upcoming.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {upcoming.map((m) => (
                    <MatchRow key={`up-${m.id}`} event={m} />
                  ))}
                </div>
              ) : (
                <EmptyState label="目前沒有即將開始的對局" />
              )}
            </section>

            <section>
              <SectionHeader title="近期賽果" count={finished.length} />
              {finished.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {finished.map((m) => (
                    <MatchRow key={`fin-${m.id}`} event={m} />
                  ))}
                </div>
              ) : (
                <EmptyState label="目前沒有近期賽果" />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchEvent } from "@/lib/pandascore";
import { formatMatchDate } from "@/lib/pandascore";
import { getGameLogoSet } from "@/lib/config";

interface MobileMatchBarProps {
  upcoming: MatchEvent[];
  running: MatchEvent[];
  finished: MatchEvent[];
}

const GAMES = [
  { key: "cs2", name: "CS2" },
  { key: "valorant", name: "Valorant" },
  { key: "lol", name: "英雄聯盟" },
  { key: "r6", name: "虹彩六號" },
];

function GameIcon({ game }: { game: string }) {
  const logos = getGameLogoSet(game);
  if (!logos) return null;
  return (
    <span className="inline-flex items-center shrink-0">
      <img
        src={logos.dark}
        alt={game}
        className="w-3.5 h-3.5 object-contain opacity-75 dark:hidden shrink-0"
      />
      <img
        src={logos.white}
        alt={game}
        className="w-3.5 h-3.5 object-contain opacity-75 hidden dark:block shrink-0"
      />
    </span>
  );
}

function TeamLogo({ url, acronym }: { url: string | null; acronym: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={acronym}
        className="w-4 h-4 object-contain shrink-0"
      />
    );
  }
  if (acronym === "TBD") {
    return (
      <div className="w-4 h-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
        <span className="text-[6px] font-medium text-[var(--text-muted)]">TBD</span>
      </div>
    );
  }
  return (
    <div className="w-4 h-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)] flex items-center justify-center text-[7px] font-medium text-[var(--text-secondary)] shrink-0">
      {acronym?.slice(0, 2) || "?"}
    </div>
  );
}

function MobileMatchCard({ event }: { event: MatchEvent }) {
  const isRunning = event.status === "running";
  const isFinished = event.status === "finished";
  const dateText = isRunning ? "進行中" : isFinished ? "已完結" : formatMatchDate(event.scheduledAt);

  const oppA = event.opponents?.[0];
  const oppB = event.opponents?.[1];
  const teamA = oppA?.acronym || "?";
  const teamB = oppB?.acronym || "?";
  const winnerA = oppA?.winner;
  const winnerB = oppB?.winner;
  const gameName = GAMES.find((x) => x.key === event.game)?.name || event.game;

  return (
    <div className="shrink-0 w-[205px] p-2 rounded-[var(--radius-control)] bg-[var(--surface-raised)] hover:bg-[var(--surface-muted)] transition-[background-color] duration-150 shadow-2xs flex flex-col justify-center gap-1">
      <div className="flex items-center gap-1.5">
        <GameIcon game={event.game} />
        <span className={`text-[10px] font-medium ${isRunning ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>
          {dateText}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] font-normal">
          {gameName}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <TeamLogo url={oppA?.imageUrl || null} acronym={oppA?.acronym || "?"} />
          <span className={`font-medium truncate ${isFinished && !winnerA ? "text-[var(--text-muted)]" : "text-[var(--foreground)]"}`}>
            {teamA}
          </span>
        </div>

        {isFinished ? (
          <div className="flex items-center gap-1 mx-1.5 shrink-0 tabular-nums">
            <span className={`font-medium ${winnerA ? "text-[var(--foreground)]" : "text-[var(--text-muted)]"}`}>
              {event.scoreA}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">-</span>
            <span className={`font-medium ${winnerB ? "text-[var(--foreground)]" : "text-[var(--text-muted)]"}`}>
              {event.scoreB}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)] mx-1.5 shrink-0">vs</span>
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`font-medium truncate ${isFinished && !winnerB ? "text-[var(--text-muted)]" : "text-[var(--foreground)]"}`}>
            {teamB}
          </span>
          <TeamLogo url={oppB?.imageUrl || null} acronym={oppB?.acronym || "?"} />
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-muted)] truncate">
        {event.leagueName}
      </p>
    </div>
  );
}

export default function MobileMatchBar({ upcoming, running, finished }: MobileMatchBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const liveMatches = [...running, ...upcoming];

  const majorLive = liveMatches.filter((m) => {
    const tier = m.tier?.toLowerCase();
    return tier === "a" || tier === "b" || tier === "c" || tier === "s";
  });

  const majorFinished = (finished || []).filter((m) => {
    const tier = m.tier?.toLowerCase();
    return tier === "a" || tier === "b" || tier === "c" || tier === "s";
  });

  const finishedSlice = majorFinished.slice(0, 3);
  const liveSlice = majorLive.slice(0, 8 - finishedSlice.length);
  
  const seen = new Set<number>();
  const allMatches: MatchEvent[] = [];
  for (const match of [...finishedSlice, ...liveSlice]) {
    if (!seen.has(match.id)) {
      seen.add(match.id);
      allMatches.push(match);
    }
  }

  if (allMatches.length === 0) return null;

  return (
    <div
      ref={viewportRef}
      className="w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex gap-2 px-3 py-2 animate-marquee"
        style={{
          width: "max-content",
          animationPlayState: isPaused || !isVisible ? "paused" : "running",
        }}
      >
        {allMatches.map((match) => (
          <div key={match.id}>
            <MobileMatchCard event={match} />
          </div>
        ))}
        {allMatches.map((match) => (
          <div key={`dup-${match.id}`}>
            <MobileMatchCard event={match} />
          </div>
        ))}
      </div>
    </div>
  );
}

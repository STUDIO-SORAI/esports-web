"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchEvent } from "@/lib/pandascore";
import { formatMatchDate } from "@/lib/pandascore";

interface MobileMatchBarProps {
  upcoming: MatchEvent[];
  running: MatchEvent[];
  finished: MatchEvent[];
}

const GAMES = [
  { key: "cs2", logo: "/cs2v2.webp", name: "CS2" },
  { key: "valorant", logo: "/valorantct.png", name: "Valorant" },
  { key: "lol", logo: "/lolesports.png", name: "英雄聯盟" },
  { key: "r6", logo: "/rainbow6.png", name: "虹彩六號" },
];

function GameIcon({ game }: { game: string }) {
  const g = GAMES.find((x) => x.key === game);
  if (!g) return null;
  return (
    <img
      src={g.logo}
      alt={g.name}
      className="w-3 h-3 object-contain brightness-0 dark:invert opacity-60 shrink-0"
    />
  );
}

function TeamLogo({ url, acronym }: { url: string | null; acronym: string }) {
  if (url) {
    return <img src={url} alt={acronym} className="w-4 h-4 object-contain rounded-sm" />;
  }
  if (acronym === "TBD") {
    return (
      <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
        <span className="text-[6px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">TBD</span>
      </div>
    );
  }
  return (
    <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-[7px] font-bold text-zinc-500 dark:text-zinc-400">
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

  return (
    <div className="shrink-0 w-[220px] p-2.5 rounded-xl bg-[var(--surface-elevated)] dark:bg-zinc-900/60 border border-[var(--line)] dark:border-zinc-800 flex flex-col justify-center gap-1.5">
      <div className="flex items-center gap-1.5">
        <GameIcon game={event.game} />
        <span className={`text-[9px] font-bold uppercase tracking-wider ${isRunning ? "text-red-500" : "text-[var(--ink-soft)] dark:text-zinc-500"}`}>
          {dateText}
        </span>
        <span className="text-[9px] text-[var(--ink-soft)] dark:text-zinc-500 font-medium">
          {event.game?.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <TeamLogo url={oppA?.imageUrl || null} acronym={oppA?.acronym || "?"} />
          <span className={`text-[11px] font-semibold truncate ${isFinished && !winnerA ? "text-[var(--ink-soft)] dark:text-zinc-500" : "text-[var(--ink)] dark:text-zinc-200"}`}>
            {teamA}
          </span>
        </div>

        {isFinished ? (
          <div className="flex items-center gap-1 mx-1.5 shrink-0">
            <span className={`text-[12px] font-black ${winnerA ? "text-[var(--ink)] dark:text-zinc-200" : "text-[var(--ink-soft)] dark:text-zinc-500"}`}>
              {event.scoreA}
            </span>
            <span className="text-[9px] text-[var(--ink-soft)] dark:text-zinc-500">-</span>
            <span className={`text-[12px] font-black ${winnerB ? "text-[var(--ink)] dark:text-zinc-200" : "text-[var(--ink-soft)] dark:text-zinc-500"}`}>
              {event.scoreB}
            </span>
          </div>
        ) : (
          <span className="text-[9px] text-[var(--ink-soft)] dark:text-zinc-500 mx-1.5 shrink-0">vs</span>
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[11px] font-semibold truncate ${isFinished && !winnerB ? "text-[var(--ink-soft)] dark:text-zinc-500" : "text-[var(--ink)] dark:text-zinc-200"}`}>
            {teamB}
          </span>
          <TeamLogo url={oppB?.imageUrl || null} acronym={oppB?.acronym || "?"} />
        </div>
      </div>

      <p className="text-[9px] text-[var(--ink-soft)] dark:text-zinc-500 truncate">
        {event.leagueName}
      </p>
    </div>
  );
}

export default function MobileMatchBar({ upcoming, running, finished }: MobileMatchBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  // 捲出畫面之後就沒有人在看了，但 CSS animation 不會自己停 —— 合成執行緒
  // 會一路把這條跑馬燈推到天荒地老。用可見性把它關掉。
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      // 完全離開視窗才停，免得在邊緣反覆觸發
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
      className="xl:hidden w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/*
        暫停是切 animationPlayState，不是把 animate-marquee 這個 class 拿掉。
        拿掉 class 等於整個移除 animation，元素會瞬間回到 translateX(0) ——
        滑鼠一移開跑馬燈就跳回開頭，而不是從剛才停住的地方接下去。
      */}
      <div
        ref={trackRef}
        className="flex gap-2 px-4 py-2 animate-marquee"
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
        {/* Duplicate for seamless loop */}
        {allMatches.map((match) => (
          <div key={`dup-${match.id}`}>
            <MobileMatchCard event={match} />
          </div>
        ))}
      </div>
    </div>
  );
}

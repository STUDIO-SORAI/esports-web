"use client";

import { useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/arc";
import { CountryFlag } from "@/components/transfers/CountryFlag";
import { GameMark } from "@/components/transfers/GameMark";
import { TRANSFER_GAME_LIST, type TransferGameSlug } from "@/lib/transfers";
import {
  selectTransferMoveRows,
  TRANSFER_WIDGET_ROWS,
  formatMoveDate,
  type TransferMoveDoc,
  type TransferMoveSideView,
  type TransferMoveStatus,
} from "@/lib/transferMoves";

interface TransferMovesSidebarProps {
  moves: TransferMoveDoc[];
  /** 外層容器的寬度／間距留給頁面決定，手機版放主欄時只換這個 class。 */
  className?: string;
  /**
   * 列表容器的排列方式。桌機 200px 窄欄用預設的單欄直排；
   * 主欄全寬時由頁面換成多欄網格，免得單列被拉寬到排版鬆散。
   * Tailwind 的斷點看的是視窗寬度而不是容器寬度，所以這個只能由呼叫端決定，
   * 不能在元件裡寫一套 `sm:` 預設（那會讓桌機窄欄在大視窗下也被切成兩欄）。
   */
  listClassName?: string;
  /** 入口卡的額外 class（手機主欄限寬用）。 */
  entranceClassName?: string;
  /** 獨立頁面上頁標已經寫了「轉會動態」，關掉元件自己那一行免得重複。 */
  showHeading?: boolean;
}

/** 隊徽；去向／來處未定的那一側顯示 `?`，不畫隊徽。 */
function TeamSide({ side }: { side: TransferMoveSideView }) {
  if (!side.known) {
    return (
      <span className="w-4 h-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[9px] font-medium text-[var(--text-muted)] inline-flex items-center justify-center shrink-0">
        ?
      </span>
    );
  }
  if (side.logoUrl) {
    return (
      <img
        src={side.logoUrl}
        alt={side.label}
        title={side.label}
        className="w-4 h-4 object-contain shrink-0"
      />
    );
  }
  return (
    <span
      title={side.label}
      className="w-4 h-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[8px] font-medium text-[var(--text-secondary)] inline-flex items-center justify-center shrink-0"
    >
      {side.label.slice(0, 2)}
    </span>
  );
}

export default function TransferMovesSidebar({
  moves,
  className = "",
  listClassName = "flex flex-col gap-2",
  entranceClassName = "",
  showHeading = true,
}: TransferMovesSidebarProps) {
  const [tab, setTab] = useState<TransferMoveStatus>("official");
  const [gameIndex, setGameIndex] = useState(0);
  const game = TRANSFER_GAME_LIST[gameIndex];
  const rows = selectTransferMoveRows(
    moves || [],
    tab,
    undefined,
    game.slug as TransferGameSlug,
  );

  // 左右循環，不做停用狀態 —— 四款而已，按到底再按會回到第一款
  const step = (delta: number) =>
    setGameIndex((i) => (i + delta + TRANSFER_GAME_LIST.length) % TRANSFER_GAME_LIST.length);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        {showHeading ? (
          <h3 className="text-xs font-medium text-[var(--foreground)]">
            <a
              href={`/transfers/${game.slug}`}
              className="hover:text-[var(--accent)] transition-colors"
            >
              轉會動態
            </a>
          </h3>
        ) : (
          <span />
        )}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TransferMoveStatus)}
          size="sm"
        >
          <TabsList size="sm">
            <TabsTrigger value="official" size="sm">
              官宣
            </TabsTrigger>
            <TabsTrigger value="rumor" size="sm">
              傳聞
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 遊戲切換：左右各一顆，中間是目前這款。四款循環。 */}
      <div className="flex items-center justify-between gap-1 mb-2 px-1 py-1 rounded-[var(--radius-control)] bg-[var(--surface)]">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="上一款遊戲"
          className="w-5 h-5 inline-flex items-center justify-center rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-[background-color,color] duration-150 ease-[var(--ease-standard)] cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="inline-flex items-center gap-1.5 min-w-0">
          <GameMark slug={game.slug} label={game.label} className="h-3" />
          <span className="text-[11px] font-medium text-[var(--foreground)] truncate">
            {game.label}
          </span>
        </span>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label="下一款遊戲"
          className="w-5 h-5 inline-flex items-center justify-center rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-[background-color,color] duration-150 ease-[var(--ease-standard)] cursor-pointer shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 四格固定：某款遊戲還沒有事件時也撐住高度，底下的入口卡不會跟著上移 */}
      <MotionConfig reducedMotion="user">
          <div className={listClassName} key={`${game.slug}-${tab}`}>
            {rows.map((row, index) => (
              <motion.div
                key={`${game.slug}-${tab}-${row.key}`}
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{
                  duration: 0.22,
                  delay: index * 0.045,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <a
                  href={row.href}
                  title={row.sourceName ? `來源：${row.sourceName}` : undefined}
                  className="block p-2.5 rounded-[var(--radius-panel)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-[background-color] duration-150 ease-[var(--ease-standard)] shadow-xs"
                >
                  <div className="flex items-center gap-1.5">
                    {row.country ? <CountryFlag country={row.country} className="w-4 h-3" /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--foreground)] truncate leading-tight">
                        {row.playerName}
                      </p>
                      {/* 第二行一律佔位：官宣多半沒有定位、傳聞則帶著「傳聞加盟」，
                          有時有有時沒有會讓每列高度不一，切分頁時底下的入口卡會跳動。 */}
                      <p className="text-[10px] text-[var(--text-muted)] truncate leading-tight">
                        {row.roleLabel || "\u00A0"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-1.5 gap-1">
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <TeamSide side={row.from} />
                      <span aria-hidden="true">→</span>
                      <TeamSide side={row.to} />
                    </span>
                    <span className="tabular-nums shrink-0">
                      {formatMoveDate(row.date)}
                    </span>
                  </div>
                </a>
              </motion.div>
            ))}

            {/* 不足四則就補空格，維持版面高度；沒有任何事件時第一格放說明文字 */}
            {Array.from({ length: TRANSFER_WIDGET_ROWS - rows.length }, (_, i) => (
              <div
                key={`${game.slug}-${tab}-blank-${i}`}
                aria-hidden={rows.length > 0 || i > 0}
                className="p-2.5 rounded-[var(--radius-panel)]"
              >
                <p className="text-xs text-[var(--text-muted)] truncate leading-tight">
                  {rows.length === 0 && i === 0
                    ? `暫無${tab === "official" ? "官宣" : "傳聞"}消息`
                    : "\u00A0"}
                </p>
                <p className="text-[10px] leading-tight">{"\u00A0"}</p>
                <div className="h-4 mt-1.5" />
              </div>
            ))}
          </div>
      </MotionConfig>

      {/* 「進入轉會中心」入口卡。結構與動效沿用賽事中心入口卡（design.md §6、§14.4）。
          連結跟著上面選到的遊戲走，所以放在元件裡而不是另一支 .astro。 */}
      <a
        href={`/transfers/${game.slug}`}
        className={`group block p-3 mt-3 rounded-[var(--radius-panel)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-[transform,background-color,box-shadow] duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden ${entranceClassName}`}
      >
        <div className="flex items-center gap-1 mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] text-[10px] font-medium">
            轉會中心
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-xs font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
            進入轉會中心
          </span>
          <div className="w-6 h-6 rounded-full bg-[var(--surface-raised)] group-hover:bg-[var(--accent)] text-[var(--foreground)] group-hover:text-white flex items-center justify-center transition-[background-color,color,transform] duration-200 shadow-2xs shrink-0 group-hover:translate-x-0.5">
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </div>
      </a>
    </div>
  );
}

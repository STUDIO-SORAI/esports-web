'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../arc/button/button';
import { Tabs, TabsList, TabsTrigger } from '../arc/tabs/tabs';
import { GameMark } from './GameMark';
import {
  TRANSFER_GAME_LIST,
  transferGamePath,
  type TransferGameSlug,
} from '../../lib/transfers';

interface HomeTransferBoardProps {
  className?: string;
}

export const HomeTransferBoard: React.FC<HomeTransferBoardProps> = ({
  className = '',
}) => {
  const [activeGame, setActiveGame] = useState<TransferGameSlug>('valorant');

  return (
    <section
      aria-label="轉會中心"
      className={`arc-entrance w-full rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-xs px-4 py-3 sm:px-5 sm:py-3.5 ${className}`}
      style={{ '--stagger': 2 } as React.CSSProperties}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: Compact Feature Title & One-liner */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0">
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-[var(--foreground)] whitespace-nowrap">
            轉會中心
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] truncate">
            即時追蹤四大電競項目各賽區戰隊陣容、傳聞與轉會動態
          </p>
        </div>

        {/* Right: Arc UI Game Tabs + Arc UI Primary Button */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 shrink-0">
          <Tabs
            value={activeGame}
            onValueChange={(v) => setActiveGame(v as TransferGameSlug)}
            size="sm"
          >
            <TabsList size="sm" aria-label="選擇轉會名單遊戲">
              {TRANSFER_GAME_LIST.map((g) => (
                <TabsTrigger
                  key={g.slug}
                  value={g.slug}
                  size="sm"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 text-xs"
                >
                  <GameMark slug={g.slug} label={g.label} className="h-3.5" />
                  <span>{g.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Button
            as="a"
            href={transferGamePath(activeGame)}
            variant="primary"
            size="sm"
          >
            <span>查看名單</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HomeTransferBoard;

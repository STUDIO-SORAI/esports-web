import React from 'react';
import { getGameLogoSet } from '../../lib/config';
import type { TransferGameSlug } from '../../lib/transfers';

interface GameMarkProps {
  slug: TransferGameSlug;
  label: string;
  /** 高度由呼叫端決定（大標 h-12、選單 h-3.5），寬度一律 auto。 */
  className?: string;
}

/**
 * 遊戲 logo。深淺兩套各一張，與分類頁同一組圖。
 * 轉會頁大標、遊戲切換選單與首頁小部件共用。
 */
export const GameMark: React.FC<GameMarkProps> = ({ slug, label, className = '' }) => {
  const logos = getGameLogoSet(slug);
  if (!logos) return null;
  return (
    <span className="inline-flex items-center shrink-0">
      <img
        src={logos.dark}
        alt={label}
        className={`${className} w-auto object-contain opacity-90 dark:hidden`}
      />
      <img
        src={logos.white}
        alt={label}
        className={`${className} w-auto object-contain opacity-90 hidden dark:block`}
      />
    </span>
  );
};

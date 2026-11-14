import React from 'react';
import { renderEmbed } from './Embed';
import { splitBriefBody } from '../lib/briefBody';

/**
 * 電競快訊的短文。純文字段落維持原本的樣式與換行，
 * 單獨成行的網址／iframe 則交給文章共用的 renderEmbed，
 * 行為與文章內文一致（YouTube / Twitch / X / Threads / 連結預覽）。
 */
export function BriefBody({ body, compact = false }: { body: string; compact?: boolean }) {
  const blocks = React.useMemo(() => splitBriefBody(body), [body]);
  if (blocks.length === 0) return null;

  return (
    <div className={compact ? '' : 'mb-8'}>
      {blocks.map((block, i) =>
        block.type === 'embed' ? (
          <div key={`embed-${i}`} className={`not-prose ${compact ? 'my-3' : 'my-6'}`}>
            {renderEmbed(block.url)}
          </div>
        ) : (
          <p
            key={`text-${i}`}
            className={
              compact
                ? 'mt-1 text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap font-normal'
                : 'text-base md:text-lg text-[var(--foreground)] leading-relaxed whitespace-pre-wrap font-normal'
            }
          >
            {block.value}
          </p>
        )
      )}
    </div>
  );
}

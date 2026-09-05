import React from 'react';
import { renderEmbed } from './Embed';
import { splitBriefBody } from '../lib/briefBody';

/**
 * 戰報快訊的短文。純文字段落維持原本的樣式與換行，
 * 單獨成行的網址／iframe 則交給文章共用的 renderEmbed，
 * 行為與文章內文一致（YouTube / Twitch / X / Threads / 連結預覽）。
 */
export function BriefBody({ body }: { body: string }) {
  const blocks = React.useMemo(() => splitBriefBody(body), [body]);
  if (blocks.length === 0) return null;

  return (
    <div className="mb-8">
      {blocks.map((block, i) =>
        block.type === 'embed' ? (
          <div key={`embed-${i}`} className="my-6 not-prose">
            {renderEmbed(block.url)}
          </div>
        ) : (
          <p
            key={`text-${i}`}
            className="text-base md:text-lg text-[var(--ink)] dark:text-zinc-200 leading-relaxed whitespace-pre-wrap"
          >
            {block.value}
          </p>
        )
      )}
    </div>
  );
}

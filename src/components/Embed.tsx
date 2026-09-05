import React from 'react';
import { Tweet } from 'react-tweet';
import { LinkPreview } from './LinkPreview';
import { TwitchEmbed, parseTwitchUrl } from './TwitchEmbed';
import { ThreadsEmbed, parseThreadsUrl } from './ThreadsEmbed';
import { parseTweetId, parseYouTubeId, parseYouTubeStart } from '../lib/embedUrls';

export { parseTweetId, parseYouTubeId, parseYouTubeStart };

/**
 * 內文與快訊共用的嵌入渲染。文章（MarkdownContent）與戰報快訊（BriefBody）
 * 都走這裡，兩邊的 YouTube / Twitch / X / Threads / 連結預覽行為才會一致。
 */

const FRAME_WRAPPER_CLASS =
  'block my-8 rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 bg-black not-prose';

export const twitterComponents = {
  AvatarImg: (props: any) => <img {...props} referrerPolicy="no-referrer" />,
  MediaImg: (props: any) => <img {...props} referrerPolicy="no-referrer" />,
};

export const YouTubeFrame = ({ href }: { href: string }) => {
  const videoId = parseYouTubeId(href);
  if (!videoId) return null;
  const startSeconds = parseYouTubeStart(href);
  return (
    <span className={FRAME_WRAPPER_CLASS} style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
      <iframe
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, margin: 0, padding: 0, borderRadius: 0, maxHeight: 'none', display: 'block' }}
        src={`https://www.youtube.com/embed/${videoId}${startSeconds ? `?start=${startSeconds}` : ''}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </span>
  );
};

export const GenericFrame = ({ src, ...props }: { src: string } & Record<string, any>) => (
  <span className={FRAME_WRAPPER_CLASS} style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
    <iframe
      {...props}
      src={src}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, margin: 0, padding: 0, display: 'block' }}
      allowFullScreen
    />
  </span>
);

export const renderEmbed = (href: string) => {
  // Twitch Embed (Clip, VOD, Stream)
  const twitch = parseTwitchUrl(href);
  if (twitch) {
    return <TwitchEmbed url={href} />;
  }

  // YouTube Embed
  if (parseYouTubeId(href)) {
    return <YouTubeFrame href={href} />;
  }

  // Twitter/X Embed（含 vxtwitter / fxtwitter 鏡像）
  const tweetId = parseTweetId(href);
  if (tweetId) {
    return (
      <div className="flex justify-center my-8 w-full not-prose">
        <div className="w-full max-w-[480px]">
          <Tweet id={tweetId} components={twitterComponents} />
        </div>
      </div>
    );
  }

  // Threads Embed
  const threads = parseThreadsUrl(href);
  if (threads) {
    return <ThreadsEmbed url={href} />;
  }

  // Default Link Preview
  return <LinkPreview url={href} />;
};

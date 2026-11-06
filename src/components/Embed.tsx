import React from 'react';
import { Tweet } from 'react-tweet';
import { LinkPreview } from './LinkPreview';
import { TwitchEmbed, parseTwitchUrl } from './TwitchEmbed';
import { ThreadsEmbed, parseThreadsUrl } from './ThreadsEmbed';
import { parseTweetId, parseYouTubeId, parseYouTubeStart } from '../lib/embedUrls';
import { BriefMedia, isVideoSrc } from './BriefMedia';

export { parseTweetId, parseYouTubeId, parseYouTubeStart };

/**
 * 內文與快訊共用的嵌入渲染。文章（MarkdownContent）與戰報快訊（BriefBody）
 * 都走這裡，兩邊的 YouTube / Twitch / X / Threads / 連結預覽行為才會一致。
 */

const FRAME_WRAPPER_CLASS =
  'block my-8 rounded-xl overflow-hidden shadow-sm border border-[var(--border)] bg-black not-prose';

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

/**
 * 推文本體。額外處理推文影片：`video.twimg.com` 對 Referer 做白名單（只放行
 * x.com / twitter.com），從我們站上載入一律 403，瀏覽器就顯示「找不到支援的格式」。
 * `<video>` 沒有 `referrerpolicy` 屬性可用（那是 img / iframe 才有的），所以只能等它
 * 失敗之後，改用 no-referrer 的 fetch 抓回來換成 blob URL 再播。
 */
const TweetEmbed = ({ id }: { id: string }) => {
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const objectUrls: string[] = [];

    // 媒體的 error 事件不會冒泡，而且來源掛在 <source> 上時事件目標是 <source> 不是
    // <video>，所以要用捕獲階段接，並往上找一層。
    const onError = async (event: Event) => {
      const target = event.target as HTMLElement | null;
      const video =
        target instanceof HTMLVideoElement
          ? target
          : target?.parentElement instanceof HTMLVideoElement
            ? target.parentElement
            : null;
      if (!video) return;

      const src = video.currentSrc || video.querySelector('source')?.src;
      if (!src || src.startsWith('blob:')) return;

      try {
        const res = await fetch(src, { referrerPolicy: 'no-referrer' });
        if (!res.ok) return;
        const objectUrl = URL.createObjectURL(await res.blob());
        objectUrls.push(objectUrl);
        video.src = objectUrl;
        void video.play().catch(() => {});
      } catch {
        // 抓不回來就維持 react-tweet 原本的錯誤畫面，推文本體與「Watch on X」還在
      }
    };

    root.addEventListener('error', onError, true);
    return () => {
      root.removeEventListener('error', onError, true);
      objectUrls.forEach(URL.revokeObjectURL);
    };
  }, [id]);

  return (
    <div ref={rootRef} className="flex justify-center my-8 w-full not-prose">
      <div className="w-full max-w-[480px]">
        <Tweet id={id} components={twitterComponents} />
      </div>
    </div>
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

// 直接貼圖片 / GIF / 影片檔的網址時，連結預覽卡沒有意義 —— 要的就是那個檔案本身。
const DIRECT_MEDIA = /\.(jpe?g|png|gif|webp|avif|mp4|webm|ogv|mov|m4v)(?:[?#]|$)/i;

export const renderEmbed = (href: string) => {
  if (DIRECT_MEDIA.test(href)) {
    return (
      <span className="block my-6 not-prose">
        <BriefMedia
          src={href}
          className={`max-h-[520px] max-w-full w-auto h-auto object-contain rounded-xl border border-[var(--border)] ${
            isVideoSrc(href) ? 'bg-black' : ''
          }`}
        />
      </span>
    );
  }

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
    return <TweetEmbed id={tweetId} />;
  }

  // Threads Embed
  const threads = parseThreadsUrl(href);
  if (threads) {
    return <ThreadsEmbed url={href} />;
  }

  // Default Link Preview
  return <LinkPreview url={href} />;
};

import React from 'react';
import { useLightbox } from './Lightbox';

// 戰報的媒體可以是圖片、GIF 或影片檔。影片要用 <video> 播，
// 圖片則沿用文章內文那套點開放大（Lightbox）—— 戰隊圖卡、賽程表上的小字
// 在資訊流的寬度裡讀不出來，跟內文配圖是同一個問題。

const VIDEO_EXT = /\.(mp4|webm|ogv|mov|m4v)(?:[?#]|$)/i;

// 跟 class 上的 max-h-[520px] 同一個值：兩邊要一起改。
const MAX_HEIGHT = 520;

export function isVideoSrc(src: string, mime?: string): boolean {
  if (mime) return mime.startsWith('video/');
  return VIDEO_EXT.test(src);
}

interface Props {
  src: string;
  alt?: string;
  mime?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function BriefMedia({ src, alt = '', mime, width, height, className }: Props) {
  const { open, overlay } = useLightbox();
  if (!src) return null;

  // 容器是 w-fit，圖片是 w-auto：圖載入前 intrinsic 尺寸是 0，寬度就收成 0，
  // 於是 lazy 永遠不觸發、圖永遠不載 —— 只給 aspect-ratio 救不了，
  // width 與 height 都是 auto 時它沒有可依附的邊長。所以直接給一個確定的寬度：
  // 不放大原圖，也不超過「高度上限換算回來的寬度」（超過就會被 max-h 夾住，
  // 在 object-contain 下露出左右黑邊）。
  //
  // 這裡刻意不寫 min(100%, …)：百分比會讓圖片對外的 max-content 貢獻變成 0，
  // 外層 w-fit 容器就跟著縮成 0 寬，又繞回同一個死結。欄寬的上限交給
  // class 上的 max-w-full（max-width 的百分比不參與內在尺寸計算）。
  const known = Boolean(width && height);
  const style = known
    ? {
        aspectRatio: `${width}/${height}`,
        width: `min(${width}px, ${Math.round((MAX_HEIGHT * width!) / height!)}px)`,
      }
    : undefined;

  if (isVideoSrc(src, mime)) {
    return (
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        width={width || undefined}
        height={height || undefined}
        style={style}
        className={className}
      />
    );
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        width={width || undefined}
        height={height || undefined}
        loading={known ? 'lazy' : 'eager'}
        decoding="async"
        style={style}
        className={`${className || ''} cursor-zoom-in`}
        onClick={() => open(src, alt)}
      />
      {overlay}
    </>
  );
}

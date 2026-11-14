"use client";

/**
 * 對話框開啟時鎖住背景捲動。
 *
 * 主要靠 globals.css 的 `html { scrollbar-gutter: stable }`：捲軸的空間永遠
 * 保留著，overflow 一改也不會有寬度變化。這裡是給不支援那個屬性的瀏覽器
 * （Safari 18.2 以前）的後備——量出捲軸寬度，補等寬的 padding-right 回去。
 *
 * 用計數而不是布林：同時開兩層對話框時，內層關掉不該把外層的鎖一起解開。
 */

let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

function supportsScrollbarGutter(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? CSS.supports('scrollbar-gutter', 'stable')
    : false;
}

export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {};

  const body = document.body;

  if (lockCount === 0) {
    previousOverflow = body.style.overflow;
    previousPaddingRight = body.style.paddingRight;

    if (!supportsScrollbarGutter()) {
      // innerWidth 含捲軸、clientWidth 不含，差值就是捲軸寬度。
      // 捲軸是覆蓋式的（macOS 預設）時差值為 0，本來就不會位移。
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${current + scrollbarWidth}px`;
      }
    }

    body.style.overflow = 'hidden';
  }

  lockCount += 1;

  // React 的 effect cleanup 在嚴格模式下可能被呼叫兩次，自己記住有沒有還過。
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    }
  };
}

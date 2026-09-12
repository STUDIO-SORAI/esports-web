"use client";

import { useEffect, useRef } from "react";
import { lockBodyScroll } from "./scrollLock";

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * 宣告了 aria-modal 的東西就得表現得像 modal：焦點不能跑到後面的頁面，
 * 關掉之後也要回到當初開啟它的那顆按鈕，不然鍵盤使用者會掉回文件最上面。
 *
 * 回傳的 ref 掛在對話框的容器上。順便處理 ESC 與背景捲動鎖。
 */
export function useDialogFocus<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<T>(null);

  // onClose 每次 render 都是新的函式；放進 deps 會讓整個 effect 重跑，
  // 連帶把「當初的觸發元素」重新抓成對話框內部的元素。
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    // 注意：對話框內若有 autoFocus 的欄位，它會在這個 effect 之前就搶走焦點，
    // 這裡抓到的就會是對話框自己的欄位而不是觸發它的按鈕，關閉時也就還原不了。
    // 所以對話框內不要用 autoFocus，初始焦點交給下面處理。
    const trigger = document.activeElement as HTMLElement | null;
    const node = containerRef.current;

    const focusables = () =>
      node
        ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
          )
        : [];

    // autoFocus 的欄位已經在裡面的話就不要搶走焦點
    if (!node?.contains(document.activeElement)) focusables()[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // 焦點已經跑到對話框外（例如從網址列 Tab 回來）就直接拉回來，
      // 只比對頭尾兩個元素的話這種情況會漏掉。
      if (!node?.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    const unlockScroll = lockBodyScroll();

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      unlockScroll();
      trigger?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  return containerRef;
}

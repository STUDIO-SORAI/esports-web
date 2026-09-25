import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CloseIcon } from './Icons';
import { lockBodyScroll } from './scrollLock';
import { createPortal } from 'react-dom';

// 內文裡的圖片是配圖，尺寸被壓在一欄文字的寬度內；戰隊圖卡、賽程表這類圖上有小字的
// 素材在那個尺寸下讀不出來。點開就是解法：把圖片放到螢幕能給的最大尺寸，蓋在全站之上。
//
// 這裡用 portal 掛到 <body>，不是就地渲染。文章區塊本身有 transform 與 z-index，
// 會形成 stacking context 與 containing block，position:fixed 的遮罩若渲染在裡面
// 會被困在該層，可能疊在導覽列底下。
//
// hook 只把元素回傳、不自己掛載，開圖的人決定它寫在自己樹的哪裡。

interface Shown {
  src: string;
  alt: string;
}

export function useLightbox() {
  const [shown, setShown] = useState<Shown | null>(null);
  const open = useCallback((src: string, alt: string) => setShown({ src, alt }), []);
  const close = useCallback(() => setShown(null), []);
  return {
    open,
    overlay: shown ? <Lightbox src={shown.src} alt={shown.alt} onClose={close} /> : null,
  };
}

// 縮到滿版是地板：這個檢視存在的目的就是看完整張圖，再縮小只會多出黑邊。
// 天花板是給圖卡用的 —— 賽程表放到 8 倍，上面的小字才終於解得出來。
const MIN_SCALE = 1;
const MAX_SCALE = 8;
// 一格滾輪約 100 deltaY，換算下來一格約 16%。用指數而非加法，因為縮放是靠比例感知的：
// 同一格滾輪在 1 倍與 6 倍時，手感應該一樣。
const WHEEL_SENSITIVITY = 0.0015;
// 雙擊 / 雙擊觸控會停在的倍率。夠近到值得比這個手勢，又不會近到整張圖變成材質、
// 得拖著找才認得出原本是什麼。
const DOUBLE_ZOOM = 2.5;
// 「點一下」的定義是按下去沒移動、也沒停留。兩個門檻都放寬：手指本來就不精準，
// 而沒認出點擊的代價是使用者比了手勢卻毫無反應。
const TAP_SLOP = 12;
const TAP_MS = 400;
// 兩次點擊落在夠近的時間與位置才算同一個手勢。300ms 是平台慣例，距離門檻則是避免
// 使用者刻意點兩個對角時被併成一次縮放。
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 40;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

interface View {
  scale: number;
  x: number;
  y: number;
}

interface TrackedPointer {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
}

interface Pinch {
  dist: number;
  midX: number;
  midY: number;
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  // scale 加上讓「游標指到的那一點」留在原地的位移。單位值就是「滿版置中」，
  // 也是關閉時回到的狀態 —— 遮罩會卸載，不會留下上次的縮放。
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  // 同一個值，但比 state 早一幀可用。滾輪事件比 React 重繪快 —— 快速滾動時
  // 第一次 setView 還沒畫出來就已經來了好幾發 —— 在那裡讀 view 會讓每一發都從
  // 同一個過期的 scale 疊加，結果整串滾輪只移動一格。每一步算完就寫在這裡，
  // 下一步永遠是從圖片真正的位置接續。
  const viewRef = useRef<View>(view);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  // 目前壓在圖片上的所有手指。一根是平移、兩根是縮放，這張 map 讓手勢可以中途改變心意
  // —— 拖曳到一半多放一根手指、或放開一根繼續用另一根 —— 而圖片不會跳動。
  const pointersRef = useRef(new Map<number, TrackedPointer>());
  const pinchRef = useRef<Pinch | null>(null);
  // 手勢一變成雙指縮放就設起來，最後一根手指離開才清掉。
  // 結束縮放的那兩次放開不可以被當成點擊。
  const pinchedRef = useRef(false);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // 圖片套用 transform 之前的貼合位置與尺寸。
  //
  // 這四個值在燈箱開著的期間不會變 —— offsetLeft / offsetWidth 量的是排版結果，
  // transform 動不到它們 —— 只有視窗尺寸改變或圖片載入完成時才需要重新量。
  //
  // 快取的理由是讀寫順序：每一步縮放/平移都會寫 inline transform，弄髒 layout 樹；
  // 若下一個 pointermove 又去讀 offsetWidth，瀏覽器就得先把 layout 重算完才能回答，
  // 等於每個手勢事件強制 reflow 一次。量一次存起來，手勢期間就變成純寫入。
  const metricsRef = useRef({ left: 0, top: 0, width: 0, height: 0 });

  const measure = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    metricsRef.current = {
      left: img.offsetLeft,
      top: img.offsetTop,
      width: img.offsetWidth,
      height: img.offsetHeight,
    };
  }, []);

  const applyView = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  // 圖片最多能被推到邊緣切齊螢幕中線為止。只有溢出的那部分才有平移的意義；
  // 讓它繼續跑會允許把圖片整個拖出畫面，只剩空白遮罩，除了關掉沒有別的路回來。
  const clampOffset = useCallback((scale: number, x: number, y: number) => {
    const { width, height } = metricsRef.current;
    // width 為 0 代表圖片還沒載完，還沒有「貼合尺寸」可談。
    if (!width || scale <= 1) return { x: 0, y: 0 };
    // 溢出的量就是 scale 加上去的那部分。
    const overflowX = Math.max(0, (width * scale - width) / 2);
    const overflowY = Math.max(0, (height * scale - height) / 2);
    return { x: clamp(x, -overflowX, overflowX), y: clamp(y, -overflowY, overflowY) };
  }, []);

  const zoomBy = useCallback(
    (factor: number, originX?: number, originY?: number) => {
      const { scale, x, y } = viewRef.current;
      const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
      if (next === scale) return;
      if (next === MIN_SCALE) return applyView({ scale: next, x: 0, y: 0 });

      const { left, top, width, height } = metricsRef.current;
      let nx = x;
      let ny = y;
      if (width && originX != null && originY != null) {
        // 圖片中心目前的位置：貼合位置（transform 動不到）加上我們自己帶著的位移。
        // 這裡刻意不用 bounding rect —— 後者回報的是上一個「已繪製」的畫面，
        // 快速滾動時會慢一拍；而且讀它會強制 reflow，見 metricsRef 的說明。
        const centerX = left + width / 2 + x;
        const centerY = top + height / 2 + y;
        // 以該中心縮放，會把游標底下那一點移到原本 k 倍的位置；
        // 反向平移這個差值，就是把它釘回原處。
        const k = next / scale;
        nx -= (originX - centerX) * (k - 1);
        ny -= (originY - centerY) * (k - 1);
      }
      applyView({ scale: next, ...clampOffset(next, nx, ny) });
    },
    [applyView, clampOffset],
  );

  useEffect(() => {
    triggerRef.current = document.activeElement;
    closeRef.current?.focus();

    // 用捕獲階段，而且事件就停在這裡：一次按鍵只能有一個意思 —— 圖片開著的時候
    // ESC 是關圖片，底下的東西不是使用者正在看的。
    //
    // 縮放快捷鍵擺在這裡的理由，跟滾輪不能是唯一手段一樣：滾輪代表滑鼠，
    // 用觸控板或鍵盤的人一樣該有辦法把圖卡上的小字放大。
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        return onClose();
      }
      if (e.key === '+' || e.key === '=') return zoomBy(1.25);
      if (e.key === '-' || e.key === '_') return zoomBy(1 / 1.25);
      if (e.key === '0') return applyView({ scale: 1, x: 0, y: 0 });
    }

    // 背後的文章不該跟著捲動
    const unlockScroll = lockBodyScroll();

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      unlockScroll();
      // 焦點回到開啟這張圖的縮圖，而不是文件最上面
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus({ preventScroll: true });
    };
  }, [onClose, zoomBy, applyView]);

  // 量測只發生在這三個時機：掛載當下、圖片載入完成（在那之前沒有貼合尺寸可談，
  // 見 <img onLoad>）、以及視窗尺寸改變。手勢期間一律讀 metricsRef，不碰 DOM。
  useEffect(() => {
    measure();
    function handleResize() {
      measure();
      // 重新貼合之後，原本的位移可能已經超出新的邊界，就地夾回來。
      const { scale, x, y } = viewRef.current;
      applyView({ scale, ...clampOffset(scale, x, y) });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measure, applyView, clampOffset]);

  // 不用 onWheel：React 是以 passive 方式掛 wheel，而 passive listener 不能
  // preventDefault —— 這裡非擋不可，否則瀏覽器自己的 ctrl+滾輪縮放會疊在我們之上，
  // 整個頁面跟著圖片一起縮放。
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * WHEEL_SENSITIVITY), e.clientX, e.clientY);
    }
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoomBy]);

  // 最早按下的兩根手指，也就是縮放要量的那兩根。map 保有插入順序，
  // 所以中途多放的第三根會被忽略，不會在拉到一半重新定義基準距離。
  function pinchPair(): Pinch | null {
    const [a, b] = [...pointersRef.current.values()];
    return b
      ? { dist: Math.hypot(b.x - a.x, b.y - a.y), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 }
      : null;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLImageElement>) {
    // 捕獲是加分項、不是機制本身 —— 瀏覽器不肯交出來的 pointer
    // 不該把整個手勢一起帶走。
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 手勢照樣能用，只是手指移出圖片外就不再追蹤 */
    }
    // startX/startY/startTime 是點擊判定用的：按下的位置與時間。
    pointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      startTime: e.timeStamp,
    });

    const pinch = pinchPair();
    if (pinch) {
      // 第二根手指落下就結束它旁邊那個平移：從這裡開始手勢改以兩指之間量測，
      // 中點負責平移。
      dragRef.current = null;
      pinchRef.current = pinch;
      pinchedRef.current = true;
      return;
    }
    // 單指拖曳只有在有東西可平移時才有意義。滿版尺寸下觸控仍然算點擊，
    // 而點在背景上是關閉。
    if (viewRef.current.scale <= 1) return;
    // pointer capture 同時也是讓「拖到圖片外」不會變成落在背景上的 click，
    // 否則平移到一半就把燈箱關掉了。
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLImageElement>) {
    const tracked = pointersRef.current.get(e.pointerId);
    if (tracked) {
      tracked.x = e.clientX;
      tracked.y = e.clientY;
    }

    // 雙指：兩指之間的距離就是倍率，正中間那一點既是縮放的錨點也是平移的把手 ——
    // 所以一個雙指手勢可以同時移動與縮放，跟手機上其他地方的行為一致。
    const pinch = pinchPair();
    if (pinch) {
      const last = pinchRef.current;
      pinchRef.current = pinch;
      if (!last || last.dist === 0) return;
      zoomBy(pinch.dist / last.dist, pinch.midX, pinch.midY);
      const { scale, x, y } = viewRef.current;
      applyView({
        scale,
        ...clampOffset(scale, x + (pinch.midX - last.midX), y + (pinch.midY - last.midY)),
      });
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    const { scale, x, y } = viewRef.current;
    applyView({ scale, ...clampOffset(scale, x + dx, y + dy) });
  }

  // 放大到被指到的那一點，或退回整張圖。錨點是這個手勢的重點：
  // 雙擊圖卡的角落應該是把那個角落拉近，而不是把圖片正中央拉近。
  function toggleZoomAt(x: number, y: number) {
    if (viewRef.current.scale > 1) applyView({ scale: 1, x: 0, y: 0 });
    else zoomBy(DOUBLE_ZOOM, x, y);
  }

  // 觸控的 dblclick 不可靠 —— 瀏覽器可能不發、可能被自己的雙擊縮放延遲擋住、
  // 也可能帶著第一次點擊的座標送出。所以這個手勢在這裡自己量：
  // 兩次都沒移動的按放，且時間與位置都夠接近。
  function tapped(e: React.PointerEvent<HTMLImageElement>, lifted: TrackedPointer) {
    if (e.pointerType === 'mouse') return; // 滑鼠已經由 dblclick 處理
    const moved = Math.hypot(e.clientX - lifted.startX, e.clientY - lifted.startY);
    if (moved > TAP_SLOP || e.timeStamp - lifted.startTime > TAP_MS) {
      lastTapRef.current = null;
      return;
    }
    const previous = lastTapRef.current;
    lastTapRef.current = { x: e.clientX, y: e.clientY, time: e.timeStamp };
    if (
      previous &&
      e.timeStamp - previous.time < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - previous.x, e.clientY - previous.y) < DOUBLE_TAP_SLOP
    ) {
      lastTapRef.current = null;
      toggleZoomAt(e.clientX, e.clientY);
    }
  }

  function endDrag(e: React.PointerEvent<HTMLImageElement>) {
    const lifted = pointersRef.current.get(e.pointerId);
    pointersRef.current.delete(e.pointerId);
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
    if (e.type === 'pointerup' && lifted && !pinchedRef.current) tapped(e, lifted);
    if (pointersRef.current.size === 0) pinchedRef.current = false;
    // 雙指放開一根時，手勢是交棒給還在的那根、而不是結束。
    // 重新以還按著的手指為基準，才不會讓圖片跳掉兩指之間的那段距離。
    pinchRef.current = null;
    const [remaining] = [...pointersRef.current.entries()];
    if (remaining && viewRef.current.scale > 1) {
      const [id, pt] = remaining;
      dragRef.current = { id, x: pt.x, y: pt.y };
    }
  }

  const zoomed = view.scale > 1;

  return createPortal(
    // 背景跟關閉鈕一樣是關閉的方式 —— 點圖片以外的任何地方都會關掉，
    // 這是預覽在其他地方一致的行為。圖片本身擋掉 click，
    // 所以拖曳或按右鍵另存時不會把正在看的東西關掉。
    <div
      ref={overlayRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt || '圖片預覽'}
      onClick={onClose}
    >
      <button ref={closeRef} type="button" className="lightbox-close" onClick={onClose} aria-label="關閉圖片預覽">
        <CloseIcon size={24} />
      </button>
      <img
        ref={imageRef}
        className="lightbox-image"
        data-zoomed={zoomed || undefined}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        onClick={(e) => e.stopPropagation()}
        // 拉近你指到的東西，再退回整張圖 —— 兩者共用同一個手勢，
        // 而這個手勢在其他看圖工具裡就是這個意思。觸控不會走到這裡，見 tapped()。
        onDoubleClick={(e) => {
          e.stopPropagation();
          toggleZoomAt(e.clientX, e.clientY);
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        draggable={false}
        decoding="async"
        // 掛載當下圖片通常還沒解碼完，offsetWidth 是 0。載完才是真正的貼合尺寸。
        onLoad={measure}
      />
    </div>,
    document.body,
  );
}

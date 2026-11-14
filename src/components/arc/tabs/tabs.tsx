"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { createContext, useCallback, useContext, useId, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, RefObject } from "react";
import { ChevronLeft as NavArrowLeft, ChevronRight as NavArrowRight } from "lucide-react";
import { AnimatePresence, LayoutGroup, animate, motion, useReducedMotion } from "motion/react";
import type { AnimationPlaybackControls, Variants } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./tabs.module.css";

type RootProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Root>;

interface TabsContextValue {
  active: string;
  layoutId: string;
  direction: number;
  size?: "sm" | "md";
  panelHeightRef: RefObject<number | null>;
  leavingRectRef: RefObject<DOMRect | null>;
}

const TabsContext = createContext<TabsContextValue>({
  active: "",
  layoutId: "tabs",
  direction: 1,
  size: "md",
  panelHeightRef: { current: null },
  leavingRectRef: { current: null },
});

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  size = "md",
  ...props
}: RootProps & { size?: "sm" | "md" }) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const [direction, setDirection] = useState(1);
  const active = value ?? internal;
  const layoutId = useId();
  const root = useRef<HTMLDivElement>(null);
  const panelHeightRef = useRef<number | null>(null);
  const leavingRectRef = useRef<DOMRect | null>(null);

  function handleChange(next: string) {
    const frame = root.current;
    leavingRectRef.current = frame?.querySelector(':scope > [role="tabpanel"][data-state="active"]')?.getBoundingClientRect() ?? null;
    const order = frame
      ? Array.from(frame.querySelectorAll<HTMLElement>('[role="tab"][data-value]'))
          .filter((tab) => tab.closest(`.${styles.root}`) === frame)
          .map((tab) => tab.dataset.value)
      : [];
    const from = order.indexOf(active);
    const to = order.indexOf(next);
    if (from >= 0 && to >= 0 && from !== to) setDirection(to > from ? 1 : -1);
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  return (
    <TabsContext.Provider value={{ active, layoutId, direction, size, panelHeightRef, leavingRectRef }}>
      <LayoutGroup id={layoutId}>
        <TabsPrimitive.Root
          {...props}
          ref={root}
          className={[styles.root, className].filter(Boolean).join(" ")}
          value={active}
          onValueChange={handleChange}
        />
      </LayoutGroup>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  size: listSize,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { size?: "sm" | "md" }) {
  const { active, size: contextSize } = useContext(TabsContext);
  const size = listSize ?? contextSize ?? "md";
  const reduced = useReducedMotion();
  const shell = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ overflow: false, left: false, right: false });

  const update = useCallback(() => {
    const frame = shell.current;
    const scroll = viewport.current;
    if (!frame || !scroll) return;
    const max = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
    const next = {
      overflow: scroll.scrollWidth > frame.clientWidth + 1,
      left: scroll.scrollLeft > 1,
      right: scroll.scrollLeft < max - 1,
    };
    setEdges((previous) =>
      previous.overflow === next.overflow && previous.left === next.left && previous.right === next.right
        ? previous
        : next
    );
  }, []);

  const reveal = useCallback(
    (tab: HTMLElement | null) => {
      const scroll = viewport.current;
      if (!scroll || !tab) return;
      const frame = scroll.getBoundingClientRect();
      const item = tab.getBoundingClientRect();
      const max = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
      const left = frame.left + (scroll.scrollLeft > 1 ? 34 : 0);
      const right = frame.right - (scroll.scrollLeft < max - 1 ? 34 : 0);
      const delta = item.left < left ? item.left - left : item.right > right ? item.right - right : 0;
      if (delta) scroll.scrollBy({ left: delta, behavior: reduced ? "instant" : "smooth" });
    },
    [reduced]
  );

  useLayoutEffect(() => {
    const frame = shell.current;
    const scroll = viewport.current;
    const content = list.current;
    if (!frame || !scroll || !content) return;
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(scroll);
    observer.observe(content);
    scroll.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      scroll.removeEventListener("scroll", update);
    };
  }, [update]);

  useLayoutEffect(() => {
    reveal(list.current?.querySelector<HTMLElement>('[role="tab"][data-state="active"]') ?? null);
  }, [active, reveal]);

  const scrollTabs = (direction: number) =>
    viewport.current?.scrollBy({
      left: direction * (viewport.current?.clientWidth ?? 0) * 0.75,
      behavior: reduced ? "instant" : "smooth",
    });

  return (
    <div
      ref={shell}
      className={styles.listShell}
      data-size={size}
      data-overflow={edges.overflow}
      data-left={edges.left}
      data-right={edges.right}
    >
      {edges.overflow && (
        <button
          type="button"
          className={`${styles.scrollButton} ${styles.scrollLeft}`}
          aria-label="向左捲動標籤"
          disabled={!edges.left}
          onClick={() => scrollTabs(-1)}
        >
          <NavArrowLeft width={17} height={17} aria-hidden="true" />
        </button>
      )}
      <motion.div
        ref={viewport}
        layoutScroll
        className={styles.viewport}
        onFocusCapture={(event) => {
          if (event.target instanceof HTMLElement && event.target.getAttribute("role") === "tab")
            reveal(event.target);
        }}
      >
        <TabsPrimitive.List
          {...props}
          ref={list}
          data-size={size}
          className={[styles.list, className].filter(Boolean).join(" ")}
        />
      </motion.div>
      {edges.overflow && (
        <button
          type="button"
          className={`${styles.scrollButton} ${styles.scrollRight}`}
          aria-label="向右捲動標籤"
          disabled={!edges.right}
          onClick={() => scrollTabs(1)}
        >
          <NavArrowRight width={17} height={17} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function TabsTrigger({
  className,
  children,
  value,
  size: triggerSize,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  size?: "sm" | "md";
}) {
  const { active, size: contextSize } = useContext(TabsContext);
  const size = triggerSize ?? contextSize ?? "md";
  const reduced = useReducedMotion();

  return (
    <TabsPrimitive.Trigger
      {...props}
      value={value}
      data-value={value}
      data-size={size}
      className={[styles.trigger, className].filter(Boolean).join(" ")}
    >
      {active === value && (
        <motion.span
          className={styles.selection}
          layoutId="selection"
          layoutDependency={active}
          transition={reduced ? { duration: 0 } : motionTokens.spring.morph}
          aria-hidden="true"
        />
      )}
      <span className={styles.triggerLabel}>{children}</span>
    </TabsPrimitive.Trigger>
  );
}

const panelMotion: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 8 }),
  center: {
    opacity: 1,
    x: 0,
    transition: {
      opacity: { duration: motionTokens.duration.standard, ease: [...motionTokens.ease.enter] },
      x: motionTokens.spring.smooth,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -6,
    transition: { duration: motionTokens.duration.instant, ease: [...motionTokens.ease.standard] },
  }),
};

const panelFade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: motionTokens.duration.fast } },
  exit: { opacity: 0, transition: { duration: motionTokens.duration.instant } },
};

export function TabsContent({
  className,
  value,
  forceMount,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  const { active, direction, panelHeightRef, leavingRectRef } = useContext(TabsContext);
  const reduced = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const selected = active === value;
  const classes = [styles.content, className].filter(Boolean).join(" ");

  useLayoutEffect(() => {
    const node = panel.current;
    if (!node || forceMount) return;
    if (!selected) {
      const before = leavingRectRef.current;
      const now = node.getBoundingClientRect();
      if (before) node.style.translate = `${before.left - now.left}px ${before.top - now.top}px`;
      node.inert = true;
      return;
    }
    node.style.translate = "";
    node.inert = false;
    const from = panelHeightRef.current;
    const to = node.offsetHeight;
    let controls: AnimationPlaybackControls | undefined;
    const release = () => {
      node.style.height = "";
      node.style.overflow = "";
    };
    if (from !== null && Math.abs(from - to) > 1 && !reduced) {
      if (to > from) node.style.overflow = "clip";
      controls = animate(node, { height: [from, to] }, { ...motionTokens.spring.smooth, onComplete: release });
    }
    panelHeightRef.current = controls && from !== null ? from : to;
    const observer = new ResizeObserver(() => {
      panelHeightRef.current = node.offsetHeight;
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      controls?.stop();
      release();
    };
  }, [selected, reduced, forceMount, panelHeightRef, leavingRectRef]);

  if (forceMount) {
    return (
      <TabsPrimitive.Content {...props} value={value} forceMount className={classes}>
        {children}
      </TabsPrimitive.Content>
    );
  }

  return (
    <AnimatePresence initial={false} mode="popLayout" custom={direction}>
      {selected && (
        <TabsPrimitive.Content {...props} key={value} value={value} forceMount asChild>
          <motion.div
            ref={panel}
            className={classes}
            custom={direction}
            variants={reduced ? panelFade : panelMotion}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {children}
          </motion.div>
        </TabsPrimitive.Content>
      )}
    </AnimatePresence>
  );
}

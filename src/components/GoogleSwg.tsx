"use client";

import { useEffect } from "react";

const SWG_SRC = "https://news.google.com/swg/js/v1/swg-basic.js";
const PRODUCT_ID = "CAowkZjGDA:openaccess";

type SwgSubscriptions = {
  init: (config: {
    type: string;
    isPartOfType: string[];
    isPartOfProductId: string;
    clientOptions: { theme: string; lang: string };
  }) => void;
};

type SwgWindow = Window & {
  SWG_BASIC?: Array<(basicSubscriptions: SwgSubscriptions) => void>;
};

// 同一頁只 init 一次（含 React Strict Mode 雙重 effect）
let didInit = false;

function injectAndInit() {
  if (didInit) return;
  didInit = true;

  const w = window as SwgWindow;
  (w.SWG_BASIC = w.SWG_BASIC || []).push((basicSubscriptions) => {
    basicSubscriptions.init({
      type: "NewsArticle",
      isPartOfType: ["Product"],
      isPartOfProductId: PRODUCT_ID,
      clientOptions: { theme: "dark", lang: "zh-TW" },
    });
  });

  if (!document.querySelector(`script[src="${SWG_SRC}"]`)) {
    const script = document.createElement("script");
    script.src = SWG_SRC;
    script.async = true;
    document.head.appendChild(script);
  }
}

/** 目標元素進到視窗後才載入 Google News SWG Basic，避免一進頁就彈窗。 */
export function GoogleSwg({ targetSelector }: { targetSelector: string }) {
  useEffect(() => {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        injectAndInit();
      }
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetSelector]);

  return null;
}

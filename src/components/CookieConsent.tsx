"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 檢查是否已經同意過 cookie
    const hasConsented = localStorage.getItem("cookie-consent");
    if (!hasConsented) {
      // 延遲一點點顯示，以免干擾畫面載入
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("cookie-consent", "true");
      window.dispatchEvent(new Event("cookie-consent-accepted"));
    } catch {}
    setShow(false);
  };

  return (
    // framer-motion 走 inline style 與 WAAPI，globals.css 那個
    // @media (prefers-reduced-motion) 區塊完全管不到它 —— 沒有這一層，開了
    // 「減少動態效果」的機器上這張橫幅照樣彈上來 150px。reducedMotion="user"
    // 會把位移拿掉、只留淡入，跟站上其餘動效在該設定下的行為一致。
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0, transition: { duration: 0.3 } }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-0 left-0 right-0 z-[100000] p-3 md:p-4 pointer-events-none flex justify-center"
          >
            {/*
              這裡原本是 backdrop-blur-lg（16px）。橫幅是用 spring 位移 150px 上來的，
              而移動中的 backdrop-filter 每一幀都要重新模糊它底下那塊區域 ——
              spring 沒有固定時長，這個組合大約要付 600~900ms 的代價。

              而且那個模糊在深色主題下根本看不見（底色是不透明的 #111112）；
              淺色主題下之所以看得見，是因為 bg-[var(--surface-elevated)] 這個
              變數全專案沒有定義、根本沒生效，模糊才變成唯一的背景。
              補上真正的底色之後，模糊就沒有存在理由了。
            */}
            <div className="w-full max-w-4xl bg-white dark:bg-[#111112] border border-zinc-200 dark:border-zinc-800 p-4 md:px-6 md:py-4 rounded-lg shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto">

              <div className="flex flex-col gap-0.5 text-zinc-600 dark:text-zinc-400">
                <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                  網站 Cookie 使用聲明
                </h3>
                <p className="leading-relaxed text-xs">
                  我們使用必要的功能 Cookie（如主題偏好）以及第一方瀏覽統計，以改善內容與閱讀體驗。詳見
                  <a href="/privacy" className="underline underline-offset-2 hover:text-red-500 dark:hover:text-red-400">
                    隱私權政策
                  </a>
                  。
                </p>
              </div>

              <div className="flex shrink-0 w-full md:w-auto mt-1 md:mt-0">
                <button
                  onClick={handleAccept}
                  className="w-full md:w-auto px-6 py-2 bg-zinc-800 dark:bg-red-600 text-white font-bold rounded hover:bg-black dark:hover:bg-red-700 transition-colors uppercase tracking-wider text-xs shadow-sm"
                >
                  我同意 / Accept
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

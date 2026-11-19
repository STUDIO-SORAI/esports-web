"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Button } from "@/components/arc/button/button";

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
            <div className="w-full max-w-4xl bg-[var(--surface-raised)] border border-[var(--border)] p-4 md:px-6 md:py-4 rounded-[var(--radius-panel)] shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto">
              <div className="flex flex-col gap-0.5 text-[var(--text-secondary)]">
                <h3 className="font-medium text-sm text-[var(--foreground)]">
                  網站 Cookie 使用聲明
                </h3>
                <p className="leading-relaxed text-xs">
                  我們使用必要的功能 Cookie（如主題偏好）以及第一方瀏覽統計，以改善內容與閱讀體驗。詳見
                  <a href="/privacy" className="underline underline-offset-2 text-[var(--accent)] hover:opacity-80">
                    隱私權政策
                  </a>
                  。
                </p>
              </div>

              <div className="flex shrink-0 w-full md:w-auto mt-1 md:mt-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAccept}
                  className="w-full md:w-auto font-medium"
                >
                  我同意 / Accept
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

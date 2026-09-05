import { useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { GradientButton } from "@/components/ui/gradient-button";
import { GOOGLE_SOURCE_URL } from "@/lib/config";

export { GOOGLE_SOURCE_URL };

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <img
      src="/Google_Favicon_2025.svg"
      alt="Google"
      width={size}
      height={size}
      className="shrink-0 object-contain"
    />
  );
}

export function GoogleSourceBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem("sorai_google_source_dismissed");
      if (isDismissed) return;

      const hasCookieConsented = localStorage.getItem("cookie-consent");
      if (hasCookieConsented) {
        const timer = setTimeout(() => {
          setShow(true);
        }, 3000);
        return () => clearTimeout(timer);
      }

      const handleCookieAccepted = () => {
        const timer = setTimeout(() => {
          setShow(true);
        }, 3000);
      };

      window.addEventListener("cookie-consent-accepted", handleCookieAccepted, { once: true });
      return () => window.removeEventListener("cookie-consent-accepted", handleCookieAccepted);
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem("sorai_google_source_dismissed", "true");
    } catch {}
    setShow(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {show && (
          <motion.aside
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0, transition: { duration: 0.3 } }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-0 left-0 right-0 z-[99999] p-3 md:p-4 pointer-events-none flex justify-center"
            aria-label="Google 優先新聞來源提示"
          >
            <div className="relative w-full max-w-4xl bg-white dark:bg-[#111112] border border-zinc-200 dark:border-zinc-800 p-3.5 sm:p-4 md:px-6 md:py-4 rounded-xl md:rounded-lg shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 pointer-events-auto">
              
              {/* Mobile Top Row: Description + Compact Red Close Button */}
              <div className="flex md:hidden items-center justify-between gap-3 w-full">
                <p className="leading-snug text-xs text-zinc-600 dark:text-zinc-400 flex-1">
                  在 Google 第一時間掌握電競快訊與深度專欄。
                </p>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-7 h-7 rounded-md bg-zinc-800 dark:bg-red-600 hover:bg-black dark:hover:bg-red-700 text-white font-bold transition-colors shrink-0 shadow-sm flex items-center justify-center"
                  aria-label="關閉提示"
                  title="關閉"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Left Action: Google GradientButton with independent popup styling */}
              <div className="flex shrink-0 w-full md:w-auto">
                <GradientButton asChild variant="popup" size="default" className="w-full md:w-auto gap-2.5 px-4 md:px-5 py-2.5 rounded text-xs font-bold shadow-sm">
                  <a
                    href={GOOGLE_SOURCE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GoogleIcon size={18} />
                    <span>在 Google 設為優先來源</span>
                  </a>
                </GradientButton>
              </div>

              {/* Desktop Middle: Description without heading */}
              <div className="hidden md:flex items-center text-left flex-1 px-2">
                <p className="leading-relaxed text-xs text-zinc-600 dark:text-zinc-400">
                  在 Google 搜尋與新聞資訊流中第一時間掌握電競快訊與深度專欄。
                </p>
              </div>

              {/* Desktop Extreme Right: Red Close Button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="hidden md:flex w-8 h-8 rounded bg-zinc-800 dark:bg-red-600 hover:bg-black dark:hover:bg-red-700 text-white font-bold transition-colors shrink-0 shadow-sm items-center justify-center"
                aria-label="關閉提示"
                title="關閉"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

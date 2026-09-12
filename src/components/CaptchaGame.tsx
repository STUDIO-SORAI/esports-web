"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CloseIcon } from "./Icons";

interface Puzzle {
  question: string;
  images: string[];
  token: string;
}

interface CaptchaPayload {
  token: string;
  selected: number[];
}

interface CaptchaGameProps {
  onVerified: (payload: CaptchaPayload) => void;
  onReset?: () => void;
}

export function CaptchaGame({ onVerified, onReset }: CaptchaGameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchPuzzle = useCallback(async () => {
    setLoading(true);
    setError("");
    setSelected(new Set());
    setVerified(false);
    setVerifying(false);
    onReset?.();

    try {
      const res = await fetch("/api/captcha/challenge");
      if (!res.ok) throw new Error("載入失敗");
      const data = await res.json();
      setPuzzle(data);
    } catch {
      setError("驗證遊戲載入失敗，請重新整理頁面。");
    } finally {
      setLoading(false);
    }
  }, [onReset]);

  const openPopup = () => {
    if (verified) return;
    setIsOpen(true);
    if (!puzzle) fetchPuzzle();
  };

  const closePopup = () => {
    setIsOpen(false);
  };

  const toggleCell = (idx: number) => {
    if (verified) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
    setError("");
  };

  const handleVerify = async () => {
    if (!puzzle || selected.size === 0) {
      setError("請至少選擇一個方塊");
      return;
    }

    setVerifying(true);
    setError("");

    const sortedSelected = Array.from(selected).sort((a, b) => a - b);

    try {
      const res = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: puzzle.token,
          selected: sortedSelected,
        }),
      });

      if (res.ok) {
        setVerified(true);
        setIsOpen(false);
        onVerified({ token: puzzle.token, selected: sortedSelected });
      } else {
        setError("答案不正確，請重新選擇或換一題。");
        setSelected(new Set());
      }
    } catch {
      setError("驗證過程發生錯誤，請重試。");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative h-full">
      {/* Widget box — cyan/blue accent */}
      {/*
        原本是 <div onClick>，鍵盤按不到；驗證打不開就過不了 captcha，
        送出鈕也就永遠是 disabled。必須是真的 button。
      */}
      <button
        type="button"
        aria-label={verified ? "人機驗證已通過" : "開始人機驗證"}
        aria-expanded={isOpen}
        className={`w-full h-full text-left rounded-lg border p-2.5 flex items-center gap-3 select-none transition-colors
          ${verified
            ? "border-cyan-500/40 bg-cyan-500/10 dark:border-cyan-500/40 dark:bg-cyan-500/10"
            : "border-zinc-300 bg-white hover:border-cyan-500/60 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-cyan-500/60 cursor-pointer"
          }
        `}
        onClick={openPopup}
      >
        <div
          aria-hidden="true"
          className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors
            ${verified
              ? "border-cyan-400 bg-cyan-500"
              : "border-zinc-400 bg-white dark:border-zinc-600 dark:bg-zinc-800"
            }
          `}
        >
          {verified && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className={`text-sm font-bold ${verified ? "text-cyan-600 dark:text-cyan-400" : "text-zinc-700 dark:text-zinc-300"}`}>
            {verified ? "驗證通過" : "我不是機器人"}
          </span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-600 uppercase tracking-widest font-bold">
            Human CAPTCHA Check
          </span>
        </div>
        {/* Shield badge */}
        <div className="flex items-center gap-1 opacity-40 shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 dark:text-zinc-400">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Sorai</span>
        </div>
      </button>

      {/* Popup positioned below the box */}
      {isOpen && (
        <>
          {/* invisible overlay to catch clicks outside */}
          <div
            className="fixed inset-0 z-[99998]"
            onClick={closePopup}
          />
          <div className="absolute top-full left-0 right-0 mt-2 z-[99999]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-2xl flex flex-col max-h-[70vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  人機驗證
                </span>
                <button
                  type="button"
                  onClick={closePopup}
                  aria-label="關閉人機驗證"
                  className="p-1 -mr-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col gap-3 overflow-y-auto">
                {loading ? (
                  <div className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">載入中...</div>
                ) : error && !puzzle ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-danger mb-3">{error}</p>
                    <button
                      onClick={fetchPuzzle}
                      className="text-xs font-bold uppercase tracking-widest text-danger hover:text-white transition-colors"
                    >
                      重試
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium text-center">
                      {puzzle?.question}
                    </p>

                    <div className="grid grid-cols-3 gap-1.5">
                      {puzzle?.images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          // 格子裡只有一張裝飾用的圖，沒有 aria-label 的話讀出來就是九個無名按鈕。
                          // aria-pressed 讓「選了哪幾格」不再只靠邊框顏色表達。
                          aria-label={`圖片 ${idx + 1}`}
                          aria-pressed={selected.has(idx)}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCell(idx);
                          }}
                          className={`relative aspect-square rounded overflow-hidden border-2 transition-[border-color,box-shadow]
                            ${
                              selected.has(idx)
                                ? "border-cyan-500 ring-1 ring-cyan-500/40"
                                : "border-transparent hover:ring-1 hover:ring-zinc-300 dark:hover:ring-zinc-600"
                            }
                          `}
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                          {selected.has(idx) && (
                            <div className="absolute inset-0 bg-cyan-500/25 flex items-center justify-center">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    {error && (
                      <p className="text-sm text-danger font-medium text-center">{error}</p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerify();
                        }}
                        disabled={verifying || selected.size === 0}
                        className="flex-1 h-10 rounded-lg bg-cyan-600 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {verifying ? "驗證中..." : "確認"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchPuzzle();
                        }}
                        disabled={verifying}
                        className="h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-40"
                      >
                        換一題
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

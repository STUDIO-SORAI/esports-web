"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CloseIcon } from "./Icons";
import { Button } from "@/components/arc/button/button";
import { SkeletonBox } from "@/components/arc/skeleton/skeleton";

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
      <button
        type="button"
        aria-label={verified ? "人機驗證已通過" : "開始人機驗證"}
        aria-expanded={isOpen}
        className={`w-full h-full text-left rounded-[var(--radius-panel)] px-3 py-2.5 flex items-center gap-2.5 select-none transition-colors border ${
          verified
            ? "bg-[var(--accent-subtle)] border-[var(--accent)]"
            : "bg-[var(--surface-muted)] hover:bg-[var(--surface)] border-transparent cursor-pointer"
        }`}
        onClick={openPopup}
      >
        <div
          aria-hidden="true"
          className={`w-5 h-5 shrink-0 rounded-[var(--radius-control)] flex items-center justify-center transition-colors border ${
            verified
              ? "bg-[var(--accent)] border-[var(--accent)] text-white"
              : "bg-[var(--surface)] border-[var(--border)]"
          }`}
        >
          {verified && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className={`text-xs font-medium truncate ${verified ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
            {verified ? "驗證通過" : "我不是機器人"}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] font-normal truncate">
            人機驗證挑戰
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-60 shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)]">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[11px] text-[var(--text-muted)] font-normal">Sorai</span>
        </div>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePopup();
          }}
        >
          <div
            className="w-full max-w-[360px] sm:max-w-[400px] bg-[var(--surface-raised)] rounded-[var(--radius-panel)] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] my-auto border border-black/5 dark:border-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface)]">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                人機驗證
              </span>
              <button
                type="button"
                onClick={closePopup}
                aria-label="關閉人機驗證"
                className="p-1 -mr-1 rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 overflow-y-auto">
              {loading || (!puzzle && !error) || (puzzle && (!puzzle.images || puzzle.images.length === 0)) ? (
                <div className="skullet-sweep flex flex-col gap-3 py-1">
                  <div className="skullet-bone h-4 w-3/5 mx-auto rounded-full" />
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 9 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="skullet-bone aspect-square w-full rounded-xl"
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <div className="skullet-bone h-9 flex-1 rounded-xl" />
                    <div className="skullet-bone h-9 w-20 rounded-xl" />
                  </div>
                </div>
              ) : error ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-[var(--danger)] mb-3">{error}</p>
                  <button
                    onClick={fetchPuzzle}
                    className="text-xs font-medium text-[var(--danger)] hover:underline transition-colors"
                  >
                    重試
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[var(--foreground)] font-medium text-center">
                    {puzzle?.question}
                  </p>

                  <div className="grid grid-cols-3 gap-1.5">
                    {puzzle?.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`圖片 ${idx + 1}`}
                        aria-pressed={selected.has(idx)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCell(idx);
                        }}
                        className={`skullet-bone skullet-sweep relative aspect-square rounded-xl overflow-hidden border-2 transition-[border-color,background-color] ${
                          selected.has(idx)
                            ? "border-[var(--accent)]"
                            : "border-transparent hover:border-[var(--border-strong)]"
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="skullet-img w-full h-full object-cover"
                          draggable={false}
                          onLoad={(e) => (e.currentTarget.dataset.loaded = "true")}
                        />
                        {selected.has(idx) && (
                          <div className="absolute inset-0 bg-[var(--accent-subtle)] flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {error && (
                    <p className="text-sm text-[var(--danger)] font-medium text-center">{error}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerify();
                      }}
                      disabled={verifying || selected.size === 0}
                      loading={verifying}
                      variant="primary"
                      size="md"
                      className="flex-1 font-medium text-xs"
                    >
                      {verifying ? "驗證中..." : "確認"}
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchPuzzle();
                      }}
                      disabled={verifying}
                      variant="secondary"
                      size="md"
                      className="font-medium text-xs"
                    >
                      換一題
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

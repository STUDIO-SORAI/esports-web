'use client';
import React, { useState } from 'react';

export function ShareBlock({ title, url }: { title: string, url?: string }) {
  const [copied, setCopied] = useState(false);

  // 以實際瀏覽網址為準，SSR 傳進來的 url 只當成備援，
  // 避免 WEB_URL 未設定時分享出 http://localhost:4321 的連結。
  const resolveUrl = () =>
    (typeof window !== 'undefined' ? window.location.href : '') || url || '';

  const handleShare = async () => {
    const shareUrl = resolveUrl();
    if (!shareUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {}
    }
  };

  return (
    <button 
      onClick={handleShare} 
      className="flex items-center gap-2 text-[var(--ink-soft)] dark:text-gray-300 hover:text-[var(--ink)] dark:hover:text-white px-8 py-3 border border-[var(--line)] dark:border-gray-700 hover:border-gray-400 hover:bg-[var(--surface)] dark:hover:bg-[#222] rounded text-sm font-bold transition-[color,border-color,background-color] shadow-sm"
    >
      {copied ? "網址已複製！" : "分享此文章 (Share)"}
    </button>
  );
}
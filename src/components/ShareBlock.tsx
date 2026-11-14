'use client';
import React, { useState } from 'react';
import { Button } from '@/components/arc/button/button';

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
    <Button 
      variant="secondary"
      size="md"
      onClick={handleShare} 
      className="px-6 py-2.5 font-medium shadow-none hover:shadow-sm"
    >
      {copied ? "網址已複製！" : "分享此文章 (Share)"}
    </Button>
  );
}

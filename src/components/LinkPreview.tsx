import React from 'react';

interface LinkPreviewData {
  url: string;
  domain: string;
  title: string;
  description: string;
  image: string;
}

const CARD_CLASS =
  'my-8 !border-0 flex flex-col md:flex-row border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shadow-sm no-underline group link-preview-card';

const safeDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

/**
 * 這個元件會在瀏覽器端 hydrate，因此**不可以**寫成 async component
 * （async component 在 client island 會直接讓整個 React 島崩潰、內文整段消失），
 * 也不可以在瀏覽器直接 fetch 外站（會被 CORS 擋下）。
 * OpenGraph 抓取一律交給同源的 /api/link-preview 端點處理。
 */
export function LinkPreview({ url }: { url: string }) {
  const domain = safeDomain(url);
  const [data, setData] = React.useState<LinkPreviewData | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: LinkPreviewData | null) => {
        if (!cancelled && json && !(json as any).error) setData(json);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [url]);

  const title = data?.title || domain;
  const description = data?.description || '';
  const image = data?.image || '';

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={CARD_CLASS} style={{ background: 'none' }}>
      {image && (
        <div className="w-full md:w-36 h-48 md:h-auto shrink-0 flex-none bg-zinc-100 dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-800">
          <img
            src={image}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover !m-0 !border-0 !rounded-none !shadow-none cover-zoom"
          />
        </div>
      )}
      <div className="p-4 flex flex-col justify-center flex-1 min-w-0">
        <h3 className="text-base font-bold text-[var(--ink)] dark:text-zinc-100 line-clamp-2 !m-0 mb-1.5 leading-snug group-hover:text-red-500 transition-colors">{title}</h3>
        {description && <p className="text-xs text-[var(--ink-soft)] dark:text-zinc-400 line-clamp-2 !m-0 leading-relaxed mb-3">{description}</p>}
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate inline-flex items-center gap-1 font-bold uppercase tracking-wider block mt-auto">
          <ExternalIcon className="w-3 h-3" /> {domain}
        </span>
      </div>
    </a>
  );
}

function ExternalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  );
}

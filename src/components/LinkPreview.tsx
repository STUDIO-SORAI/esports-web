import React from 'react';

interface LinkPreviewData {
  url: string;
  domain: string;
  title: string;
  description: string;
  image: string;
}

const CARD_CLASS =
  'my-8 !border-0 flex flex-col md:flex-row border border-[var(--border)] rounded-[var(--radius-panel)] overflow-hidden bg-[var(--surface)] hover:bg-[var(--surface-muted)] hover:border-[var(--border-strong)] transition-colors shadow-sm no-underline group link-preview-card';

const safeDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

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
    <a href={url} target="_blank" rel="noopener noreferrer" className={CARD_CLASS}>
      {image && (
        <div className="w-full md:w-52 aspect-video md:aspect-auto md:self-stretch shrink-0 flex-none bg-[var(--surface-muted)] border-b md:border-b-0 md:border-r border-[var(--border)] overflow-hidden relative min-h-[140px] md:min-h-0">
          <img
            src={image}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full h-full !w-full !h-full !max-w-none !max-h-none object-cover !object-cover !m-0 !border-0 !rounded-none !shadow-none cover-zoom absolute inset-0"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
      <div className="p-4 flex flex-col justify-center flex-1 min-w-0">
        <h3 className="text-base font-medium text-[var(--foreground)] line-clamp-2 !m-0 mb-1.5 leading-snug group-hover:text-[var(--accent)] transition-colors">{title}</h3>
        {description && <p className="text-xs text-[var(--text-secondary)] line-clamp-2 !m-0 leading-relaxed mb-3">{description}</p>}
        <span className="text-xs text-[var(--text-muted)] truncate inline-flex items-center gap-1 font-normal block mt-auto">
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

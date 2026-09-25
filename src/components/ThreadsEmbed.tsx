import React from 'react';

interface ThreadsEmbedProps {
  url: string;
}

export function parseThreadsUrl(url: string): { username: string; postId: string; permalink: string } | null {
  if (!url) return null;
  const match = url.match(/^https?:\/\/(?:www\.)?threads\.(?:net|com)\/@([a-zA-Z0-9_.-]+)\/post\/([a-zA-Z0-9_-]+)/i);
  if (!match) return null;
  return {
    username: match[1],
    postId: match[2],
    permalink: `https://www.threads.net/@${match[1]}/post/${match[2]}`,
  };
}

export function ThreadsEmbed({ url }: ThreadsEmbedProps) {
  const parsed = parseThreadsUrl(url);

  React.useEffect(() => {
    if (!parsed) return;

    // Load Meta Threads embed script if not already present
    const SCRIPT_ID = 'threads-embed-script';
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://www.threads.net/embed.js';
      script.async = true;
      document.body.appendChild(script);
    } else {
      // If script is already present or loaded, re-trigger Meta embed parser
      if (typeof (window as any).instgrm !== 'undefined' && (window as any).instgrm.Embeds) {
        (window as any).instgrm.Embeds.process();
      }
    }
  }, [parsed?.permalink]);

  if (!parsed) return null;

  return (
    <div className="w-full my-8 flex justify-center not-prose">
      <div className="w-full max-w-[480px] [&_iframe]:!mx-auto [&_iframe]:!max-w-full [&:has(iframe)_blockquote]:!hidden">
        <blockquote
          className="text-post-media"
          data-text-post-permalink={parsed.permalink}
          data-text-post-version="0"
          style={{
            margin: '0 auto',
            maxWidth: '100%',
            width: '100%',
          }}
        >
          <a
            href={parsed.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 dark:text-zinc-400 text-xs hover:underline block text-center py-4"
          >
            在 Threads 上查看貼文（@{parsed.username}）
          </a>
        </blockquote>
      </div>
    </div>
  );
}

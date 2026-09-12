import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github-dark.css';
import { useLightbox } from './Lightbox';
import { TwitchEmbed, parseTwitchUrl } from './TwitchEmbed';
import { ThreadsEmbed, parseThreadsUrl } from './ThreadsEmbed';
import { GenericFrame, YouTubeFrame, parseYouTubeId, renderEmbed } from './Embed';
import {
  NotebookCard,
  NotebookModalDialog,
  matchNotebookTag,
  injectNotebookPlacements,
} from './NotebookModal';
import type { PostNotebook } from '../lib/types';

const extractText = (node: any): string => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node.props && node.props.children) {
    return extractText(node.props.children);
  }
  return '';
};

const hasEmbeddableLink = (children: any): boolean => {
  return React.Children.toArray(children).some(child => {
    if (React.isValidElement(child)) {
      const props = child.props as any;
      if (props && props.href) {
        const text = extractText(props.children).trim();
        const isBareUrl = text.startsWith('http') || text === props.href;
        if (isBareUrl) {
          return true;
        }
      }
    }
    return false;
  });
};

const buildComponents = (
  openZoom: (src: string, alt: string) => void,
  notebooks: PostNotebook[] = [],
  openNotebook?: (index: number, tab?: 'images' | 'text') => void
): Components => {
  let autoIndex = 0;

  return {
  // 內文配圖被壓在一欄文字的寬度內，圖卡與賽程表上的小字在那個尺寸讀不出來。
  // 包成按鈕之後點一下就能開燈箱看原圖；邊框與版面仍然歸裡面的 img 管。
  img: ({ node, src, alt, className, ...props }) => {
    const source = typeof src === 'string' ? src : '';
    if (!source) return <img src={src as any} alt={alt} className={className} {...props} />;
    if (className?.includes('cover-zoom') || (props as any)['data-no-zoom']) {
      return <img src={source} alt={alt} className={className} {...props} />;
    }
    return (
      <button
        type="button"
        className="media-zoom"
        onClick={() => openZoom(source, alt || '')}
        aria-label={alt ? `放大檢視：${alt}` : '放大檢視圖片'}
      >
        <img src={source} alt={alt} className={className} {...props} />
      </button>
    );
  },
  iframe: ({ node, src, ...props }) => {
    const source = typeof src === 'string' ? src : '';
    const twitch = parseTwitchUrl(source);
    if (twitch) {
      return <TwitchEmbed url={source} />;
    }
    const threads = parseThreadsUrl(source);
    if (threads) {
      return <ThreadsEmbed url={source} />;
    }
    if (parseYouTubeId(source)) {
      return <YouTubeFrame href={source} />;
    }
    return <GenericFrame src={source} {...props} />;
  },
  p: ({ node, children, ...props }) => {
    const text = extractText(children).trim();

    // 處理附錄短代碼（例如 {{notebook:1}}、{{附錄:1}}、{{notebook}}）
    const nbMatch = matchNotebookTag(text);
    if (nbMatch && notebooks.length > 0 && openNotebook) {
      let targetIndex = nbMatch.index;
      if (targetIndex === undefined) {
        targetIndex = autoIndex++;
        if (targetIndex >= notebooks.length) targetIndex = 0;
      }
      if (targetIndex >= 0 && targetIndex < notebooks.length) {
        const nb = notebooks[targetIndex];
        return (
          <div className="my-8 not-prose">
            <NotebookCard
              notebook={nb}
              index={targetIndex}
              onOpen={(tab) => openNotebook(targetIndex, tab)}
            />
          </div>
        );
      }
    }

    // 處理直接貼入或富文本轉譯出的 raw / escaped iframe
    const iframeSrcMatch =
      text.match(/<iframe\s+[^>]*src=["']([^"']+)["'][^>]*>.*?<\/iframe>/i) ||
      text.match(/&lt;iframe\s+[^>]*src=&quot;([^&]+)&quot;[^>]*&gt;.*?&lt;\/iframe&gt;/i) ||
      text.match(/<iframe\s+[^>]*src=["']([^"']+)["']/i) ||
      text.match(/&lt;iframe\s+[^>]*src=&quot;([^&]+)&quot;/i);

    if (iframeSrcMatch) {
      const rawSrc = iframeSrcMatch[1];
      const twitch = parseTwitchUrl(rawSrc);
      if (twitch) {
        return <div className="my-6 not-prose"><TwitchEmbed url={rawSrc} /></div>;
      }
      const threads = parseThreadsUrl(rawSrc);
      if (threads) {
        return <div className="my-6 not-prose"><ThreadsEmbed url={rawSrc} /></div>;
      }
      const ytMatch = rawSrc.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        return <div className="my-6 not-prose">{renderEmbed(rawSrc)}</div>;
      }
    }

    if (text.startsWith('http://') || text.startsWith('https://')) {
      const firstLine = text.split('\n')[0].trim();
      if (/^https?:\/\/[^\s]+$/.test(firstLine)) {
        return <div className="my-6 not-prose">{renderEmbed(firstLine)}</div>;
      }
    }
    if (hasEmbeddableLink(children)) {
      return <div {...props}>{children}</div>;
    }
    return <p {...props}>{children}</p>;
  },
  del: ({ children, ...props }) => {
    // Treat strikethrough (~~) as highlighted text instead
    return <span className="md-highlight text-inherit" {...props}>{children}</span>;
  },
  a: ({ node, href, children, className, ...props }) => {
    if (className?.includes('related-post-card') || className?.includes('link-preview-card')) {
      return (
        <a href={href} className={className} {...props}>
          {children}
        </a>
      );
    }

    if (href) {
      const text = extractText(children).trim();
      // If the link text itself starts with http/https, or perfectly matches the href, we consider it a bare URL intended for embedding
      const isBareUrl = text.startsWith('http') || text === href;
      if (isBareUrl) {
        return renderEmbed(href);
      }
    }

    if (className) {
      return (
        <a href={href} className={className} {...props}>
          {children}
        </a>
      );
    }

    return (
      <a href={href} {...props} className="md-link" target="_blank" rel="noopener noreferrer">      
        {children}
      </a>
    );
  },
  };
};

import { lexicalToHtml } from '../lib/richtext';
import {
  collectUnpopulatedUploadIds,
  fetchMediaByIds,
  populateUploads,
  collectUnpopulatedRelationshipIds,
  fetchPostsByIds,
  populateRelationships,
} from '../lib/livePreviewMedia';

export function MarkdownContent({
  content: initialContent,
  notebooks = [],
  isPreview,
}: {
  content: string;
  notebooks?: PostNotebook[];
  isPreview?: boolean;
}) {
  const [content, setContent] = React.useState(initialContent || '');
  const [activeNotebookIndex, setActiveNotebookIndex] = React.useState<number | null>(null);
  const [activeTab, setActiveTab] = React.useState<'images' | 'text'>('images');
  const [currentSlide, setCurrentSlide] = React.useState(0);

  React.useEffect(() => {
    setContent(initialContent || '');
  }, [initialContent]);

  const handleOpenNotebook = React.useCallback(
    (index: number, preferredTab?: 'images' | 'text') => {
      const nb = notebooks[index];
      const nbHasImages = (nb?.images || []).length > 0;
      setActiveNotebookIndex(index);
      setCurrentSlide(0);
      if (preferredTab) {
        setActiveTab(preferredTab);
      } else {
        setActiveTab(nbHasImages ? 'images' : 'text');
      }
    },
    [notebooks]
  );

  const handleCloseNotebook = React.useCallback(() => {
    setActiveNotebookIndex(null);
  }, []);

  const processedContent = React.useMemo(() => {
    return injectNotebookPlacements(content, notebooks);
  }, [content, notebooks]);

  const unplacedNotebooks = React.useMemo(() => {
    if (!notebooks || notebooks.length === 0) return [];
    const placed = new Set<number>();
    const tagRegex =
      /(?:\{\{\s*(?:notebook|附錄|appendix)(?::(\d+))?\s*\}\}|\[(?:notebook|附錄|appendix)(?::(\d+))?\]|:::\s*(?:notebook|附錄|appendix)(?:\s+(\d+))?\s*:::|<!--\s*(?:notebook|附錄|appendix)(?::(\d+))?\s*-->)/gi;
    const matches = [...processedContent.matchAll(tagRegex)];
    let nextUnassigned = 0;
    for (const m of matches) {
      const rawNum = m[1] || m[2] || m[3] || m[4];
      if (rawNum) {
        placed.add(parseInt(rawNum, 10) - 1);
      } else {
        while (placed.has(nextUnassigned) && nextUnassigned < notebooks.length) {
          nextUnassigned++;
        }
        if (nextUnassigned < notebooks.length) {
          placed.add(nextUnassigned);
          nextUnassigned++;
        }
      }
    }

    return notebooks
      .map((nb, i) => ({ nb, index: i }))
      .filter(({ index }) => !placed.has(index));
  }, [processedContent, notebooks]);

  React.useEffect(() => {
    if (!isPreview && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('preview') !== 'true') return;
    }

    // 後台送過來的是未存檔的表單狀態，upload 節點只有媒體 ID，
    // 要先補成媒體物件才轉得出 <img>。補齊是非同步的，用序號擋掉舊回應覆蓋新內容。
    let latest = 0;
    let disposed = false;

    const render = async (raw: any) => {
      const seq = ++latest;
      let json: any = null;
      let fallback = '';

      if (typeof raw === 'object' && raw?.root) {
        json = raw;
      } else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.root) json = parsed;
          else fallback = raw;
        } catch {
          fallback = raw;
        }
      }

      if (!json) {
        if (fallback && seq === latest && !disposed) setContent(fallback);
        return;
      }

      const uploadIds = collectUnpopulatedUploadIds(json);
      const postIds = collectUnpopulatedRelationshipIds(json);
      if (uploadIds.length || postIds.length) {
        // 先把有文字的版本畫出來，避免等 API 時整篇卡住
        if (seq === latest && !disposed) setContent(lexicalToHtml(json));
        const [media, posts] = await Promise.all([
          uploadIds.length ? fetchMediaByIds(uploadIds) : Promise.resolve(new Map()),
          postIds.length ? fetchPostsByIds(postIds) : Promise.resolve(new Map()),
        ]);
        if (media.size) json = populateUploads(json, media);
        if (posts.size) json = populateRelationships(json, posts);
      }

      const html = lexicalToHtml(json);
      if (html && seq === latest && !disposed) setContent(html);
    };

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        typeof event.data === 'object' &&
        (event.data.type === 'payload-live-preview' || event.data.data)
      ) {
        const data = event.data.data || event.data;
        if (data.content) {
          void render(data.content);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      disposed = true;
      window.removeEventListener('message', handleMessage);
    };
  }, [isPreview]);

  const { open: openZoom, overlay } = useLightbox();
  const components = React.useMemo(
    () => buildComponents(openZoom, notebooks, handleOpenNotebook),
    [openZoom, notebooks, handleOpenNotebook]
  );

  const activeNotebook = activeNotebookIndex !== null ? notebooks[activeNotebookIndex] : null;

  return (
    <>
      <article className='markdown-body'>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
          components={components}
        >
          {processedContent || ''}
        </ReactMarkdown>

        {/* 未在內文中自訂位置的附錄，預設陳列於文末 */}
        {unplacedNotebooks.length > 0 && (
          <div className="not-prose my-8 space-y-4">
            {unplacedNotebooks.map(({ nb, index }) => (
              <NotebookCard
                key={nb.id || index}
                notebook={nb}
                index={index}
                onOpen={(tab) => handleOpenNotebook(index, tab)}
              />
            ))}
          </div>
        )}
      </article>

      {/* 附錄彈窗 Dialog */}
      {activeNotebook && (
        <NotebookModalDialog
          notebook={activeNotebook}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
          onClose={handleCloseNotebook}
          onZoom={openZoom}
        />
      )}

      {overlay}
    </>
  );
}

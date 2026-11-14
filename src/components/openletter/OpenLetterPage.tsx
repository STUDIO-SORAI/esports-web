import { useCallback, useEffect, useState } from "react";

import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Button } from "@/components/arc/button/button";
import { PetitionForm } from "@/components/openletter/PetitionForm";
import { OPEN_LETTER, PETITION_LANGUAGE_OPTIONS } from "@/data/openLetter";
import { SIGNATURE_STATS } from "@/data/openLetter/signaturesSnapshot";
import type { LetterParagraph, LetterUi } from "@/data/openLetter";
import type { OpenLetterLogo, OpenLetterLogoThemeMode } from "@/lib/openLetterLogos";
import { DEFAULT_PETITION_LANGUAGE, isPetitionLanguage, type PetitionLanguage } from "@/lib/petition";

const STORAGE_KEY = "sorai-openletter-lang";

const LOGO_THEME_CLASS: Record<OpenLetterLogoThemeMode, string> = {
  auto: "",
  white: "invert dark:invert-0",
  dark: "dark:invert",
};

interface OpenLetterPageProps {
  initialLanguage?: PetitionLanguage;
  initialCount?: number | null;
  initialLogos?: OpenLetterLogo[];
}

/** 段落 + 出處。出處用外連清單呈現，不把 URL 塞進正文。 */
function Paragraph({
  paragraph,
  ui,
  textClassName,
}: {
  paragraph: LetterParagraph;
  ui: LetterUi;
  textClassName: string;
}) {
  return (
    <div>
      <p className={textClassName}>{paragraph.text}</p>
      {paragraph.sources && paragraph.sources.length > 0 && (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {ui.sourcesLabel}
          </span>
          {paragraph.sources.map((source) => (
            <a
              key={source.href}
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs leading-relaxed text-[var(--text-secondary)] underline decoration-[var(--surface-muted)] underline-offset-2 transition-colors hover:text-[var(--accent)]"
            >
              {source.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function OpenLetterPage({
  initialLanguage = DEFAULT_PETITION_LANGUAGE,
  initialCount = null,
  initialLogos = [],
}: OpenLetterPageProps) {
  const [language, setLanguage] = useState<PetitionLanguage>(initialLanguage);
  const [count, setCount] = useState<number | null>(initialCount);
  const content = OPEN_LETTER[language];
  const { ui } = content;

  const refreshCount = useCallback(async () => {
    try {
      const response = await fetch("/api/petition-count", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as { count?: unknown };
      if (typeof data.count === "number" && Number.isFinite(data.count) && data.count >= 0) {
        setCount(Math.floor(data.count));
      }
    } catch {
      // 人數抓不到就維持上一次的數字，不要打斷閱讀
    }
  }, []);

  // 人數每 20 秒更新一次；分頁在背景時不輪詢，回到前景立刻補一次。
  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshCount();
    }, 20_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshCount();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshCount]);

  const handleSigned = useCallback(() => {
    // 先樂觀 +1，讓送出的人立刻看到自己算進去，再跟伺服器對一次。
    setCount((previous) => (previous === null ? previous : previous + 1));
    window.setTimeout(() => void refreshCount(), 1500);
  }, [refreshCount]);

  // 沒有指定 ?lang= 時沿用上次選的語言，切換過一次就不用每次重選。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lang")) return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isPetitionLanguage(stored) && stored !== initialLanguage) setLanguage(stored);
    } catch {
      // 無痕模式或隱私設定擋掉 storage 時，維持預設語言即可
    }
  }, [initialLanguage]);

  useEffect(() => {
    document.documentElement.lang = content.htmlLang;
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // 同上，寫不進去不影響閱讀
    }
  }, [content.htmlLang, language]);

  const changeLanguage = (value: string) => {
    if (!isPetitionLanguage(value)) return;
    setLanguage(value);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", value);
      window.history.replaceState(null, "", url);
    } catch {
      // 換網址失敗就算了，語言本身已經切好
    }
  };

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 sm:px-6">
      <header className="arc-entrance" style={{ "--stagger": 0 } as React.CSSProperties}>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          {ui.kicker}
        </p>
        <h1 className="mt-4 text-balance font-serif text-[26px] font-bold leading-[1.25] tracking-tight text-[var(--foreground)] sm:text-4xl sm:leading-[1.2] md:text-[44px]">
          {ui.title}
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          {ui.addressee}
        </p>

        {count !== null && count > 0 && (
          <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-serif text-3xl font-bold tabular-nums tracking-tight text-[var(--foreground)] sm:text-4xl">
              {count.toLocaleString("en-US")}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">{ui.countSuffix}</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="text-xs text-[var(--text-muted)]">
            {ui.publishedLabel}：{ui.publishedDate}
          </span>
          <Button as="a" href="#sign" size="sm" variant="secondary" className="font-medium">
            {ui.formTitle}
          </Button>
          <Button
            as="a"
            href="/openletter/signatures"
            size="sm"
            variant="ghost"
            className="font-medium text-xs"
          >
            {language === 'zh'
              ? `連署數據與心聲分析 (${SIGNATURE_STATS.totalCount}+)`
              : language === 'vi'
                ? `Phân tích số liệu & Ý kiến (${SIGNATURE_STATS.totalCount}+)`
                : language === 'ja'
                  ? `署名データ・意見分析 (${SIGNATURE_STATS.totalCount}+)`
                  : `Signatures & Voices (${SIGNATURE_STATS.totalCount}+)`}
          </Button>
        </div>
      </header>

      {/* 手機上就留在頁首，不跟著捲動；桌面才固定。 */}
      <div className="mt-8 -mx-4 border-y border-[var(--surface-muted)] bg-[var(--background)] px-4 py-3 sm:sticky sm:top-[84px] sm:z-30 sm:mx-0 sm:rounded-[var(--radius-panel)] sm:border sm:px-4">
        <div className="flex items-center justify-between gap-4">
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)] sm:block">
            {ui.languageLabel}
          </span>
          <SegmentedControl
            label={ui.languageLabel}
            value={language}
            onValueChange={changeLanguage}
            options={PETITION_LANGUAGE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </div>
      </div>

      <section
        id="tldr"
        aria-labelledby="tldr-title"
        className="mt-10 rounded-[var(--radius-surface)] border border-[var(--surface-muted)] bg-[var(--surface)] p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            {content.tldr.kicker}
          </p>
          <a
            href="#letter"
            className="text-xs text-[var(--text-muted)] underline decoration-[var(--surface-muted)] underline-offset-2 transition-colors hover:text-[var(--accent)]"
          >
            {ui.readFullLetter}
          </a>
        </div>
        <h2
          id="tldr-title"
          className="mt-2 font-serif text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl"
        >
          {content.tldr.title}
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {content.tldr.paragraphs.map((paragraph, index) => (
            <p key={index} className="text-[15px] leading-[1.9] text-[var(--text-secondary)] sm:text-base">
              {paragraph}
            </p>
          ))}
        </div>
        <ul className="mt-5 flex flex-col gap-3 border-t border-[var(--surface-muted)] pt-5">
          {content.tldr.bullets.map((bullet, index) => (
            <li key={index} className="flex gap-3">
              <span className="font-serif text-xs font-bold tabular-nums leading-[1.9] text-[var(--accent)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-[15px] leading-[1.9] text-[var(--text-secondary)] sm:text-base">
                {bullet}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <article id="letter" className="mt-12 flex scroll-mt-28 flex-col gap-6">
        {content.intro.map((paragraph, index) => (
          <Paragraph
            key={index}
            paragraph={paragraph}
            ui={ui}
            textClassName="text-[15px] leading-[1.9] text-[var(--text-secondary)] sm:text-base"
          />
        ))}

        <div className="mt-4 flex flex-col gap-10">
          {content.demands.map((demand, index) => (
            <section key={index} className="flex flex-col gap-4">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-sm font-bold tabular-nums text-[var(--accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="font-serif text-lg font-bold leading-snug tracking-tight text-[var(--foreground)] sm:text-xl">
                  {demand.heading}
                </h2>
              </div>
              <div className="flex flex-col gap-4 border-l border-[var(--surface-muted)] pl-5 sm:pl-7">
                {demand.paragraphs.map((paragraph, paragraphIndex) => (
                  <Paragraph
                    key={paragraphIndex}
                    paragraph={paragraph}
                    ui={ui}
                    textClassName="text-[15px] leading-[1.9] text-[var(--text-secondary)] sm:text-base"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-6 border-t border-[var(--surface-muted)] pt-8">
          {content.closing.map((paragraph, index) => (
            <p
              key={index}
              className="text-[15px] leading-[1.9] text-[var(--text-secondary)] sm:text-base"
            >
              {paragraph}
            </p>
          ))}
          <p className="font-serif text-base font-bold text-[var(--foreground)] sm:text-lg">
            {ui.signature}
          </p>

          <div className="mt-10 border-t border-[var(--surface-muted)] pt-8">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5 sm:gap-x-10 sm:gap-y-6">
              <a
                href="/"
                aria-label="SORAI ESPORTS"
                className="inline-flex shrink-0 items-center justify-center opacity-85 transition-opacity duration-150 hover:opacity-100"
              >
                <img
                  src="/logotype-og_w.png"
                  alt="SORAI ESPORTS"
                  width="160"
                  height="43"
                  className="h-9 w-auto object-contain invert dark:invert-0 sm:h-10"
                />
              </a>
              {initialLogos.map((item) => {
                const imgEl = (
                  <img
                    src={item.src}
                    alt={item.name}
                    loading="lazy"
                    className={`h-9 w-auto max-w-[160px] object-contain sm:h-10 ${LOGO_THEME_CLASS[item.themeMode]}`}
                  />
                );
                return item.href ? (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.name}
                    title={item.name}
                    className="inline-flex shrink-0 items-center justify-center opacity-85 transition-opacity duration-150 hover:opacity-100"
                  >
                    {imgEl}
                  </a>
                ) : (
                  <span
                    key={item.id}
                    title={item.name}
                    className="inline-flex shrink-0 items-center justify-center opacity-85"
                  >
                    {imgEl}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[var(--surface-muted)] pt-6">
            <p className="text-center text-xs font-medium tracking-wider text-[var(--text-muted)] uppercase">
              {language === 'zh'
                ? '完整公開信 PDF 下載'
                : language === 'vi'
                  ? 'Tải xuống toàn văn thư ngỏ (PDF)'
                  : language === 'ja'
                    ? '公開書簡 全文 PDF ダウンロード'
                    : 'Full Open Letter PDF Downloads'}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              {[
                { lang: 'zh', label: '繁體中文 PDF', href: '/openletter/openletter-zh.pdf' },
                { lang: 'en', label: 'English PDF', href: '/openletter/openletter-en.pdf' },
                { lang: 'vi', label: 'Tiếng Việt PDF', href: '/openletter/openletter-vi.pdf' },
                { lang: 'ja', label: '日本語 PDF', href: '/openletter/openletter-ja.pdf' },
              ].map((pdf) => {
                const isCurrent = pdf.lang === language;
                return (
                  <a
                    key={pdf.lang}
                    href={pdf.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className={`inline-flex items-center gap-2 rounded-[var(--radius-control)] border px-3.5 py-2 text-xs font-medium transition-[border-color,background-color,color] duration-150 ${
                      isCurrent
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)] hover:bg-[var(--accent)]/15'
                        : 'border-[var(--surface-muted)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                    </svg>
                    <span>{pdf.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </article>

      <section
        aria-labelledby="changelog-title"
        className="mt-14 border-t border-[var(--surface-muted)] pt-8"
      >
        <h2
          id="changelog-title"
          className="font-serif text-lg font-bold tracking-tight text-[var(--foreground)] sm:text-xl"
        >
          {content.changelog.title}
        </h2>
        <div className="mt-6 flex flex-col gap-6">
          {content.changelog.entries.map((entry) => (
            <div key={entry.date}>
              <p className="font-serif text-sm font-bold tabular-nums text-[var(--accent)]">
                {entry.date}
              </p>
              <ul className="mt-3 flex flex-col gap-2.5 border-l border-[var(--surface-muted)] pl-5 sm:pl-7">
                {entry.items.map((item, index) => (
                  <li
                    key={index}
                    className="text-[15px] leading-[1.9] text-[var(--text-secondary)] sm:text-base"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section
        id="sign"
        className="mt-16 scroll-mt-28 rounded-[var(--radius-surface)] bg-[var(--surface)] p-5 sm:p-8"
      >
        <h2 className="font-serif text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          {ui.formTitle}
        </h2>
        <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-[var(--text-secondary)]">
          {ui.formDescription}
        </p>
        <div className="mt-7">
          <PetitionForm language={language} ui={ui} onSigned={handleSigned} />
        </div>
      </section>
    </div>
  );
}

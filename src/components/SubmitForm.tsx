"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Bold, Italic, Heading2, Heading3, Quote, List, Link as LinkIcon, Highlighter } from "lucide-react";
import { CaptchaGame } from "./CaptchaGame";
import { CloseIcon } from "./Icons";
import { useDialogFocus } from "./useDialogFocus";
import { Button } from "@/components/arc/button/button";
import { Alert } from "@/components/arc/alert/alert";
import { InViewTitle } from "@/components/arc/in-view-title/in-view-title";

const CATEGORIES = [
  "特戰英豪",
  "英雄聯盟",
  "虹彩六號",
  "國際賽事",
  "專欄報導",
  "其他",
];

interface CaptchaPayload {
  token: string;
  selected: number[];
}

export function SubmitForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    title: "",
    category: "",
    content: "",
  });
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 點擊外部自動收起下拉選單
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    }
    if (isCategoryOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCategoryOpen]);

  // 富文本語法插入輔助函式
  const insertFormatting = (prefix: string, suffix: string, defaultPlaceholder: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = form.content;
    const selectedText = currentText.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const nextContent = currentText.substring(0, start) + replacement + currentText.substring(end);
    setForm((prev) => ({ ...prev, content: nextContent }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const insertLinePrefix = (linePrefix: string, defaultPlaceholder: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = form.content;
    const selectedText = currentText.substring(start, end) || defaultPlaceholder;
    const replacement = `\n${linePrefix}${selectedText}\n`;
    const nextContent = currentText.substring(0, start) + replacement + currentText.substring(end);
    setForm((prev) => ({ ...prev, content: nextContent }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1 + linePrefix.length, start + 1 + linePrefix.length + selectedText.length);
    }, 0);
  };
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const closeTerms = useCallback(() => setShowTerms(false), []);
  const termsRef = useDialogFocus<HTMLDivElement>(showTerms, closeTerms);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [captchaPayload, setCaptchaPayload] = useState<CaptchaPayload | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (status !== "idle") setStatus("idle");
  };

  const handleCaptchaVerified = (payload: CaptchaPayload) => {
    setCaptchaPayload(payload);
    if (status !== "idle") setStatus("idle");
  };

  const handleCaptchaReset = () => {
    setCaptchaPayload(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed) {
      setStatus("error");
      setMessage("請先同意使用規範");
      return;
    }

    if (!captchaPayload) {
      setStatus("error");
      setMessage("請先完成人機驗證");
      return;
    }

    setLoading(true);
    setStatus("idle");

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          captchaToken: captchaPayload.token,
          captchaSelected: captchaPayload.selected,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("投稿已成功送出！我們會盡快審核並與您聯繫。");
        setForm({ name: "", email: "", title: "", category: "", content: "" });
        setAgreed(false);
        setCaptchaPayload(null);
      } else {
        setStatus("error");
        setMessage(data.error || "提交失敗，請稍後再試。");
      }
    } catch {
      setStatus("error");
      setMessage("網路錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8 arc-entrance" style={{ "--stagger": 0 } as React.CSSProperties}>
      <div className="mb-10 text-center flex flex-col items-center">
        <InViewTitle
          text="讀者投稿"
          variant="blur"
          className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--foreground)] mb-3"
        />
        <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed font-normal">
          分享你的電競觀點、賽事分析或獨家消息。<br className="hidden md:block" />
          我們歡迎各類原創內容，審核通過後將署名刊登。
        </p>
      </div>

      {status === "success" && (
        <div className="mb-8" role="status" aria-live="polite">
          <Alert variant="success" title="投稿成功">
            {message}
          </Alert>
        </div>
      )}

      {status === "error" && (
        <div className="mb-8" role="alert">
          <Alert variant="error" title="無法送出">
            {message}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-xs font-medium text-[var(--text-secondary)]">
              姓名 / 暱稱 <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              value={form.name}
              onChange={handleChange}
              placeholder="你的名字或筆名"
              className="h-11 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-medium text-[var(--text-secondary)]">
              電子郵件 <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={200}
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
              className="h-11 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-xs font-medium text-[var(--text-secondary)]">
            文章標題 <span className="text-[var(--accent)]">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            value={form.title}
            onChange={handleChange}
            placeholder="給文章一個吸引人的標題"
            className="h-11 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
          />
        </div>

        {/* Arc UI 規格自訂 Dropdown Menu */}
        <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
          <label id="category-label" className="text-xs font-medium text-[var(--text-secondary)]">
            分類
          </label>
          <input type="hidden" name="category" value={form.category} />
          <button
            type="button"
            id="category"
            aria-haspopup="listbox"
            aria-expanded={isCategoryOpen}
            aria-labelledby="category-label category"
            onClick={() => setIsCategoryOpen((prev) => !prev)}
            className={`h-11 w-full rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3.5 text-sm flex items-center justify-between text-left transition-all cursor-pointer border ${
              isCategoryOpen
                ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20"
                : "border-transparent hover:border-white/10"
            }`}
          >
            <span className={form.category ? "text-[var(--foreground)] font-medium" : "text-[var(--text-muted)]"}>
              {form.category || "選擇分類（選填）"}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${
                isCategoryOpen ? "rotate-180 text-[var(--accent)]" : ""
              }`}
            />
          </button>

          {isCategoryOpen && (
            <div
              role="listbox"
              aria-labelledby="category-label"
              className="absolute top-[100%] left-0 w-full mt-1.5 p-1 rounded-[var(--radius-panel)] bg-[var(--surface-raised)]/95 dark:bg-[#18181b]/95 backdrop-blur-2xl border border-[var(--border-subtle)] shadow-2xl z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150"
            >
              <div
                role="option"
                aria-selected={!form.category}
                onClick={() => {
                  setForm((prev) => ({ ...prev, category: "" }));
                  setIsCategoryOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-[var(--radius-control)] text-xs transition-colors cursor-pointer ${
                  !form.category
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                <span>未分類（選填）</span>
                {!form.category && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
              </div>
              {CATEGORIES.map((cat) => {
                const isSelected = form.category === cat;
                return (
                  <div
                    key={cat}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, category: cat }));
                      setIsCategoryOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-[var(--radius-control)] text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                        : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Arc UI 規格 Rich Text Editor（富文本文字編輯器） */}
        <div className="flex flex-col gap-2">
          <label htmlFor="content" className="text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between">
            <span>
              文章內容 <span className="text-[var(--accent)]">*</span>
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
              {form.content.length.toLocaleString()} / 10,000 字
            </span>
          </label>

          <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] border border-transparent focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20 transition-all overflow-hidden flex flex-col">
            {/* Rich Text Toolbar */}
            <div className="flex items-center flex-wrap gap-1 p-1.5 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 select-none">
              <button
                type="button"
                title="粗體 (Ctrl+B)"
                onClick={() => insertFormatting("**", "**", "粗體文字")}
                className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="斜體 (Ctrl+I)"
                onClick={() => insertFormatting("*", "*", "斜體文字")}
                className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />
              <button
                type="button"
                title="二級標題 (H2)"
                onClick={() => insertLinePrefix("## ", "章節標題")}
                className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="三級標題 (H3)"
                onClick={() => insertLinePrefix("### ", "小標題")}
                className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <Heading3 className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />
              <button
                type="button"
                title="引言區塊"
                onClick={() => insertLinePrefix("> ", "引言重點內容")}
                className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="清單列表"
                onClick={() => insertLinePrefix("- ", "清單項目")}
                className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="螢光筆標記 (Strikethrough Highlight)"
                onClick={() => insertFormatting("~~", "~~", "螢光標記文字")}
                className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <Highlighter className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />
              <button
                type="button"
                title="插入超連結"
                onClick={() => insertFormatting("[", "](https://example.com)", "連結文字")}
                className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              ref={contentRef}
              id="content"
              name="content"
              required
              maxLength={10000}
              rows={12}
              value={form.content}
              onChange={handleChange}
              placeholder="請在此輸入文章內容...（支援 Markdown 排版語法與上方快捷工具列）"
              className="w-full bg-transparent p-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none resize-y leading-relaxed font-sans"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              安全驗證 <span className="text-[var(--accent)]">*</span>
            </label>
            <div className="h-[60px]">
              <CaptchaGame
                onVerified={handleCaptchaVerified}
                onReset={handleCaptchaReset}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              投稿規範 <span className="text-[var(--accent)]">*</span>
            </label>
            <div
              role="checkbox"
              aria-checked={agreed}
              tabIndex={0}
              onClick={() => setAgreed((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  setAgreed((prev) => !prev);
                }
              }}
              className={`h-[60px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-panel)] transition-colors cursor-pointer select-none border gap-2.5 ${
                agreed
                  ? "bg-[var(--accent-subtle)] border-[var(--accent)]"
                  : "bg-[var(--surface-muted)] hover:bg-[var(--surface)] border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-5 h-5 shrink-0 rounded-[var(--radius-control)] flex items-center justify-center transition-colors border ${
                    agreed
                      ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                      : "bg-[var(--surface)] border-[var(--border)]"
                  }`}
                >
                  {agreed && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className={`text-xs font-medium truncate ${
                      agreed ? "text-[var(--accent)]" : "text-[var(--foreground)]"
                    }`}
                  >
                    我同意投稿規範
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] font-normal truncate">
                    原創與版權約定
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTerms(true);
                }}
                className="text-xs font-medium shrink-0 px-2 py-1 h-7"
              >
                查看規範
              </Button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !captchaPayload || !agreed}
          loading={loading}
          variant="primary"
          size="lg"
          className="w-full font-medium"
        >
          {loading ? "提交中..." : "送出投稿"}
        </Button>

        <p className="text-center text-xs text-[var(--text-muted)] leading-relaxed">
          提交即表示你同意我們的內容審核規範，原創內容經採用後將署名刊登。
        </p>
      </form>

      {showTerms && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTerms();
          }}
        >
          <div
            ref={termsRef}
            className="bg-[var(--surface-raised)] rounded-[var(--radius-panel)] shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--surface)]">
              <h2 id="terms-title" className="text-lg font-serif font-medium text-[var(--foreground)]">
                投稿使用規範
              </h2>
              <button
                type="button"
                onClick={closeTerms}
                aria-label="關閉投稿使用規範"
                className="p-1.5 -mr-1.5 rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-sm text-[var(--text-secondary)] leading-relaxed flex flex-col gap-5">
              <section>
                <h3 className="font-medium text-[var(--foreground)] mb-1">一、授權與發表</h3>
                <p>當您透過本網站提交稿件，即視為您同意授權 SORAI ESPORTS 於全球範圍內、非獨家、永久、免權利金、可再授權之方式，使用、複製、修改、改編、翻譯、發行、公開傳輸及以其他任何合法方式利用該投稿內容。</p>
              </section>

              <section>
                <h3 className="font-medium text-[var(--foreground)] mb-1">二、權利歸屬</h3>
                <p>投稿內容之<strong>發表權與盈利權歸本站所有</strong>。本站有權決定是否發表、何時發表、以何種形式呈現，以及是否與第三方平台合作轉載或分潤。</p>
              </section>

              <section>
                <h3 className="font-medium text-[var(--foreground)] mb-1">三、撤回與下架</h3>
                <p>若您希望取回版權、要求下架或停止利用投稿內容，必須以電子郵件或其他本站認可之正式方式另行通知我們。我們將於收到通知後的合理期間內處理您的請求。</p>
              </section>

              <section>
                <h3 className="font-medium text-[var(--foreground)] mb-1">四、費用聲明</h3>
                <p>本站不會因為您的投稿或後續的版權處理向您另行收取任何費用。除非雙方另有書面約定，否則本站亦無支付稿費之義務。</p>
              </section>

              <section>
                <h3 className="font-medium text-[var(--foreground)] mb-1">五、內容責任</h3>
                <p>您保證投稿內容為原創或已取得合法授權，未侵害任何第三人之智慧財產權、名譽權、隱私權或其他權利。如有爭議，由您自行負責，與本站無涉。</p>
              </section>

              <section>
                <h3 className="font-medium text-[var(--foreground)] mb-1">六、規範修改</h3>
                <p>本站保留隨時修改本規範之權利，修改後的內容將公布於本頁面。繼續使用投稿功能即視為同意最新版本之規範。</p>
              </section>
            </div>

            <div className="px-6 py-4 bg-[var(--surface)] flex items-center justify-between border-t border-[var(--surface-muted)]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeTerms}
              >
                關閉
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setAgreed(true);
                  closeTerms();
                }}
              >
                同意並關閉規範
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

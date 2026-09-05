"use client";

import { useCallback, useState } from "react";
import { CaptchaGame } from "./CaptchaGame";
import { CloseIcon } from "./Icons";
import { useDialogFocus } from "./useDialogFocus";

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
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const closeTerms = useCallback(() => setShowTerms(false), []);
  // 規範內容是 modal，就得有 modal 的行為：ESC 關閉、焦點鎖在裡面、
  // 關閉後回到「查看規範」那顆按鈕、背景不跟著捲動。
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
    <div className="w-full max-w-2xl mx-auto px-6 py-8">
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-foreground mb-3">
          讀者投稿
        </h1>
        <p className="text-default-500 text-sm md:text-base leading-relaxed">
          分享你的電競觀點、賽事分析或獨家消息。<br className="hidden md:block" />
          我們歡迎各類原創內容，審核通過後將署名刊登。
        </p>
      </div>

      {/*
        送出結果只有畫面會變。沒有 live region 的話螢幕閱讀器完全不會提到
        投稿成功還是失敗。成功用 status（不打斷），失敗用 alert（要立刻知道）。
      */}
      {status === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-8 rounded-xl border border-success/30 bg-success/10 px-6 py-4 text-success text-sm font-medium"
        >
          {message}
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="mb-8 rounded-xl border border-danger/30 bg-danger/10 px-6 py-4 text-danger text-sm font-medium"
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-default-500">
              姓名 / 暱稱 <span className="text-danger">*</span>
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
              className="h-12 rounded-xl border border-default-200 dark:border-zinc-800 bg-transparent px-4 text-sm text-foreground placeholder:text-default-400 outline-none focus:border-danger transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-default-500">
              電子郵件 <span className="text-danger">*</span>
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
              className="h-12 rounded-xl border border-default-200 dark:border-zinc-800 bg-transparent px-4 text-sm text-foreground placeholder:text-default-400 outline-none focus:border-danger transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-xs font-bold uppercase tracking-widest text-default-500">
            文章標題 <span className="text-danger">*</span>
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
            className="h-12 rounded-xl border border-default-200 dark:border-zinc-800 bg-transparent px-4 text-sm text-foreground placeholder:text-default-400 outline-none focus:border-danger transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="category" className="text-xs font-bold uppercase tracking-widest text-default-500">
            分類
          </label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
            className="h-12 rounded-xl border border-default-200 dark:border-zinc-800 bg-transparent px-4 text-sm text-foreground outline-none focus:border-danger transition-colors appearance-none cursor-pointer"
          >
            <option value="">選擇分類（選填）</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="content" className="text-xs font-bold uppercase tracking-widest text-default-500">
            文章內容 <span className="text-danger">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            required
            maxLength={10000}
            rows={12}
            value={form.content}
            onChange={handleChange}
            placeholder="請在此輸入文章內容..."
            className="rounded-xl border border-default-200 dark:border-zinc-800 bg-transparent p-4 text-sm text-foreground placeholder:text-default-400 outline-none focus:border-danger transition-colors resize-y leading-relaxed"
          />
          <div className="flex justify-end text-xs text-default-400">
            {form.content.length} / 10000
          </div>
        </div>

        {/* Verification row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CaptchaGame
            onVerified={handleCaptchaVerified}
            onReset={handleCaptchaReset}
          />

          {/* Terms agreement box */}
          {/*
            這裡原本是 <div onClick>，鍵盤按不到；而送出鈕在 agreed 為 false 時是
            disabled，等於只用鍵盤的人永遠送不出投稿。改成真正的 checkbox：
            input 視覺隱藏但仍在 Tab 順序裡，方框只是它的視覺呈現。
            「查看規範」是另一個控制項，必須留在 label 外面，不然點它會連帶切換勾選。
          */}
          <div
            className={`h-full rounded-lg border p-2.5 flex flex-col justify-center gap-1.5 transition-colors
              ${agreed
                ? "border-cyan-500/40 bg-cyan-500/10 dark:border-cyan-500/40 dark:bg-cyan-500/10"
                : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600"
              }
            `}
          >
            <div className="flex items-center gap-3">
              <input
                id="agree"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only peer"
              />
              {/*
                焦點框掛在 label 上而不是裡面的方框：peer-* 走的是相鄰兄弟選擇器，
                只有 input 的同層兄弟命中得到，label 內的 span 不算。
              */}
              <label
                htmlFor="agree"
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer rounded peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-zinc-900"
              >
                <span
                  aria-hidden="true"
                  className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors
                    ${agreed
                      ? "border-cyan-400 bg-cyan-500"
                      : "border-zinc-400 bg-white dark:border-zinc-600 dark:bg-zinc-800"
                    }
                  `}
                >
                  {agreed && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm font-bold ${agreed ? "text-cyan-600 dark:text-cyan-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                  我同意使用規範
                </span>
              </label>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed pl-8">
              授權 SORAI 發表與利用此投稿內容。
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors font-bold ml-1"
              >
                查看規範
              </button>
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !captchaPayload || !agreed}
          className="h-14 rounded-xl bg-danger text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "提交中..." : "送出投稿"}
        </button>

        <p className="text-center text-xs text-default-400 leading-relaxed">
          提交即表示你同意我們的內容審核規範，原創內容經採用後將署名刊登。
        </p>
      </form>

      {/* Terms Popup */}
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
            className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 id="terms-title" className="text-lg font-black uppercase tracking-tight text-foreground">
                投稿使用規範
              </h2>
              <button
                type="button"
                onClick={closeTerms}
                aria-label="關閉投稿使用規範"
                className="p-1.5 -mr-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed flex flex-col gap-5">
              <section>
                <h3 className="font-bold text-foreground mb-1">一、授權與發表</h3>
                <p>當您透過本網站提交稿件，即視為您同意授權 SORAI ESPORTS 於全球範圍內、非獨家、永久、免權利金、可再授權之方式，使用、複製、修改、改編、翻譯、發行、公開傳輸及以其他任何合法方式利用該投稿內容。</p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-1">二、權利歸屬</h3>
                <p>投稿內容之<strong>發表權與盈利權歸本站所有</strong>。本站有權決定是否發表、何時發表、以何種形式呈現，以及是否與第三方平台合作轉載或分潤。</p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-1">三、撤回與下架</h3>
                <p>若您希望取回版權、要求下架或停止利用投稿內容，必須以電子郵件或其他本站認可之正式方式另行通知我們。我們將於收到通知後的合理期間內處理您的請求。</p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-1">四、費用聲明</h3>
                <p>本站不會因為您的投稿或後續的版權處理向您另行收取任何費用。除非雙方另有書面約定，否則本站亦無支付稿費之義務。</p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-1">五、內容責任</h3>
                <p>您保證投稿內容為原創或已取得合法授權，未侵害任何第三人之智慧財產權、名譽權、隱私權或其他權利。如有爭議，由您自行負責，與本站無涉。</p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-1">六、規範修改</h3>
                <p>本站保留隨時修改本規範之權利，修改後的內容將公布於本頁面。繼續使用投稿功能即視為同意最新版本之規範。</p>
              </section>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowTerms(false)}
                className="h-10 px-5 rounded-lg bg-cyan-600 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

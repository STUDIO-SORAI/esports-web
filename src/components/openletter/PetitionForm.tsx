import { useRef, useState } from "react";

import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import type { LetterUi } from "@/data/openLetter";
import {
  SIGNATURE_LIMITS,
  validateSignature,
  type PetitionLanguage,
  type SignatureField,
  type SignatureIssue,
} from "@/lib/petition";

type ServerErrorCode = keyof LetterUi["errors"];

const SERVER_ERROR_CODES: ServerErrorCode[] = [
  "duplicate",
  "rate-limited",
  "server",
  "network",
  "consent",
  "required",
];

function isServerErrorCode(value: unknown): value is ServerErrorCode {
  return typeof value === "string" && (SERVER_ERROR_CODES as string[]).includes(value);
}

interface PetitionFormProps {
  language: PetitionLanguage;
  ui: LetterUi;
  onSigned?: () => void;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  region: "",
  organization: "",
  message: "",
};

export function PetitionForm({ language, ui, onSigned }: PetitionFormProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [issues, setIssues] = useState<Partial<Record<SignatureField, SignatureIssue>>>({});
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorCode, setErrorCode] = useState<ServerErrorCode | null>(null);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleChange =
    (field: keyof typeof EMPTY_FORM) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setForm((prev) => ({ ...prev, [field]: value }));
      if (issues[field]) {
        setIssues((prev) => {
          const next = { ...prev };
          delete next[field as SignatureField];
          return next;
        });
      }
      if (status !== "idle") setStatus("idle");
      if (errorCode) setErrorCode(null);
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!consent) {
      setStatus("error");
      setErrorCode("consent");
      return;
    }

    const result = validateSignature({ ...form, language });
    if (!result.ok) {
      setIssues(result.issues);
      setStatus("error");
      setErrorCode(null);
      if (result.issues.name) nameRef.current?.focus();
      else if (result.issues.email) emailRef.current?.focus();
      return;
    }

    setLoading(true);
    setStatus("idle");
    setErrorCode(null);
    setIssues({});

    try {
      const response = await fetch("/api/petition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...result.signature, hp: honeypot }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: unknown };

      if (response.ok) {
        setStatus("success");
        setForm(EMPTY_FORM);
        setConsent(false);
        setHoneypot("");
        onSigned?.();
        return;
      }

      setStatus("error");
      setErrorCode(isServerErrorCode(data.error) ? data.error : "server");
    } catch {
      setStatus("error");
      setErrorCode("network");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (field: SignatureField) => {
    const issue = issues[field];
    return issue ? ui.errors[issue] : null;
  };

  return (
    <div className="w-full">
      {status === "success" && (
        <div className="mb-8" role="status" aria-live="polite">
          <Alert tone="success" title={ui.successTitle}>
            {ui.successBody}
          </Alert>
        </div>
      )}

      {status === "error" && errorCode && (
        <div className="mb-8" role="alert">
          <Alert tone="danger" title={ui.errorTitle}>
            {ui.errors[errorCode]}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="petition-name" className="text-xs font-medium text-[var(--text-secondary)]">
              {ui.nameLabel} <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              ref={nameRef}
              id="petition-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={SIGNATURE_LIMITS.name}
              value={form.name}
              onChange={handleChange("name")}
              placeholder={ui.namePlaceholder}
              aria-invalid={Boolean(issues.name) || undefined}
              aria-describedby={issues.name ? "petition-name-error" : undefined}
              className="h-11 w-full rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3.5 text-sm text-[var(--foreground)] outline-none transition-[box-shadow] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)]"
            />
            {issues.name && (
              <p id="petition-name-error" className="text-xs text-[var(--accent)]">
                {fieldError("name")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="petition-email" className="text-xs font-medium text-[var(--text-secondary)]">
              {ui.emailLabel} <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              ref={emailRef}
              id="petition-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={SIGNATURE_LIMITS.email}
              value={form.email}
              onChange={handleChange("email")}
              placeholder={ui.emailPlaceholder}
              aria-invalid={Boolean(issues.email) || undefined}
              aria-describedby={`petition-email-note${issues.email ? " petition-email-error" : ""}`}
              className="h-11 w-full rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3.5 text-sm text-[var(--foreground)] outline-none transition-[box-shadow] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)]"
            />
            {issues.email ? (
              <p id="petition-email-error" className="text-xs text-[var(--accent)]">
                {fieldError("email")}
              </p>
            ) : (
              <p id="petition-email-note" className="text-xs text-[var(--text-muted)]">
                {ui.emailNote}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="petition-region" className="text-xs font-medium text-[var(--text-secondary)]">
              {ui.regionLabel}
            </label>
            <input
              id="petition-region"
              name="region"
              type="text"
              autoComplete="country-name"
              maxLength={SIGNATURE_LIMITS.region}
              value={form.region}
              onChange={handleChange("region")}
              placeholder={ui.regionPlaceholder}
              className="h-11 w-full rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3.5 text-sm text-[var(--foreground)] outline-none transition-[box-shadow] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)]"
            />
            {issues.region && <p className="text-xs text-[var(--accent)]">{fieldError("region")}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="petition-organization" className="text-xs font-medium text-[var(--text-secondary)]">
              {ui.organizationLabel}
            </label>
            <input
              id="petition-organization"
              name="organization"
              type="text"
              autoComplete="organization"
              maxLength={SIGNATURE_LIMITS.organization}
              value={form.organization}
              onChange={handleChange("organization")}
              placeholder={ui.organizationPlaceholder}
              className="h-11 w-full rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3.5 text-sm text-[var(--foreground)] outline-none transition-[box-shadow] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)]"
            />
            {issues.organization && (
              <p className="text-xs text-[var(--accent)]">{fieldError("organization")}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="petition-message" className="text-xs font-medium text-[var(--text-secondary)]">
              {ui.messageLabel} <span className="text-[var(--text-muted)]">({ui.optional})</span>
            </label>
            <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
              {form.message.length.toLocaleString()} / {SIGNATURE_LIMITS.message}
            </span>
          </div>
          <textarea
            id="petition-message"
            name="message"
            rows={4}
            maxLength={SIGNATURE_LIMITS.message}
            value={form.message}
            onChange={handleChange("message")}
            placeholder={ui.messagePlaceholder}
            className="w-full resize-y rounded-[var(--radius-panel)] bg-[var(--surface-muted)] px-3.5 py-3 text-sm leading-relaxed text-[var(--foreground)] outline-none transition-[box-shadow] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)]"
          />
          {issues.message && <p className="text-xs text-[var(--accent)]">{fieldError("message")}</p>}
        </div>

        {/* 機器人陷阱：真人看不到，也不該用鍵盤走到 */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="petition-hp">Website</label>
          <input
            id="petition-hp"
            name="hp"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-panel)] bg-[var(--surface-muted)] px-4 py-3.5 text-sm leading-relaxed text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              if (errorCode === "consent") {
                setErrorCode(null);
                setStatus("idle");
              }
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span>{ui.consentLabel}</span>
        </label>

        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full font-medium">
          {loading ? ui.submitting : ui.submit}
        </Button>

        <p className="text-center text-xs leading-relaxed text-[var(--text-muted)]">{ui.privacyNote}</p>
      </form>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Check, Info as InfoCircle, TriangleAlert as WarningTriangle, CircleX as XmarkCircle, X } from "lucide-react";
import styles from "./alert.module.css";

export type AlertTone = "info" | "success" | "warning" | "danger" | "error";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  variant?: AlertTone;
  title: string;
  children?: ReactNode;
  open?: boolean;
  onDismiss?: () => void;
}

const icons = {
  info: InfoCircle,
  success: Check,
  warning: WarningTriangle,
  danger: XmarkCircle,
  error: XmarkCircle,
};

export function Alert({
  tone,
  variant,
  title,
  children,
  className = "",
  open,
  onDismiss,
  ...props
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const activeTone = (tone || variant || "info") as keyof typeof icons;
  const mappedTone = activeTone === "error" ? "danger" : activeTone;
  const Icon = icons[activeTone] || InfoCircle;

  if (open === false || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      {...props}
      className={[styles.alert, styles[mappedTone], className].filter(Boolean).join(" ")}
      role={mappedTone === "danger" ? "alert" : "status"}
    >
      <span className={styles.icon}>
        <Icon width={18} height={18} aria-hidden="true" />
      </span>
      <div className={styles.copy}>
        <strong className={styles.title}>{title}</strong>
        {children && <p className={styles.description}>{children}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          aria-label={`關閉提示: ${title}`}
          onClick={handleDismiss}
        >
          <X width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default Alert;

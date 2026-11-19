"use client";

import React from "react";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./badge.module.css";

export type BadgeTone = "neutral" | "success" | "info" | "warning" | "danger";
export type BadgeSize = "sm" | "md" | "lg";
export type BadgeColor = "teal" | "sky" | "orchid" | "violet" | "rose" | "amber";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  icon?: ReactNode;
  dot?: boolean;
  color?: BadgeColor;
  outline?: boolean;
  pill?: boolean;
}

export function Badge({
  tone = "neutral",
  size = "md",
  icon,
  dot = false,
  color,
  outline = false,
  pill = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const mark = icon ? styles.withIcon : dot ? styles.withDot : undefined;
  const classes = [
    styles.badge,
    styles[tone],
    color ? styles[color] : undefined,
    styles[size],
    mark,
    outline ? styles.outline : undefined,
    pill ? styles.pill : undefined,
    className,
  ].filter(Boolean).join(" ");

  return (
    <span {...props} className={classes}>
      <span className={styles.body}>
        <span className={styles.content}>
          {!icon && dot ? (
            <span className={styles.icon} aria-hidden="true">
              <span className={styles.dot} />
            </span>
          ) : null}
          {icon ? (
            <span className={styles.icon} aria-hidden="true">
              <span className={styles.glyph}>{icon}</span>
            </span>
          ) : null}
          <span className={styles.label}>{children}</span>
        </span>
      </span>
    </span>
  );
}

export default Badge;

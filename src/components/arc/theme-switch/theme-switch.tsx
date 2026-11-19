"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "./theme-switch.module.css";

export type ThemeSwitchVariant = "reveal" | "eclipse" | "split" | "rise";
export type Theme = "light" | "dark";

export interface ThemeSwitchProps {
  theme?: Theme;
  variant?: ThemeSwitchVariant;
  onThemeChange?: (next: Theme, variant: ThemeSwitchVariant, trigger: HTMLElement) => void;
  label?: string;
  iconOnly?: boolean;
  className?: string;
}

export function ThemeSwitch({
  theme: controlledTheme,
  variant = "reveal",
  onThemeChange,
  label = "切換深淺模式",
  iconOnly = false,
  className = "",
}: ThemeSwitchProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    const activeDark =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark";
    setIsDark(activeDark);

    const onThemeChanged = (e: any) => {
      if (e.detail?.theme) {
        setIsDark(e.detail.theme === "dark");
      }
    };
    window.addEventListener("theme-changed", onThemeChanged);
    return () => window.removeEventListener("theme-changed", onThemeChanged);
  }, []);

  const currentTheme: Theme = controlledTheme ?? (isDark ? "dark" : "light");
  const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const nextDark = !document.documentElement.classList.contains("dark");
    const next: Theme = nextDark ? "dark" : "light";

    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    document.documentElement.setAttribute("data-theme", next);

    try {
      localStorage.setItem("theme", next);
    } catch {}

    setIsDark(nextDark);
    window.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme: next } }));
    onThemeChange?.(next, variant, e.currentTarget);
  };

  const classes = [
    styles.themeSwitch,
    styles[variant],
    iconOnly ? styles.iconOnly : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      className={`relative inline-flex items-center justify-center rounded-[var(--radius-control)] cursor-pointer active:scale-[0.92] transition-[transform,color,background-color] duration-150 ${
        iconOnly
          ? "w-[36px] h-[36px] shrink-0 bg-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] p-2"
          : "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--surface)] px-3 py-1.5 gap-2 text-xs font-medium"
      } ${classes}`}
      data-theme={currentTheme}
      aria-label={label}
      title={label}
      aria-pressed={currentTheme === "dark"}
      onClick={handleToggle}
    >
      <span className={styles.iconWrap}>
        <span className={styles.iconGraphic}>
          {mounted ? (
            currentTheme === "dark" ? (
              <Sun size={18} strokeWidth={1.8} className="text-current" />
            ) : (
              <Moon size={18} strokeWidth={1.8} className="text-current" />
            )
          ) : (
            <Sun size={18} strokeWidth={1.8} className="text-current" />
          )}
        </span>
      </span>
      {!iconOnly && (
        <span className="text-xs font-medium">
          {currentTheme === "dark" ? "淺色模式" : "深色模式"}
        </span>
      )}
    </button>
  );
}

export default ThemeSwitch;

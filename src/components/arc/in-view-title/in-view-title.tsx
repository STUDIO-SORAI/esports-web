"use client";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useInView, useReducedMotion, type Transition } from "motion/react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./in-view-title.module.css";

export type InViewTitleVariant = "word" | "line" | "blur" | "tracking" | "wipe";

export interface InViewTitleProps {
  text: string;
  variant?: InViewTitleVariant;
  as?: "h1" | "h2" | "h3";
  lines?: string[];
  className?: string;
  id?: string;
  once?: boolean;
}

const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const FALLBACK_MS = 2400;
const lateBoot = typeof window !== "undefined" && performance.now() > FALLBACK_MS;
const enter = [...motionTokens.ease.enter] as [number, number, number, number];
const standard = [...motionTokens.ease.standard] as [number, number, number, number];
const TRACK_EM = .06;

function reveal(instant: boolean, visible: boolean, delay: number, settle = .8): Transition {
  if (instant) return { duration: 0 };
  if (!visible) return { duration: motionTokens.duration.exit, ease: standard };
  const track = (duration: number, ease = enter) => ({ duration, delay, ease });
  return {
    y: track(settle),
    x: track(settle),
    "--wipe": track(settle, standard),
    filter: track(settle * .78),
    opacity: track(settle * .56, standard),
  };
}

export function InViewTitle({
  text,
  variant = "blur",
  as = "h2",
  lines,
  className,
  id,
  once = true,
}: InViewTitleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount: .2 });
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (inView || passed) return;
    const revealPassedTitle = () => {
      if (ref.current && ref.current.getBoundingClientRect().top < window.innerHeight) {
        setPassed(true);
      }
    };
    revealPassedTitle();
    window.addEventListener("scroll", revealPassedTitle, { passive: true });
    return () => window.removeEventListener("scroll", revealPassedTitle);
  }, [inView, passed]);

  const prefersReduced = useReducedMotion();
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot);
  const [serverRendered] = useState(!hydrated);
  const reduced = hydrated && prefersReduced;
  const late = hydrated && serverRendered && lateBoot;
  const visible = reduced || late || inView || passed;
  const instant = Boolean(reduced || late);
  const Tag = as;
  const wrapperClass = [styles.wrap, hydrated ? "" : styles.pending, className].filter(Boolean).join(" ");
  const words = text.includes(" ") ? text.split(" ").filter(Boolean) : Array.from(text);
  const step = Math.min(motionTokens.stagger.word * 1.5, .35 / Math.max(words.length, 1));

  if (variant === "word") {
    return (
      <div ref={ref} className={wrapperClass}>
        <Tag id={id} className="m-0 font-bold text-inherit leading-tight" aria-label={text}>
          {words.map((word, index) => (
            <Fragment key={`${word}-${index}`}>
              <span className={styles.clip} aria-hidden="true">
                <motion.span
                  className={styles.part}
                  initial={false}
                  animate={visible ? { y: "0em", opacity: 1 } : { y: "0.9em", opacity: 0 }}
                  transition={reveal(instant, visible, index * step)}
                >
                  {word}
                </motion.span>
              </span>
              {index < words.length - 1 && text.includes(" ") ? " " : null}
            </Fragment>
          ))}
        </Tag>
      </div>
    );
  }

  if (variant === "line") {
    const titleLines = lines?.length ? lines : [text];
    return (
      <div ref={ref} className={wrapperClass}>
        <Tag id={id} className="m-0 font-bold text-inherit leading-tight" aria-label={text}>
          {titleLines.map((line, index) => (
            <span className={styles.lineClip} aria-hidden="true" key={`${line}-${index}`}>
              <motion.span
                className={styles.part}
                initial={false}
                animate={visible ? { y: "0%", opacity: 1 } : { y: "112%", opacity: 0 }}
                transition={reveal(instant, visible, index * motionTokens.stagger.line, .86)}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </Tag>
      </div>
    );
  }

  if (variant === "blur") {
    return (
      <div ref={ref} className={wrapperClass}>
        <Tag id={id} className="m-0 font-bold text-inherit leading-tight" aria-label={text}>
          {words.map((word, index) => (
            <Fragment key={`${word}-${index}`}>
              <motion.span
                className={`${styles.blurWord} ${styles.part}`}
                aria-hidden="true"
                initial={false}
                animate={
                  visible
                    ? { opacity: 1, y: "0em", filter: "blur(0px)" }
                    : { opacity: 0, y: "0.25em", filter: `blur(${motionTokens.blur.text}px)` }
                }
                transition={reveal(instant, visible, index * step)}
              >
                {word}
              </motion.span>
              {index < words.length - 1 && text.includes(" ") ? " " : null}
            </Fragment>
          ))}
        </Tag>
      </div>
    );
  }

  if (variant === "tracking") {
    return (
      <div ref={ref} className={wrapperClass}>
        <Tag id={id} className="m-0 font-bold text-inherit leading-tight" aria-label={text}>
          {words.map((word, index) => {
            const letters = Array.from(word);
            const center = (letters.length - 1) / 2;
            const delay = index * motionTokens.stagger.char * 2;
            return (
              <Fragment key={`${word}-${index}`}>
                <motion.span
                  className={`${styles.trackWord} ${styles.part}`}
                  aria-hidden="true"
                  initial={false}
                  animate={visible ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: `blur(${motionTokens.blur.soft}px)` }}
                  transition={reveal(instant, visible, delay, .9)}
                >
                  {letters.map((letter, letterIndex) => (
                    <motion.span
                      key={letterIndex}
                      className={styles.part}
                      initial={false}
                      animate={{ x: visible ? "0em" : `${(center - letterIndex) * TRACK_EM}em` }}
                      transition={reveal(instant, visible, delay, 1)}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </motion.span>
                {index < words.length - 1 && text.includes(" ") ? " " : null}
              </Fragment>
            );
          })}
        </Tag>
      </div>
    );
  }

  return (
    <div ref={ref} className={wrapperClass}>
      <motion.div
        className={`${styles.wipe} ${styles.part}`}
        initial={false}
        animate={visible ? { "--wipe": "0%", x: "0em" } : { "--wipe": "100%", x: "-0.12em" }}
        transition={reveal(instant, visible, 0, .9)}
      >
        <Tag id={id} className="m-0 font-bold text-inherit leading-tight">{text}</Tag>
      </motion.div>
    </div>
  );
}

export default InViewTitle;

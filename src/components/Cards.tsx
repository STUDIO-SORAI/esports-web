"use client";

import type { Post, Author } from "@/lib/types";
import { splitShareTitleLines, toPlainShareTitle } from "@/lib/seo";
import { categoryFromPost, formatDate, getReadTime } from "@/lib/api";
import { getCategoryLogo, getGameLogoSet } from "@/lib/config";
import { ClockIcon, CalendarIcon } from "./Icons";

export function CategoryTag({
  category,
  onDark = false,
  size = "sm",
}: {
  category: string;
  onDark?: boolean;
  size?: "sm" | "md";
}) {
  const logos = getGameLogoSet(category);
  const textClass = onDark
    ? "text-white/95 group-hover:text-white"
    : "text-[var(--text-secondary)] group-hover:text-[var(--foreground)]";
  const logoSize = size === "md" ? "w-4 h-4 sm:w-4.5 sm:h-4.5" : "w-3.5 h-3.5";
  const textSize = size === "md" ? "text-xs sm:text-sm" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${textSize} font-semibold tracking-wide transition-colors ${textClass}`}
    >
      {logos ? (
        logos.color ? (
          <img
            src={logos.color}
            alt=""
            className={`${logoSize} object-contain shrink-0 ${onDark ? "drop-shadow-sm" : ""}`}
          />
        ) : onDark ? (
          <img
            src={logos.white}
            alt=""
            className={`${logoSize} object-contain shrink-0 drop-shadow-sm`}
          />
        ) : (
          <>
            <img
              src={logos.dark}
              alt=""
              className={`${logoSize} object-contain shrink-0 dark:hidden`}
            />
            <img
              src={logos.white}
              alt=""
              className={`${logoSize} object-contain shrink-0 hidden dark:block`}
            />
          </>
        )
      ) : null}
      <span>#{category}</span>
    </span>
  );
}

const DEFAULT_IMAGE = "/og-image.png";

interface CardProps {
  post: Post;
  authorsMap?: Map<string, Author>;
  priority?: boolean;
}

export function MosaicCard({ post, authorsMap }: CardProps) {
  const category = categoryFromPost(post);
  const authorIds = JSON.parse((post.authors as unknown as string) || "[]") as string[];
  const author = authorIds.length > 0 && authorsMap ? authorsMap.get(authorIds[0]) : null;

  return (
    <a
      href={`/post/${post.slug}`}
      className="group flex flex-col w-full h-full bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-[transform,background-color,box-shadow] duration-200 rounded-[var(--radius-panel)] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 active:scale-[0.99]"
    >
      <div className="relative w-full aspect-video overflow-hidden bg-[var(--surface-muted)] skullet-img-wrap">
        <img
          alt={toPlainShareTitle(post.title)}
          className="skullet-img w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105" onLoad={(e) => (e.currentTarget.dataset.loaded = "true")}
          src={post.coverImage || DEFAULT_IMAGE}
          loading="lazy"
        />
        {category && (
          <div className="absolute top-3 left-3 z-10">
            <CategoryTag category={category} onDark />
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-5 justify-between">
        <div>
          <h3 className="text-base sm:text-lg leading-snug font-bold tracking-tight text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
            {toPlainShareTitle(post.title)}
          </h3>
          {post.description && (
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm line-clamp-2 mt-2 leading-relaxed font-normal">
              {post.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 mt-4 pt-3 text-xs text-[var(--text-muted)] font-normal">
          <span className="truncate">{author?.name || formatDate(post.publishedAt || post.updatedAt)}</span>
          <span className="shrink-0">{getReadTime(post)}</span>
        </div>
      </div>
    </a>
  );
}

export function HeroFeatureCard({ post, authorsMap }: CardProps) {
  const category = categoryFromPost(post);
  const authorIds = JSON.parse((post.authors as unknown as string) || "[]") as string[];
  const author = authorIds.length > 0 && authorsMap ? authorsMap.get(authorIds[0]) : null;

  return (
    <a
      href={`/post/${post.slug}`}
      className="group relative block w-full aspect-[16/10] md:aspect-[21/9] overflow-hidden rounded-[var(--radius-panel)] skullet-img-wrap transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.995]"
    >
      <img
        alt={toPlainShareTitle(post.title)}
        className="skullet-img w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" onLoad={(e) => (e.currentTarget.dataset.loaded = "true")}
        src={post.coverImage || DEFAULT_IMAGE}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent z-10" />
      <div className="absolute bottom-0 z-20 flex flex-col items-start p-6 md:p-10 text-white w-full max-w-4xl">
        {category && (
          <div className="mb-3">
            <CategoryTag category={category} onDark size="md" />
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight mb-3 drop-shadow-md tracking-tight group-hover:text-[var(--accent)] transition-colors font-sans">
          {splitShareTitleLines(post.title).map((line, i) => (
            <span key={i} className="block">{line}</span>
          ))}
        </h2>
        {post.description && (
          <p className="text-white/85 line-clamp-2 text-sm md:text-base font-sans mb-5 max-w-3xl leading-relaxed font-normal">
            {post.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-white/75 text-xs font-sans tracking-wide">
          {author && (
            <div className="flex items-center gap-2 pr-4">
              {author.image ? (
                <img src={author.image} alt={author.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                  {author.name.charAt(0)}
                </div>
              )}
              <span className="font-semibold text-white">{author.name}</span>
            </div>
          )}
          <span className="flex items-center gap-1.5"><CalendarIcon /> {formatDate(post.publishedAt || post.updatedAt)}</span>
          <span className="flex items-center gap-1.5"><ClockIcon /> {getReadTime(post)}</span>
        </div>
      </div>
    </a>
  );
}

export function HorizontalCard({ post, authorsMap }: CardProps) {
  const category = categoryFromPost(post);
  const authorIds = JSON.parse((post.authors as unknown as string) || "[]") as string[];
  const author = authorIds.length > 0 && authorsMap ? authorsMap.get(authorIds[0]) : null;

  return (
    <a
      href={`/post/${post.slug}`}
      className="group block w-full bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-[transform,background-color,box-shadow] duration-200 rounded-[var(--radius-panel)] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 active:scale-[0.99]"
    >
      <div className="flex flex-col sm:flex-row w-full h-full">
        <div className="shrink-0 w-full sm:w-[280px] aspect-video sm:aspect-auto overflow-hidden bg-[var(--surface-muted)] skullet-img-wrap">
          <img
            alt={toPlainShareTitle(post.title)}
            className="skullet-img w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105" onLoad={(e) => (e.currentTarget.dataset.loaded = "true")}
            src={post.coverImage || DEFAULT_IMAGE}
            loading="lazy"
          />
        </div>
        <div className="flex flex-col justify-between p-5 md:p-6 w-full flex-1">
          <div>
            {category && (
              <div className="mb-2.5">
                <CategoryTag category={category} />
              </div>
            )}
            <h3 className="text-base sm:text-lg font-bold leading-snug text-[var(--foreground)] tracking-tight line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
              {toPlainShareTitle(post.title)}
            </h3>
            {post.description && (
              <p className="text-[var(--text-secondary)] text-sm line-clamp-2 mt-2 leading-relaxed max-w-2xl font-normal">
                {post.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 text-[var(--text-muted)] text-xs font-normal tracking-wide mt-4 pt-3">
            {author && <span className="font-semibold text-[var(--foreground)]">{author.name}</span>}
            {author && <span className="opacity-50">•</span>}
            <span>{formatDate(post.publishedAt || post.updatedAt)}</span>
            <span className="opacity-50">•</span>
            <span>{getReadTime(post)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

export function CompactCard({ post }: CardProps) {
  return (
    <a
      href={`/post/${post.slug}`}
      className="group flex gap-3.5 items-center w-full p-2 rounded-[var(--radius-panel)] hover:bg-[var(--surface-muted)] transition-[transform,background-color] duration-150 active:scale-[0.99]"
    >
      <div className="shrink-0 w-24 aspect-video overflow-hidden bg-[var(--surface-muted)] skullet-img-wrap rounded-[var(--radius-control)]">
        <img
          alt={toPlainShareTitle(post.title)}
          className="skullet-img w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105" onLoad={(e) => (e.currentTarget.dataset.loaded = "true")}
          src={post.coverImage || DEFAULT_IMAGE}
          loading="lazy"
        />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <h4 className="font-bold text-sm leading-snug line-clamp-2 text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
          {toPlainShareTitle(post.title)}
        </h4>
        <span className="text-xs text-[var(--text-muted)] mt-1.5 font-normal">
          {formatDate(post.publishedAt || post.updatedAt)}
        </span>
      </div>
    </a>
  );
}

export function SpotlightFeaturedCard({ post, authorsMap }: CardProps) {
  const category = categoryFromPost(post);
  const authorIds = JSON.parse((post.authors as unknown as string) || "[]") as string[];
  const author = authorIds.length > 0 && authorsMap ? authorsMap.get(authorIds[0]) : null;

  return (
    <a
      href={`/post/${post.slug}`}
      className="group flex flex-col w-full h-full bg-[var(--surface)] hover:bg-[var(--surface-muted)] shadow-xs hover:shadow-md transition-[transform,background-color,box-shadow] duration-200 rounded-[var(--radius-panel)] overflow-hidden hover:-translate-y-1 active:scale-[0.99]"
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-[var(--surface-muted)] skullet-img-wrap">
        <img
          alt={toPlainShareTitle(post.title)}
          className="skullet-img w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105" onLoad={(e) => (e.currentTarget.dataset.loaded = "true")}
          src={post.coverImage || DEFAULT_IMAGE}
          loading="lazy"
        />
      </div>
      <div className="flex flex-col items-start p-5 md:p-6 flex-1 w-full justify-between">
        <div>
          {category && (
            <div className="mb-3">
              <CategoryTag category={category} />
            </div>
          )}
          <h3 className="text-xl md:text-2xl font-bold leading-snug tracking-tight text-[var(--foreground)] line-clamp-3 group-hover:text-[var(--accent)] transition-colors">
            {toPlainShareTitle(post.title)}
          </h3>
          {post.description && (
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed line-clamp-3 mt-2.5 font-normal">
              {post.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 text-[var(--text-muted)] text-xs font-normal tracking-wide mt-4 pt-3 w-full">
          <span className="truncate">{author?.name || formatDate(post.publishedAt || post.updatedAt)}</span>
          <span className="shrink-0">{getReadTime(post)}</span>
        </div>
      </div>
    </a>
  );
}
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`skullet-sweep flex flex-col w-full h-full bg-[var(--surface)] p-4 rounded-[var(--radius-panel)] border border-transparent dark:border-white/5 ${className || ''}`}
      aria-hidden="true"
    >
      <div className="skullet-bone w-full aspect-video rounded-xl mb-3.5" />
      <div className="skullet-bone h-3 w-2/5 rounded-full mb-2.5" />
      <div className="skullet-bone h-3.5 w-11/12 rounded-full mb-2" />
      <div className="skullet-bone h-3.5 w-3/4 rounded-full mb-3.5" />
      <div className="flex items-center justify-between pt-1 mt-auto">
        <div className="skullet-bone h-2.5 w-16 rounded-full" />
        <div className="skullet-bone h-3 w-14 rounded-full" />
      </div>
    </div>
  );
}


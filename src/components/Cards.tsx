"use client";

import { Card, CardBody, CardFooter } from "@heroui/card";
import { Image } from "@heroui/image";
import { Chip } from "@heroui/chip";
import type { Post, Author } from "@/lib/types";
import { splitShareTitleLines, toPlainShareTitle } from "@/lib/seo";
import { categoryFromPost, formatDate, getReadTime } from "@/lib/api";
import { ClockIcon, CalendarIcon } from "./Icons";

const DEFAULT_IMAGE = "/og-image.png";

interface CardProps {
  post: Post;
  authorsMap?: Map<string, Author>;
  priority?: boolean;
}

export function MosaicCard({ post }: CardProps) {
  const category = categoryFromPost(post);
  return (
    <Card 
      as="a" 
      href={`/post/${post.slug}`}
      isPressable 
      className="group w-full h-full border border-divider bg-content1 shadow-sm hover:shadow-md hover:border-default-400 transition-[box-shadow,border-color] duration-300"
      radius="md"
    >
      <CardBody className="p-0 overflow-hidden">
        <Image
          isZoomed
          radius="none"
          width="100%"
          alt={toPlainShareTitle(post.title)}
          className="w-full object-cover aspect-video bg-default-100"
          src={post.coverImage || DEFAULT_IMAGE}
        />
      </CardBody>
      <CardFooter className="flex-col items-start gap-2 pt-4 px-5 pb-5 bg-transparent">
        <Chip size="sm" color="danger" variant="flat" radius="full" className="font-bold uppercase tracking-widest text-[10px] h-6 px-1">
          {category}
        </Chip>
        <h3 className="font-sans text-[18px] leading-snug font-bold text-foreground line-clamp-2">
          {toPlainShareTitle(post.title)}
        </h3>
      </CardFooter>
    </Card>
  );
}

export function HeroFeatureCard({ post, authorsMap }: CardProps) {
  const category = categoryFromPost(post);
  const authorIds = JSON.parse((post.authors as unknown as string) || "[]") as string[];
  const author = authorIds.length > 0 && authorsMap ? authorsMap.get(authorIds[0]) : null;

  return (
    <Card 
      as="a" 
      href={`/post/${post.slug}`}
      isPressable 
      className="group w-full aspect-[16/10] md:aspect-[21/9] border border-white/10 overflow-hidden"
      radius="none"
    >
      <Image
        removeWrapper
        radius="none"
        alt={toPlainShareTitle(post.title)}
        className="z-0 w-full h-full object-cover cover-zoom"
        src={post.coverImage || DEFAULT_IMAGE}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
      <CardFooter className="absolute bottom-0 z-20 flex-col items-start p-6 md:p-10 text-white w-full max-w-4xl">
        <Chip size="sm" color="danger" variant="solid" radius="full" className="font-bold uppercase tracking-widest text-[10px] mb-3 h-6 px-1">
          {category}
        </Chip>
        <h2 className="font-serif text-2xl md:text-5xl font-black leading-tight mb-3 drop-shadow-md tracking-tight">
          {splitShareTitleLines(post.title).map((line, i) => (
            <span key={i} className="block">{line}</span>
          ))}
        </h2>
        {post.description && (
          <p className="text-white/80 line-clamp-2 text-sm md:text-base font-sans mb-5 max-w-3xl">
            {post.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-white/70 text-xs font-sans tracking-wide">
          {author && (
            <div className="flex items-center gap-2 border-r border-white/20 pr-4">
              <img src={author.image} alt={author.name} className="w-6 h-6 border border-white/20 rounded-full" />
              <span className="font-semibold text-white">{author.name}</span>
            </div>
          )}
          <span className="flex items-center gap-1.5"><CalendarIcon /> {formatDate(post.publishedAt || post.updatedAt)}</span>
          <span className="flex items-center gap-1.5"><ClockIcon /> {getReadTime(post)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

export function HorizontalCard({ post, authorsMap }: CardProps) {
  const category = categoryFromPost(post);
  const authorIds = JSON.parse((post.authors as unknown as string) || "[]") as string[];
  const author = authorIds.length > 0 && authorsMap ? authorsMap.get(authorIds[0]) : null;

  return (
    <Card 
      as="a" 
      href={`/post/${post.slug}`}
      isPressable
      className="group w-full border border-divider bg-transparent hover:bg-content2 transition-colors shadow-none"
      radius="none"
    >
      <div className="flex flex-col sm:flex-row w-full h-full">
        <div className="flex-shrink-0 w-full sm:w-[280px] aspect-[16/10] sm:aspect-auto overflow-hidden bg-default-100">
          <Image
            removeWrapper
            radius="none"
            alt={toPlainShareTitle(post.title)}
            className="w-full h-full object-cover cover-zoom"
            src={post.coverImage || DEFAULT_IMAGE}
          />
        </div>
        <CardBody className="flex flex-col justify-center p-5 md:p-6 w-full">
          <div className="mb-3">
             <span className="text-danger text-xs font-bold uppercase tracking-widest">{category}</span>
          </div>
          <h3 className="font-sans text-xl md:text-2xl font-bold leading-snug text-foreground mb-3 line-clamp-2 group-hover:text-danger transition-colors">
            {toPlainShareTitle(post.title)}
          </h3>
          {post.description && (
            <p className="text-default-500 text-sm line-clamp-2 mb-4 leading-relaxed max-w-2xl">
              {post.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-default-400 text-xs font-sans tracking-wide mt-auto">
            {author && <span className="font-semibold text-default-700">{author.name}</span>}
            {author && <span className="opacity-50">•</span>}
            <span>{formatDate(post.publishedAt || post.updatedAt)}</span>
            <span className="opacity-50">•</span>
            <span>{getReadTime(post)}</span>
          </div>
        </CardBody>
      </div>
    </Card>
  );
}

export function CompactCard({ post }: CardProps) {
  return (
    <a
      href={`/post/${post.slug}`}
      className="group flex gap-4 items-start w-full py-4 transition-opacity hover:opacity-80"
    >
      <div className="flex-shrink-0 w-24 aspect-video overflow-hidden bg-default-100 border border-divider rounded">
        <img
          alt={toPlainShareTitle(post.title)}
          className="w-full h-full object-cover cover-zoom"
          src={post.coverImage || DEFAULT_IMAGE}
        />
      </div>
      <div className="flex flex-col flex-1">
        <h4 className="font-sans font-bold text-sm leading-relaxed line-clamp-2 text-foreground group-hover:text-danger flex-grow transition-colors">
          {toPlainShareTitle(post.title)}
        </h4>
        <span className="text-xs text-default-400 mt-2 font-sans tracking-wide">
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
    <Card 
      as="a" 
      href={`/post/${post.slug}`}
      isPressable
      className="group w-full h-full border border-divider bg-content1 hover:bg-content2 shadow-none hover:shadow-lg transition-[background-color,box-shadow]"
      radius="none"
    >
      <CardBody className="p-0 overflow-hidden border-b border-divider">
        <Image
          isZoomed
          radius="none"
          width="100%"
          alt={toPlainShareTitle(post.title)}
          className="w-full object-cover aspect-[4/3] bg-default-100"
          src={post.coverImage || DEFAULT_IMAGE}
        />
      </CardBody>
      <CardFooter className="flex-col items-start gap-4 p-6 bg-transparent h-full">
        <span className="text-danger text-[10px] font-bold uppercase tracking-widest">{category}</span>
        <h3 className="font-serif text-2xl md:text-3xl font-bold leading-tight text-foreground line-clamp-3">
          {toPlainShareTitle(post.title)}
        </h3>
        {post.description && (
          <p className="text-default-500 text-sm leading-relaxed line-clamp-3">
            {post.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-default-400 text-xs font-sans tracking-wide mt-auto pt-2">
          {author && <span className="font-semibold text-default-700">{author.name}</span>}
          {author && <span className="text-default-300">•</span>}
          <span>{formatDate(post.publishedAt || post.updatedAt)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

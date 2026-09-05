import React from 'react';
import { SITE_URL } from '../lib/config';

interface TwitchEmbedProps {
  clipId?: string;
  videoId?: string;
  channel?: string;
  url?: string;
}

/**
 * Parses various Twitch URLs (Clips, VODs, Channels, Embed URLs)
 */
export function parseTwitchUrl(url: string): { type: 'clip' | 'video' | 'channel'; id: string } | null {
  if (!url) return null;

  // 1. Query parameter clip: e.g. https://clips.twitch.tv/embed?clip=Slug or src="...clip=Slug..."
  const clipQueryMatch = url.match(/[?&]clip=([a-zA-Z0-9_-]+)/i);
  if (clipQueryMatch) {
    return { type: 'clip', id: clipQueryMatch[1] };
  }

  // 2. Hostname clips.twitch.tv: e.g. https://clips.twitch.tv/Slug
  const clipsHostMatch = url.match(/^https?:\/\/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/i);
  if (clipsHostMatch && clipsHostMatch[1] !== 'embed') {
    return { type: 'clip', id: clipsHostMatch[1] };
  }

  // 3. Channel clip: e.g. https://www.twitch.tv/zod3444/clip/Slug
  const channelClipMatch = url.match(/^https?:\/\/(?:www\.)?twitch\.tv\/[a-zA-Z0-9_]+\/clip\/([a-zA-Z0-9_-]+)/i);
  if (channelClipMatch) {
    return { type: 'clip', id: channelClipMatch[1] };
  }

  // 4. Twitch VOD/Video: https://www.twitch.tv/videos/123456789
  const videoMatch = url.match(/^https?:\/\/(?:www\.)?twitch\.tv\/videos\/(\d+)/i);
  if (videoMatch) {
    return { type: 'video', id: videoMatch[1] };
  }

  // 5. Twitch Channel: https://www.twitch.tv/channel_name
  const channelMatch = url.match(/^https?:\/\/(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]{3,25})(?:\/|$|\?)/i);
  if (
    channelMatch &&
    !['directory', 'videos', 'p', 'settings', 'downloads', 'clip', 'embed'].includes(
      channelMatch[1].toLowerCase()
    )
  ) {
    return { type: 'channel', id: channelMatch[1] };
  }

  return null;
}

function getDefaultHostname(): string {
  try {
    if (SITE_URL) return new URL(SITE_URL).hostname;
  } catch {}
  return 'esports.sorai.tw';
}

export function TwitchEmbed({ clipId, videoId, channel, url }: TwitchEmbedProps) {
  const [hostname, setHostname] = React.useState<string>(getDefaultHostname());

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname) {
      setHostname(window.location.hostname);
    }
  }, []);

  let targetType: 'clip' | 'video' | 'channel' | null = null;
  let targetId = '';

  if (clipId) {
    targetType = 'clip';
    targetId = clipId;
  } else if (videoId) {
    targetType = 'video';
    targetId = videoId;
  } else if (channel) {
    targetType = 'channel';
    targetId = channel;
  } else if (url) {
    const parsed = parseTwitchUrl(url);
    if (parsed) {
      targetType = parsed.type;
      targetId = parsed.id;
    }
  }

  if (!targetType || !targetId) {
    return null;
  }

  // Twitch embeds require the parent parameter for security.
  // We include dynamic hostname + default production & dev domains.
  const parentDomains = Array.from(
    new Set([hostname, 'esports.sorai.tw', 'sorai.tw', 'cms.sorai.tw', 'localhost', '127.0.0.1'])
  ).filter(Boolean);

  const parentParams = parentDomains.map((d) => `parent=${encodeURIComponent(d)}`).join('&');

  let src = '';
  if (targetType === 'clip') {
    src = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(targetId)}&${parentParams}&autoplay=false`;
  } else if (targetType === 'video') {
    src = `https://player.twitch.tv/?video=${encodeURIComponent(targetId)}&${parentParams}&autoplay=false`;
  } else if (targetType === 'channel') {
    src = `https://player.twitch.tv/?channel=${encodeURIComponent(targetId)}&${parentParams}&autoplay=false`;
  }

  return (
    <span
      className="block my-8 rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 bg-black not-prose"
      style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}
    >
      <iframe
        title={`Twitch ${targetType} ${targetId}`}
        src={src}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 0,
          margin: 0,
          padding: 0,
          display: 'block',
        }}
        allowFullScreen
        scrolling="no"
      />
    </span>
  );
}

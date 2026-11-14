'use client';

import React from 'react';
import { AnnouncementBar, type Announcement } from './arc';

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'vct-transfers-2027',
    message: (
      <span className="inline-flex items-center gap-1.5 leading-normal text-xs sm:text-[13px]">
        <img
          src="/valorantct.png"
          alt="VCT"
          className="w-3.5 h-3.5 object-contain brightness-0 dark:invert shrink-0 block opacity-85"
        />
        <span className="whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
          2027 賽季 VCT 賽區轉會名單已更新！
        </span>
        <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400 font-normal">
          即時掌握各隊最新陣容與合約動向
        </span>
      </span>
    ),
    action: {
      label: '查看轉會名單',
      href: '/transfers',
      className: '!text-red-600 dark:!text-red-500 hover:!text-red-500 dark:hover:!text-red-400 font-semibold leading-normal text-xs sm:text-[13px] inline-flex items-center whitespace-nowrap relative sm:-top-[1px]',
    },
  },
];

interface HomeAnnouncementBarProps {
  announcements?: Announcement[];
  className?: string;
}

export const HomeAnnouncementBar: React.FC<HomeAnnouncementBarProps> = ({
  announcements = DEFAULT_ANNOUNCEMENTS,
  className = '',
}) => {
  return (
    <AnnouncementBar
      messages={announcements}
      tone="glass"
      autoPlay={false}
      controls={false}
      dismissible={true}
      label="重點情報公告"
      className={`fixed bottom-0 inset-x-0 w-full z-50 backdrop-blur-md ${className}`}
    />
  );
};

export default HomeAnnouncementBar;

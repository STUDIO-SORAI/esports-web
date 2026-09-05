import { describe, expect, it } from 'vitest';
import { parseTwitchUrl } from './TwitchEmbed';

describe('parseTwitchUrl', () => {
  it('正確解析 clips.twitch.tv 短網址', () => {
    const res = parseTwitchUrl('https://clips.twitch.tv/FaithfulAdorableVelociraptorAMPEnergyCherry-qRBbOLo5usP9nX0d');
    expect(res).toEqual({
      type: 'clip',
      id: 'FaithfulAdorableVelociraptorAMPEnergyCherry-qRBbOLo5usP9nX0d',
    });
  });

  it('正確解析 clips.twitch.tv/embed?clip=... 嵌入網址', () => {
    const res = parseTwitchUrl('https://clips.twitch.tv/embed?clip=FaithfulAdorableVelociraptorAMPEnergyCherry-qRBbOLo5usP9nX0d&parent=esports.sorai.tw');
    expect(res).toEqual({
      type: 'clip',
      id: 'FaithfulAdorableVelociraptorAMPEnergyCherry-qRBbOLo5usP9nX0d',
    });
  });

  it('正確解析 twitch.tv/channel/clip/Slug 頻道剪輯網址', () => {
    const res = parseTwitchUrl('https://www.twitch.tv/zod3444/clip/FaithfulAdorableVelociraptorAMPEnergyCherry-qRBbOLo5usP9nX0d?filter=clips&range=7d');
    expect(res).toEqual({
      type: 'clip',
      id: 'FaithfulAdorableVelociraptorAMPEnergyCherry-qRBbOLo5usP9nX0d',
    });
  });

  it('正確解析 twitch.tv/videos/1234567890 隨選影片 (VOD)', () => {
    const res = parseTwitchUrl('https://www.twitch.tv/videos/1234567890');
    expect(res).toEqual({
      type: 'video',
      id: '1234567890',
    });
  });

  it('正確解析 twitch.tv/zod3444 直播頻道', () => {
    const res = parseTwitchUrl('https://www.twitch.tv/zod3444');
    expect(res).toEqual({
      type: 'channel',
      id: 'zod3444',
    });
  });

  it('排除非頻道的保留路由 (如 /directory, /videos)', () => {
    expect(parseTwitchUrl('https://www.twitch.tv/directory')).toBeNull();
  });

  it('無效網址回傳 null', () => {
    expect(parseTwitchUrl('')).toBeNull();
    expect(parseTwitchUrl('https://youtube.com/watch?v=123')).toBeNull();
  });
});

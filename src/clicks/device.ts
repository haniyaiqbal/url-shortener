import type { Device } from './click.entity.js';

const BOT = /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp/i;
const MOBILE = /mobile|android|iphone|ipad|ipod/i;

/** A rough guess from the User-Agent header. Good enough for stats. */
export function detectDevice(userAgent: string | undefined | null): Device {
  if (!userAgent) return 'other';
  if (BOT.test(userAgent)) return 'bot';
  if (MOBILE.test(userAgent)) return 'mobile';
  if (/windows|macintosh|linux|cros/i.test(userAgent)) return 'desktop';
  return 'other';
}

/** Keeps only the hostname of the referring page, e.g. "news.ycombinator.com". */
export function referrerHost(
  referrer: string | undefined | null,
): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.slice(0, 255) || null;
  } catch {
    return null;
  }
}

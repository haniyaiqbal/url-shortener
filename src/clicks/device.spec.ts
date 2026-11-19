import { detectDevice, referrerHost } from './device.js';

describe('detectDevice', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'mobile'],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile', 'mobile'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'desktop'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', 'desktop'],
    ['Googlebot/2.1 (+http://www.google.com/bot.html)', 'bot'],
    ['Slackbot-LinkExpanding 1.0', 'bot'],
    ['curl/8.0', 'other'],
  ])('%s → %s', (userAgent, expected) => {
    expect(detectDevice(userAgent)).toBe(expected);
  });

  it('handles a missing header', () => {
    expect(detectDevice(undefined)).toBe('other');
  });
});

describe('referrerHost', () => {
  it('keeps only the hostname', () => {
    expect(
      referrerHost('https://news.ycombinator.com/item?id=1&secret=x'),
    ).toBe('news.ycombinator.com');
  });

  it.each([undefined, null, '', 'not a url'])(
    'returns null for %s',
    (value) => {
      expect(referrerHost(value)).toBeNull();
    },
  );
});

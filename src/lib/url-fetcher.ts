import * as cheerio from 'cheerio';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import type { FetchedSource } from '@/types';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const MAX_CONTENT_LENGTH = 12_000;
const MAX_HTML_BYTES = 3_000_000;
const FETCH_TIMEOUT_MS = 10_000;

/** Selectors to remove before extracting body text. */
const STRIP_SELECTORS = [
  'script',
  'style',
  'noscript',
  'nav',
  'footer',
  'header',
  'aside',
  'iframe',
  '.ad',
  '.ads',
  '.advertisement',
  '.social-share',
  '.related-posts',
  '.comments',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
];

/** Selectors to try (in priority order) for the main article content. */
const CONTENT_SELECTORS = [
  'article',
  'main',
  '.post-content',
  '.article-body',
  '.entry-content',
  '.post-body',
  '.story-body',
  '[role="main"]',
];

function cleanWhitespace(text: string): string {
  return text
    .replace(/[\t ]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const MAX_REDIRECTS = 5;

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPrivateIp(ip: string): boolean {
  const v = ip.replace(/^\[|\]$/g, '').toLowerCase();
  if (isIP(v) === 6) {
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return v === '::' || v === '::1' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff');
  }
  if (isIP(v) === 4) {
    const [a, b] = v.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  return false;
}

/**
 * Synchronous URL checks: http(s) only, no credentials, no localhost/internal names or private IP literals.
 * Returns an error message, or null if the URL looks acceptable.
 */
export function validateFetchableUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return `Invalid URL format: "${raw}". Include the protocol (https://...).`;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'Only http(s) URLs are allowed.';
  if (u.username || u.password) return 'URLs with embedded credentials are not allowed.';
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || isPrivateIp(h)) {
    return 'URLs pointing to local or private network addresses are not allowed.';
  }
  return null;
}

/** Resolve the hostname and reject it if ANY address is non-public (blocks names that point at internal IPs). */
async function assertPublicHost(hostname: string): Promise<string | null> {
  const bare = hostname.replace(/^\[|\]$/g, '');
  if (isIP(bare)) return isPrivateIp(bare) ? 'URLs pointing to local or private network addresses are not allowed.' : null;
  try {
    const addrs = await lookup(bare, { all: true });
    if (addrs.length === 0) return 'Hostname did not resolve.';
    if (addrs.some((a) => isPrivateIp(a.address))) return 'URLs pointing to local or private network addresses are not allowed.';
    return null;
  } catch {
    return 'Hostname could not be resolved.';
  }
}

export async function fetchUrlContent(url: string): Promise<FetchedSource> {
  const now = new Date().toISOString();
  const failed = (error: string): FetchedSource => ({
    url, title: '', content: '', fetchedAt: now, status: 'failed', error,
  });

  const urlError = validateFetchableUrl(url);
  if (urlError) return failed(urlError);

  // One timer covers connect AND body download (stopping the timer early would let a slow download hang).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Follow redirects manually so every hop is re-validated (a public URL can redirect to an internal one).
    let current = url;
    let response!: Response;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const hopError = validateFetchableUrl(current) || (await assertPublicHost(new URL(current).hostname));
      if (hopError) return failed(hopError);

      response = await fetch(current, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
        signal: controller.signal,
        redirect: 'manual',
      });

      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        if (hop === MAX_REDIRECTS) return failed('Too many redirects.');
        current = new URL(location, current).toString();
        continue;
      }
      break;
    }

    if (!response.ok) {
      return {
        url,
        title: '',
        content: '',
        fetchedAt: now,
        status: 'failed',
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !/text\/html|application\/xhtml|text\/plain/i.test(contentType)) {
      return failed(`Unsupported content type: ${contentType.split(';')[0]}. Paste the text instead.`);
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $(STRIP_SELECTORS.join(', ')).remove();

    // Extract title
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const titleTag = $('title').text();
    const title = (ogTitle || titleTag || '').trim();

    // Extract main content
    let mainContent = '';
    for (const selector of CONTENT_SELECTORS) {
      const el = $(selector);
      if (el.length > 0) {
        mainContent = el.text();
        break;
      }
    }

    // Fallback to body
    if (!mainContent.trim()) {
      mainContent = $('body').text();
    }

    const content = cleanWhitespace(mainContent).slice(0, MAX_CONTENT_LENGTH);

    if (!content) {
      return {
        url,
        title,
        content: '',
        fetchedAt: now,
        status: 'failed',
        error: 'No readable content could be extracted from the page.',
      };
    }

    return { url, title, content, fetchedAt: now, status: 'success' };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === 'AbortError'
          ? `Request timed out after ${FETCH_TIMEOUT_MS / 1000}s`
          : error.message
        : 'Unknown fetch error';

    return {
      url,
      title: '',
      content: '',
      fetchedAt: now,
      status: 'failed',
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Outbound fetch that never follows a redirect off the allowed host list. */
const MAX_HOPS = 3;
export function allowedUrl(raw, hosts) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  return hosts.includes(url.hostname) ? url : null;
}
/** Follows at most MAX_HOPS redirects itself, re-checking each Location against `hosts`. */
export async function safeFetch(raw, options, hosts) {
  let url = allowedUrl(raw, hosts);
  if (!url) throw new Error('Host not allowed');
  for (let hop = 0; ; hop++) {
    const resp = await fetch(url, { ...options, redirect: 'manual' });
    if (resp.status < 300 || resp.status > 399 || resp.status === 304) return resp;
    const location = resp.headers.get('location');
    try {
      await resp.body?.cancel();
    } catch {}
    if (!location || hop >= MAX_HOPS) throw new Error('Redirect not followed (HTTP ' + resp.status + ')');
    const next = allowedUrl(new URL(location, url).href, hosts);
    if (!next) throw new Error('Redirect to a host that is not allowed');
    url = next;
  }
}

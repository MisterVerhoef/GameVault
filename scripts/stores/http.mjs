const USER_AGENT = "GameVaultCatalogue/1.0";

export function createLimiter(intervalMs) {
  let next = 0;
  return async function waitTurn() {
    const now = Date.now();
    const slot = Math.max(now, next);
    next = slot + intervalMs;
    const delay = slot - now;
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  };
}

export function createCircuit(name) {
  let failures = 0;
  let open = false;
  let reason = "";
  return {
    get open() {
      return open;
    },
    get reason() {
      return reason;
    },
    success() {
      failures = 0;
    },
    fail(error) {
      failures += 1;
      reason = error.message;
      console.warn(`${name}: ${error.message}`);
      if (error.fatal || failures >= 4) open = true;
    },
    trip(message) {
      open = true;
      reason = message;
      console.warn(`${name}: ${message}`);
    },
  };
}

async function fetchJsonOnce(url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT, ...headers },
      signal: controller.signal,
      redirect: "follow",
    });
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} for ${new URL(url).hostname}`);
      error.status = response.status;
      error.body = text.slice(0, 240);
      throw error;
    }
    if (!text) {
      const error = new Error(`Empty response from ${new URL(url).hostname}`);
      error.status = 502;
      throw error;
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, headers = {}) {
  try {
    return await fetchJsonOnce(url, headers);
  } catch (error) {
    if (error.status && error.status < 500 && error.status !== 429) throw error;
    await new Promise((resolve) => setTimeout(resolve, 400));
    return fetchJsonOnce(url, headers);
  }
}

export function httpsUrl(url) {
  if (typeof url !== "string" || url.length === 0) return undefined;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  return undefined;
}

export function isMiss(error) {
  return error?.status === 404;
}

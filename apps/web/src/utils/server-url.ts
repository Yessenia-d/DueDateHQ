import { env } from "@due-date-hq/env/web";

export function getServerUrl() {
  if (typeof window === "undefined") {
    return env.VITE_SERVER_URL;
  }

  try {
    const serverUrl = new URL(env.VITE_SERVER_URL);
    const pageUrl = new URL(window.location.href);

    if (isLoopbackHost(serverUrl.hostname) && isLoopbackHost(pageUrl.hostname)) {
      serverUrl.hostname = pageUrl.hostname;
    }

    return serverUrl.origin;
  } catch {
    return env.VITE_SERVER_URL;
  }
}

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

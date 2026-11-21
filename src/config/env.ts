const API_URLS = {
  dev: "https://bhps-dev-e5405195a6cd.herokuapp.com/api",
  uat: "https:///api",
  prod: "https:///api",
} as const;

type AppEnv = keyof typeof API_URLS;

function resolveAppEnv(raw: string | undefined): AppEnv {
  if (raw === undefined || raw === "dev") {
    return "dev";
  }
  if (raw === "uat") {
    return "uat";
  }
  if (raw === "prod") {
    return "prod";
  }
  throw new Error(`Invalid APP_ENV "${raw}".`);
}

function resolveApiBaseUrl(env: AppEnv, override: string | undefined): string {
  const candidate = override?.trim() || API_URLS[env];

  // WHATWG `new URL("https:///api")` silently strips extra slashes and parses "api" as the host.
  if (!candidate || /^https?:\/\/\//iu.test(candidate)) {
    throw new Error(
      `Invalid API base URL "${candidate}" for APP_ENV "${env}". Set API_BASE_URL to a valid http(s) URL.`
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      `Invalid API base URL "${candidate}" for APP_ENV "${env}". Set API_BASE_URL to a valid http(s) URL.`
    );
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    !parsed.hostname
  ) {
    throw new Error(
      `Invalid API base URL "${candidate}" for APP_ENV "${env}". Expected an http(s) URL with a valid host.`
    );
  }

  return candidate.replace(/\/+$/u, "");
}

const appEnv = resolveAppEnv(process.env.APP_ENV);
const apiBaseUrl = resolveApiBaseUrl(appEnv, process.env.API_BASE_URL);

export const config = {
  appEnv,
  apiBaseUrl,
} as const;

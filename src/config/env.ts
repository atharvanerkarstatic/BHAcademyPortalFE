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

const appEnv = resolveAppEnv(process.env.APP_ENV);

export const config = {
  appEnv,
  apiBaseUrl: API_URLS[appEnv],
} as const;

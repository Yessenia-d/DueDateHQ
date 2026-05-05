/// <reference path="../env.d.ts" />
// For Cloudflare Workers, env is accessed via cloudflare:workers module
// Types are defined in env.d.ts based on your alchemy.run.ts bindings
export { env } from "cloudflare:workers";

export const officialNoticeAiProviders = ["none", "openai", "workers_ai"] as const;

export type OfficialNoticeAiProvider = (typeof officialNoticeAiProviders)[number];

export type OfficialNoticeMonitorEnv = {
  OFFICIAL_NOTICE_AI_PROVIDER?: string | null;
  OFFICIAL_NOTICE_AI_MODEL?: string | null;
  OFFICIAL_NOTICE_AI_API_KEY?: string | null;
  OFFICIAL_SOURCE_MONITOR_TOKEN?: string | null;
};

export type OfficialNoticeAiConfig = {
  provider: OfficialNoticeAiProvider;
  model: string | null;
  apiKeyConfigured: boolean;
};

export type OfficialNoticeMonitorConfig = {
  ai: OfficialNoticeAiConfig;
  monitorTokenConfigured: boolean;
};

export function readOfficialNoticeMonitorConfig(
  runtimeEnv: OfficialNoticeMonitorEnv,
): OfficialNoticeMonitorConfig {
  const provider = normalizeAiProvider(runtimeEnv.OFFICIAL_NOTICE_AI_PROVIDER);

  return {
    ai: {
      provider,
      model: normalizeOptionalText(runtimeEnv.OFFICIAL_NOTICE_AI_MODEL),
      apiKeyConfigured: Boolean(normalizeOptionalText(runtimeEnv.OFFICIAL_NOTICE_AI_API_KEY)),
    },
    monitorTokenConfigured: Boolean(
      normalizeOptionalText(runtimeEnv.OFFICIAL_SOURCE_MONITOR_TOKEN),
    ),
  };
}

function normalizeAiProvider(value: string | null | undefined): OfficialNoticeAiProvider {
  if (value === "openai" || value === "workers_ai") {
    return value;
  }

  return "none";
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

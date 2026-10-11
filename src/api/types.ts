// Gateway contract types — source of truth is GATEWAY_API.md (do not duplicate docs here).
// 43 models, 6 active providers (2026-10-11 verified).

export type ProviderId =
  | "easemate"
  | "freeai"
  | "darkps"
  | "aichat"
  | "rewind"
  | "chatsmith";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  provider?: ProviderId | string;
  file_urls?: string[];
  system_prompt?: string;
}

export interface ModelEntry {
  id: string;
  object: "model";
  owned_by: string;
  display: string;
  ease_model_id?: string;
}

export interface ModelsResponse {
  object: "list";
  data: ModelEntry[];
}

export interface ChatChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string | null;
}

export interface ChatResponse {
  id: string;
  object: string;
  model: string;
  choices: ChatChoice[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface GatewayErrorShape {
  status: number;
  code: string;
  message: string;
  userMessage: string;
}

export interface StoredModel {
  provider: string;
  model: string;
  display: string;
}

export interface StoredSettings {
  base: string;
  temperature: number;
  system_prompt: string;
  stream: boolean;
}

export const DEFAULT_GATEWAY_BASE = "https://free-ai-gateway.img-api.workers.dev";

export const DEFAULT_MODEL: StoredModel = {
  provider: "freeai",
  model: "qwen3-8b",
  display: "Qwen 3 8B",
};

export const DEFAULT_SETTINGS: StoredSettings = {
  base: DEFAULT_GATEWAY_BASE,
  temperature: 0.7,
  system_prompt: "",
  stream: true,
};

// Exact Arabic UI strings (AGENTS.md — literal, do not rephrase).
export const ERR_STRINGS = {
  empty400: "اكتب رسالتك أولاً.",
  notFound404: "الخدمة غير متاحة الآن — تحقق من عنوان القاعدة.",
  quota429: "نفدت حصتك اليومية المجانية — جرّب مزوداً آخر أو عُد غداً.",
  upstream502: "المزود لا يرد الآن — جرّب مجدداً بعد قليل.",
  authExpired502: "انتهت جلسة هذا المزود — أُعيد الاتصال تلقائياً، أعد المحاولة.",
  empty200: "وصل رد فارغ من المزود — هذه مشكلة معروفة لديه.",
  offline: "لا يوجد اتصال بالإنترنت.",
} as const;

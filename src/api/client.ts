import {
  DEFAULT_GATEWAY_BASE,
  ERR_STRINGS,
  type ChatRequest,
  type ChatResponse,
  type GatewayErrorShape,
  type ModelsResponse,
} from "./types";

// All gateway calls client-side (CORS * open; browser UA bypasses edge 1010).
// Gateway base is fixed at build time (VITE_GATEWAY_BASE) — no UI to change it.
// Never surface raw upstream error text (may leak source names) — map to neutral Arabic strings.
// Always log {provider, model, status, time} to console.

export function getBase(): string {
  const envBase = import.meta.env.VITE_GATEWAY_BASE as string | undefined;
  return (envBase || DEFAULT_GATEWAY_BASE).replace(/\/$/, "");
}

function headers(json = true): HeadersInit {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export function mapError(status: number, code: string): string {
  if (!navigator.onLine) return ERR_STRINGS.offline;
  if (status === 404) return ERR_STRINGS.notFound404;
  if (status === 429) return ERR_STRINGS.quota429;
  if (status === 502 && code === "AUTH_EXPIRED") return ERR_STRINGS.authExpired502;
  if (status === 502) return ERR_STRINGS.upstream502;
  return ERR_STRINGS.upstream502;
}

function logCall(provider: string, model: string, status: number): void {
  console.log(JSON.stringify({ provider, model, status, time: new Date().toISOString() }));
}

export async function listModels(signal?: AbortSignal): Promise<ModelsResponse> {
  const base = getBase();
  const res = await fetch(`${base}/v1/models`, { headers: headers(false), signal });
  logCall("registry", "models", res.status);
  if (!res.ok) {
    const code = res.status === 404 ? "not_found" : "upstream_error";
    throw { status: res.status, code, message: String(res.status), userMessage: mapError(res.status, code) } as GatewayErrorShape;
  }
  return (await res.json()) as ModelsResponse;
}

export async function chatOnce(req: ChatRequest, signal?: AbortSignal): Promise<string> {
  if (!req.messages.some((m) => m.role === "user" && m.content.trim().length > 0)) {
    throw { status: 400, code: "bad_request", message: "empty", userMessage: ERR_STRINGS.empty400 } as GatewayErrorShape;
  }
  const base = getBase();
  const provider = req.provider ?? "auto";
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ ...req, stream: false }),
    signal,
  });
  logCall(String(provider), req.model, res.status);
  if (!res.ok) {
    let code = "upstream_error";
    try {
      const j = (await res.json()) as { error?: { code?: string } };
      if (j.error?.code) code = j.error.code;
    } catch {
      /* ignore */
    }
    throw { status: res.status, code, message: code, userMessage: mapError(res.status, code) } as GatewayErrorShape;
  }
  const data = (await res.json()) as ChatResponse;
  return data.choices?.[0]?.message?.content ?? "";
}

// Stream parser accepts both shapes:
// - single full-content chunk + stop chunk + [DONE] (all except rewind)
// - raw rewind passthrough (forward upstream text deltas as-is)
export async function chatStream(
  req: ChatRequest,
  onToken: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!req.messages.some((m) => m.role === "user" && m.content.trim().length > 0)) {
    throw { status: 400, code: "bad_request", message: "empty", userMessage: ERR_STRINGS.empty400 } as GatewayErrorShape;
  }
  const base = getBase();
  const provider = req.provider ?? "auto";
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { ...headers(true), Accept: "text/event-stream" },
    body: JSON.stringify({ ...req, stream: true }),
    signal,
  });
  logCall(String(provider), req.model, res.status);
  if (!res.ok || !res.body) {
    let code = "upstream_error";
    try {
      const j = (await res.json()) as { error?: { code?: string } };
      if (j.error?.code) code = j.error.code;
    } catch {
      /* body already consumed or not JSON */
    }
    throw { status: res.status, code, message: code, userMessage: mapError(res.status, code) } as GatewayErrorShape;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";

  const handleLine = (line: string): void => {
    const t = line.trim();
    if (!t.startsWith("data:")) return;
    const payload = t.slice(5).trim();
    if (payload === "[DONE]") return;
    try {
      const j = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
      };
      const c = j.choices?.[0];
      // Shape 1: OpenAI delta. Shape 2: full-content message chunk (gateway buffers then streams).
      // Rewind: raw upstream passthrough — same delta field, forwarded as-is.
      const piece = c?.delta?.content ?? c?.message?.content ?? "";
      if (piece) {
        full += piece;
        onToken(piece);
      }
    } catch {
      // Rewind raw passthrough may emit non-JSON keepalives — ignore.
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      handleLine(buf.slice(0, idx));
      buf = buf.slice(idx + 1);
    }
    if (signal?.aborted) {
      await reader.cancel().catch(() => undefined);
      throw { status: 499, code: "aborted", message: "aborted", userMessage: "" } as GatewayErrorShape;
    }
  }
  if (buf.trim().length > 0) handleLine(buf);
  return full;
}

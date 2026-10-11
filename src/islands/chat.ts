// Chat island — vanilla TS, no framework. Handles non-stream + SSE stream + abort.
// Error mapping: literal Arabic strings from types. 200-empty = retry hint (known flake).
// 429 quota_exhausted = offer provider switch, not fatal.
import { ERR_STRINGS, type GatewayErrorShape } from "../api/types";
import { chatOnce, chatStream } from "../api/client";
import { loadStoredModel } from "./models";
import { loadSettings } from "./settings";

export function initChat(): void {
  const form = document.getElementById("chat-form") as HTMLFormElement | null;
  const input = document.getElementById("chat-input") as HTMLTextAreaElement | null;
  const log = document.getElementById("chat-log") as HTMLElement | null;
  const send = document.getElementById("chat-send") as HTMLButtonElement | null;
  const stop = document.getElementById("chat-stop") as HTMLButtonElement | null;
  if (!form || !input || !log || !send) return;

  let ctrl: AbortController | null = null;

  const setBusy = (busy: boolean): void => {
    send.disabled = busy;
    send.setAttribute("aria-disabled", String(busy));
    if (stop) stop.hidden = !busy;
  };

  const bubble = (role: string, text: string): HTMLElement => {
    const div = document.createElement("div");
    div.className = role === "user" ? "msg msg-user" : "msg msg-ai";
    const p = document.createElement("p");
    p.textContent = text;
    div.appendChild(p);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  };

  const errLine = (text: string, retry: (() => void) | null): void => {
    const div = document.createElement("div");
    div.className = "msg msg-err";
    div.setAttribute("role", "alert");
    const span = document.createElement("span");
    span.textContent = text;
    div.appendChild(span);
    if (retry) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "link-retry";
      btn.textContent = "إعادة المحاولة";
      btn.addEventListener("click", retry);
      div.appendChild(btn);
    }
    log.appendChild(div);
  };

  stop?.addEventListener("click", () => ctrl?.abort());

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    const run = (): void => {
      if (!navigator.onLine) {
        errLine(ERR_STRINGS.offline, null);
        return;
      }
      if (text.length === 0) {
        errLine(ERR_STRINGS.empty400, null);
        return;
      }
      const stored = loadStoredModel();
      const settings = loadSettings();
      ctrl = new AbortController();
      setBusy(true);
      bubble("user", text);
      const aiBox = bubble("assistant", "…");
      const aiText = aiBox.querySelector("p");
      input.value = "";

      const req = {
        model: stored.model,
        provider: stored.provider,
        messages: [{ role: "user" as const, content: text }],
        temperature: settings.temperature,
        system_prompt: settings.system_prompt || undefined,
      };
      const done = (full: string): void => {
        setBusy(false);
        if (!full || full.trim().length === 0) {
          if (aiText) aiText.textContent = "";
          aiBox.remove();
          // Known upstream flake (easemate, deepseek-r1) — retry hint, never fatal.
          errLine(`${ERR_STRINGS.empty200} (إعادة المحاولة قد تنجح.)`, run);
          return;
        }
        if (aiText) aiText.textContent = full;
      };
      const fail = (e: unknown): void => {
        setBusy(false);
        aiBox.remove();
        const g = e as GatewayErrorShape & { name?: string };
        // Abort surfaces as DOMException AbortError (fetch/reader rejection),
        // not just our explicit {code:"aborted"} — both stay silent.
        if (g?.code === "aborted" || g?.name === "AbortError") return;
        errLine(g?.userMessage || ERR_STRINGS.upstream502, g?.status === 429 || g?.status === 502 ? run : null);
      };

      if (settings.stream) {
        void chatStream(req, (delta) => {
          if (aiText) aiText.textContent = (aiText.textContent === "…" ? "" : aiText.textContent ?? "") + delta;
        }, ctrl.signal).then(done, fail);
      } else {
        void chatOnce(req, ctrl.signal).then(done, fail);
      }
    };
    run();
  });
}

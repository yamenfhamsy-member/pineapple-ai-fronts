// Chat island — vanilla TS, no framework. Always streams (SSE) with abort.
// Error mapping: literal Arabic strings from types. 200-empty = retry hint (known flake).
// 429 quota_exhausted = offer provider switch, not fatal.
import { ERR_STRINGS, HISTORY_LIMIT, IDENTITY_PROMPT, type ChatMessage, type GatewayErrorShape } from "../api/types";
import { chatStream } from "../api/client";
import { loadStoredModel } from "./models";
import { loadSettings } from "./settings";

export function initChat(): void {
  const form = document.getElementById("chat-form") as HTMLFormElement | null;
  const input = document.getElementById("chat-input") as HTMLInputElement | null;
  const log = document.getElementById("chat-log") as HTMLElement | null;
  const send = document.getElementById("chat-send") as HTMLButtonElement | null;
  const stop = document.getElementById("chat-stop") as HTMLButtonElement | null;
  if (!form || !input || !log || !send) return;

  let ctrl: AbortController | null = null;
  // Session memory: user/assistant turns sent with every request (cap keeps tokens bounded).
  const history: ChatMessage[] = [];

  // Saved conversations (localStorage `pineapple:chats`, newest first, capped).
  interface SavedChat {
    id: string;
    title: string;
    messages: ChatMessage[];
    updated: number;
  }
  const CHATS_KEY = "pineapple:chats";
  const CHATS_LIMIT = 20;
  let sessionId: string | null = null;
  const historyBox = document.getElementById("chat-history") as HTMLElement | null;

  const loadChats = (): SavedChat[] => {
    try {
      const raw = localStorage.getItem(CHATS_KEY);
      const arr = raw ? (JSON.parse(raw) as SavedChat[]) : [];
      return Array.isArray(arr) ? arr.filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages)) : [];
    } catch {
      return [];
    }
  };
  const saveChats = (list: SavedChat[]): void => {
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(list.slice(0, CHATS_LIMIT)));
    } catch {
      /* storage full/blocked — ignore */
    }
  };
  const chatTitle = (msgs: ChatMessage[]): string => {
    const first = msgs.find((m) => m.role === "user");
    const t = (first?.content ?? "محادثة").trim().slice(0, 40);
    return t.length > 0 ? t : "محادثة";
  };
  const upsertCurrent = (): void => {
    if (history.length === 0) return;
    if (!sessionId) sessionId = `c${Date.now()}`;
    const rest = loadChats().filter((c) => c.id !== sessionId);
    rest.unshift({
      id: sessionId,
      title: chatTitle(history),
      messages: history.slice(-HISTORY_LIMIT),
      updated: Date.now(),
    });
    saveChats(rest);
    renderHistoryList();
  };
  const renderHistoryList = (): void => {
    if (!historyBox) return;
    historyBox.innerHTML = "";
    const list = loadChats();
    if (list.length === 0) {
      const p = document.createElement("p");
      p.className = "history-empty";
      p.textContent = "لا محادثات محفوظة بعد.";
      historyBox.appendChild(p);
      return;
    }
    for (const c of list) {
      const row = document.createElement("div");
      row.className = "history-row";
      row.setAttribute("role", "listitem");
      const open = document.createElement("button");
      open.type = "button";
      open.className = "history-open";
      open.setAttribute("aria-label", `افتح المحادثة: ${c.title}`);
      open.textContent = c.title;
      const date = document.createElement("small");
      date.textContent = new Date(c.updated).toLocaleDateString("ar");
      date.setAttribute("dir", "rtl");
      open.appendChild(date);
      open.addEventListener("click", () => {
        sessionId = c.id;
        history.length = 0;
        history.push(...c.messages.slice(-HISTORY_LIMIT));
        log.innerHTML = "";
        for (const m of history) bubble(m.role === "user" ? "user" : "assistant", m.content);
        log.scrollTop = log.scrollHeight;
        setSide(false);
      });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "history-del";
      del.setAttribute("aria-label", `احذف المحادثة: ${c.title}`);
      del.textContent = "×";
      del.addEventListener("click", () => {
        saveChats(loadChats().filter((x) => x.id !== c.id));
        if (sessionId === c.id) sessionId = null;
        renderHistoryList();
      });
      row.appendChild(open);
      row.appendChild(del);
      historyBox.appendChild(row);
    }
  };
  renderHistoryList();

  // Header pill shows the live model name; tapping it opens the sidebar.
  const pill = document.getElementById("model-pill") as HTMLButtonElement | null;
  const paintPill = (display: string): void => {
    if (pill) pill.textContent = `Pineapple AI · ${display}`;
  };
  try {
    paintPill(loadStoredModel().display);
  } catch {
    /* ignore */
  }
  document.addEventListener("pineapple:model", (ev) => {
    paintPill((ev as CustomEvent<{ display: string }>).detail.display);
  });
  pill?.addEventListener("click", () => setSide(true));

  const setBusy = (busy: boolean): void => {
    send.disabled = busy;
    send.hidden = busy;
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

  // Sidebar drawer (models + settings live here now, off the main screen).
  const sidebar = document.getElementById("sidebar") as HTMLElement | null;
  const backdrop = document.getElementById("side-backdrop") as HTMLElement | null;
  const setSide = (open: boolean): void => {
    sidebar?.classList.toggle("open", open);
    if (backdrop) backdrop.hidden = !open;
  };
  const clearLog = (): void => {
    if (log) log.innerHTML = "";
    history.length = 0;
    sessionId = null;
  };
  document.getElementById("chat-new")?.addEventListener("click", () => {
    clearLog();
    input.focus();
  });
  document.getElementById("menu-btn")?.addEventListener("click", () => setSide(true));
  document.getElementById("chat-plus")?.addEventListener("click", () => setSide(true));
  document.getElementById("side-close")?.addEventListener("click", () => setSide(false));
  backdrop?.addEventListener("click", () => setSide(false));
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") setSide(false);
  });

  // Empty-state suggestions: shown only while the log is empty; tapping one sends it.
  const empty = document.getElementById("chat-empty") as HTMLElement | null;
  const syncEmpty = (): void => {
    if (empty) empty.hidden = log.children.length > 0;
  };
  new MutationObserver(syncEmpty).observe(log, { childList: true });
  syncEmpty();
  empty?.querySelectorAll<HTMLButtonElement>("button[data-text]").forEach((btn) => {
    btn.addEventListener("click", () => {
      input.value = btn.getAttribute("data-text") ?? "";
      form.requestSubmit();
    });
  });

  // Voice input via Web Speech API (real dictation into the input).
  // Hidden where unsupported — never a dead button.
  interface SpeechRec {
    lang: string;
    interimResults: boolean;
    onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onend: (() => void) | null;
    start(): void;
  }
  const w = window as unknown as Record<string, unknown>;
  const SRCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  const mic = document.getElementById("chat-mic") as HTMLButtonElement | null;
  if (typeof SRCtor === "function" && mic) {
    const rec = new (SRCtor as new () => SpeechRec)();
    rec.lang = "ar-SA";
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const t = ev.results[0]?.[0]?.transcript ?? "";
      if (t) {
        input.value = input.value ? `${input.value} ${t}` : t;
        input.focus();
      }
    };
    mic.addEventListener("click", () => {
      try {
        rec.start();
      } catch {
        /* already started — ignore */
      }
    });
  } else {
    mic?.remove();
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    const run = (): void => {
      if (send.disabled) return;
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
        messages: [...history, { role: "user" as const, content: text }].slice(-HISTORY_LIMIT),
        temperature: settings.temperature,
        system_prompt: [IDENTITY_PROMPT, settings.system_prompt].filter((s) => s.trim().length > 0).join("\n"),
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
        history.push({ role: "user", content: text });
        history.push({ role: "assistant", content: full });
        if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);
        upsertCurrent();
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

      void chatStream(req, (delta) => {
        if (aiText) aiText.textContent = (aiText.textContent === "…" ? "" : aiText.textContent ?? "") + delta;
      }, ctrl.signal).then(done, fail);
    };
    run();
  });
}

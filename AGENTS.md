# AGENTS.md — Pineapple AI (fronts/)

Arabic RTL frontend for `free-ai-gateway`. Contract source of truth: `GATEWAY_API.md` (do not duplicate it here). System-wide rules (bot sync, registry): `/home/ymwn131/AGENTS.md`.

## Current state

- Scaffold DONE (Astro 7 + TS strict + Tailwind 4, `package.json` + `package-lock.json`, `src/`, `dist/` builds green). GitHub repo live: `yamenfhamsy-member/pineapple-ai-fronts` (`main`). Site live: `https://pineapple-ai.pages.dev` (classic Pages project `pineapple-ai`, CLI deploy `wrangler pages deploy dist --project-name=pineapple-ai --branch=main`; wrangler 4.149.0 pinned devDep).
- Multipage (user decision 2026-10-11): `/` welcome (zero-JS hero + 4 tool cards) + `/chat` (model picker + chat, always stream) + `/ocr` + `/tts` + `/settings` (temperature + system_prompt ONLY — no base/stream/key UI, no footer gateway link). Shared `src/layouts/Main.astro` (nav + head).
- Brand is Latin `Pineapple AI` (user decision 2026-10-11 — never transliterate to اناناس). Dead models hidden in UI: `DEAD_PROVIDERS=["easemate"]` in `models.ts` (200-empty ×8 on 5 models, 2026-10-11; picker shows 15 = 43−28, fallback to default if stored model vanishes). Gateway default route is still easemate — UI always sends explicit working provider.
- Chromium desktop 1280 + Playwright mobile-390 checks passed 2026-10-11 (see Sessions). Live matrix on `pages.dev` green except easemate 200-empty (known upstream flake).
- Next: watch easemate recovery → drop it from `DEAD_PROVIDERS`. Optional: connect repo in Pages dashboard for auto-deploy on push (currently manual CLI deploy).

## Stack (decided, don't re-debate)

- Astro `output: static`, no adapter. All gateway calls client-side (CORS `*` open; browser UA bypasses edge `1010`).
- Cloudflare Pages by explicit user request (official note prefers Workers Static Assets — ignored here). Build `npm ci && npm run build`, output `dist`.
- npm only (Pages lockfile). Node version pinned in `.nvmrc` at scaffold; same version in Pages settings.
- Env: `VITE_GATEWAY_BASE=https://free-ai-gateway.img-api.workers.dev` (public, also set in Pages dashboard). Only `VITE_*` reaches browser. `.env.example` documents defaults; real `.env` never committed.

## API gotchas (agent would miss these)

- Routing: explicit `provider` wins → model-id match → default easemate. `openai/gpt-4o-mini` exists in easemate AND aichat — aichat copy needs `provider:"aichat"`. Default UI model: `freeai/qwen3-8b`.
- Stream parser must accept both shapes: single full-content chunk + `stop` chunk + `[DONE]` (all except rewind), and raw rewind passthrough.
- `200` with empty content is a known upstream flake (easemate, `deepseek-r1`) — show «retry» hint, never treat as fatal.
- curl without browser UA gets edge `403 code 1010` — always send browser UA in scripts; real browsers are unaffected.
- `429 quota_exhausted` = freeai 6000 tok/day/IP exhausted — offer provider switch, not error. OCR needs ≤10 **public** URLs (`provider:darkps` + `file_urls` + `system_prompt`; private URLs 502). TTS `POST /v1/audio/speech` input ≤1000 chars, default returns WAV bytes; `format:json` returns URL.
- Display names are neutral (like the bot) — never leak upstream source names; never surface raw upstream error text (may contain sources). UI pins product identity: `IDENTITY_PROMPT` (types.ts) is prepended to every chat `system_prompt` so models answer as Pineapple AI, never Claude/ChatGPT. Log `{provider, model, status, time}` to console.
- UI reads `GET /v1/models` live (43 models, 6 providers) so new gateway models need no UI change; every new gateway provider/model MUST still be added to the bot (`/models` + routing).

## Brand (`public/`, user's own work — no attribution)

- `pineapple.jpg` (640×640, hero via `astro:assets`), `apple-touch-icon.png` (180), `favicon-32.png`, `favicon.ico` (16/32/48).
- Tokens (all AA as listed, inject as CSS vars in `src/styles/theme.css`): `--brand #EEA215` (buttons, black text on it), `--brand-light #F5C81A`, `--leaf #348937` (large text/headings only — 4.4 on white), `--ink #1C1E22`, `--muted #5A5C60`, `--cream #EFE0A8`, `--bg #FAFAFA`.

## State, RTL, gates

- `localStorage` only (no cookies/DB; no persistence in prototype). Keys: `pineapple:model` `{provider,model,display}`, `pineapple:settings` `{temperature,system_prompt}` (legacy `base`/`stream` values ignored, never wiped). No `pineapple:key` (PROXY_KEY UI removed per user 2026-10-11; gateway is open). Add new keys here first; migrate silently on version change, never wipe.
- RTL: `<html lang="ar" dir="rtl">`; logical properties only (`margin-inline-start`, `text-align:start`); `dir="ltr"` on numbers/code/links; Arabic font (IBM Plex Sans Arabic or Tajawal, `display:swap`); EN tech terms untranslated; no horizontal scroll at 320px; Tab order follows visual RTL.
- Gates: contrast pre-verified; buttons have Arabic accessible name + announced `disabled` + visible focus; `prefers-reduced-motion` disables non-essential motion; budgets LCP ≤2.5s (4G), total page JS ≤150KB gz, `astro:assets` + `lazy` except hero; hero is zero-JS (any JS needs written justification).
- Error strings (literal): 400-empty «اكتب رسالتك أولاً.» / 404 «الخدمة غير متاحة الآن — تحقق من عنوان القاعدة.» / 429 «نفدت حصتك اليومية المجانية — جرّب مزوداً آخر أو عُد غداً.» / 502-upstream «المزود لا يرد الآن — جرّب مجدداً بعد قليل.» / 502-AUTH_EXPIRED «انتهت جلسة هذا المزود — أُعيد الاتصال تلقائياً، أعد المحاولة.» / empty-200 «وصل رد فارغ من المزود — هذه مشكلة معروفة لديه.» / offline «لا يوجد اتصال بالإنترنت.» Never show `1010` to users (console only).

## Skills (when to use)

- Local `.opencode/skills/` (this dir only, never global install; excluded from git/build): `astro` every `.astro` change · `frontend-design` hero/tokens (explicit hex, responsive 320→2560, dark mode from start) · `cloudflare` Pages decisions · `wrangler` preview/deploy with installed version only · `web-perf` Lighthouse before each publish · `playwright-expert` E2E/mocking.
- Global: `prototype` hero variants `?variant=` on `prototype/pineapple-hero` (never merges — port decision only, one command, no persistence) · `tdd` SSE-parser/routing slices · `diagnosing-bugs` red-loop first · `research` docs questions · `wizard` human-only steps (Pages dashboard, secrets) · `code-review` before every push.

## Commands

- `npm ci` (first + before every build) · `npm run dev` (needs `.env`) · `npm run build` (must be green before every push) · `npm run preview` (check `dist` before Pages link) · `npx astro check` (after any `.astro` edit) · `npx playwright test` (step 6 + pre-publish).
- Never run here: `wrangler dev`, `flutter`, `pubspec` (other folders' tools).
- Chromium check (agent-browser `core,network,mobile`): HAR-start before open, JSON-only filter; desktop 1280 + mobile 390 (touch, no h-scroll, input above keyboard, targets ≥44px); HAR/screenshots to `/tmp` only, cleaned after; close step 6 with Markdown report + both screenshots.
- Live verify (local then on `pages.dev`): models=43 · echo-200 all 6 providers · stream+`[DONE]` · abort works · WAV plays · 400/404/429-as-quota paths · 390px intact · Lighthouse green.

## Hard rules

- Secrets (`TELEGRAM_BOT_TOKEN`/`TG_BOT_TOKEN`/`TG_ADMIN_ID`/`PROXY_KEY`) in env/secrets only — never code/log/chat; delete `.dev.vars` after local tests.
- Final UI uses real data only (no mocks; prototype alone may fake). Commits: short imperative English. `main` is the only prod branch.
- Target tree: `astro.config.mjs` `tsconfig.json` `src/layouts/Main.astro` `src/pages/index.astro+chat.astro+ocr.astro+tts.astro+settings.astro` `src/components/Hero.astro` `src/islands/chat.ts+models.ts+ocr.ts+tts.ts+settings.ts` `src/api/client.ts+types.ts` `src/styles/theme.css` `public/_headers`. `.gitignore`: `node_modules/ dist/ .env .opencode/skills/ *.har test-results/ playwright-report/`.

## Sessions (one line per session)

| Date | Done | Next |
|---|---|---|
| 2026-10-11 | skills (6) + brand assets + first AGENTS.md | scaffold (awaiting user approval) |
| 2026-10-11 | build green (check 0 errs, JS 3.5KB gz) + desktop Chromium check (models=43 live, echo-200 freeai, all targets ≥44px after nav/clear-key fix) + lockfile | mobile-390 check → repo (`main`) → Pages → live matrix |
| 2026-10-11 | brand→`Pineapple AI` Latin + mobile-390 Playwright pass (touch, no h-scroll, 43 live, select/checkbox 44px fix) + repo `pineapple-ai-fronts` pushed (`main`) + local matrix (5/6 echo-200, stream+`[DONE]`, WAV 352KB, 400/404, LH perf 96/LCP 0.9s; easemate 200-empty known flake) | Pages dashboard link (human) → verify on `pages.dev` |
| 2026-10-11 | Pages `pineapple-ai` live via CLI (`pages.dev` 200) + multipage (welcome cards + per-tool pages, settings=temp/sys only) + easemate hidden (200-empty ×8/5 models → picker 15) + abort AbortError fix (live-verified silent) + live 390 ×3 pass + LH perf 93 | watch easemate recovery → unhide; optional dashboard auto-deploy |
| 2026-10-11 | OCR/TTS pages deleted (user: chat-only) + chat restyled to clone layout (top-bar, brand bubbles, pill input, round +/-/send, real-actions plus-menu; bubbles CSS must stay global — islands inject nodes at runtime, scoped cid misses them) + live 390 pass | watch easemate recovery → unhide; optional dashboard auto-deploy |
| 2026-10-11 | chat shape matched to reference screenshots (flat card, visible icon menu rows, thin 2-line menu glyph, smaller 20px icons, hero logo 22→12rem) + live 390 pass | watch easemate recovery → unhide; optional dashboard auto-deploy |
| 2026-10-11 | identity pinned (`IDENTITY_PROMPT` — model claimed Claude) + session memory (last 20 user/assistant turns, busy-guard, cleared on new-chat; live-verified: recalled 42, answers as Pineapple) | watch easemate recovery → unhide; optional dashboard auto-deploy |

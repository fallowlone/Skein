// site/src/components/english/KeyEntry.tsx
import { useState, useEffect } from "preact/hooks";
import { keyStatus, setKey, unlock, clearKey, type KeyStatus } from "~/english/byok";
import { getGradingModel, setGradingModel, type GradingModel } from "~/english/state";
import { type Locale } from "~/i18n";

type Props = { lang: Locale; onChange?: () => void };

export default function KeyEntry({ lang, onChange }: Props) {
  const [status, setStatus] = useState<KeyStatus>("none");
  const [apiKey, setApiKey] = useState("");
  const [mode, setMode] = useState<"device" | "passphrase">("device");
  const [pass, setPass] = useState("");
  const [unlockPass, setUnlockPass] = useState("");
  const [model, setModel] = useState<GradingModel>("claude-haiku-4-5");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() { setStatus(await keyStatus()); setModel(getGradingModel()); }
  useEffect(() => { refresh(); }, []);

  const L = lang === "en" ? {
    title: "AI grading key (optional)",
    disclosure: "Your Anthropic API key is encrypted on this device and sent only to api.anthropic.com when you ask for grading. It is never synced or logged. Direct browser calls mean a successful XSS could in principle read the key while a call runs — the key is your own, encrypted at rest, and a strict Content-Security-Policy limits where requests can go.",
    keyPh: "sk-ant-…", save: "Save key", remove: "Remove key", device: "This device", passphrase: "Passphrase",
    passPh: "passphrase", model: "Grading model", unlock: "Unlock", locked: "Key is locked — enter your passphrase.",
    saved: "Key saved.", noKey: "No key set — output tasks fall back to self-assessment.",
  } : {
    title: "Ключ для AI-оценки (опционально)",
    disclosure: "Твой Anthropic API-ключ шифруется на этом устройстве и отправляется только на api.anthropic.com при запросе оценки. Никогда не синхронизируется и не логируется. Прямые вызовы из браузера означают, что успешный XSS теоретически может прочитать ключ во время запроса — ключ твой собственный, зашифрован, а строгий CSP ограничивает, куда уходят запросы.",
    keyPh: "sk-ant-…", save: "Сохранить", remove: "Удалить ключ", device: "Это устройство", passphrase: "Парольная фраза",
    passPh: "парольная фраза", model: "Модель оценки", unlock: "Разблокировать", locked: "Ключ заблокирован — введи парольную фразу.",
    saved: "Ключ сохранён.", noKey: "Ключ не задан — задания на письмо работают в режиме самопроверки.",
  };

  async function save() {
    setBusy(true); setErr(null);
    try {
      await setKey(apiKey.trim(), { mode, passphrase: mode === "passphrase" ? pass : undefined });
      setApiKey(""); setPass(""); await refresh(); onChange?.();
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  }
  async function doUnlock() {
    setBusy(true); setErr(null);
    const ok = await unlock(unlockPass);
    if (!ok) setErr(lang === "en" ? "Wrong passphrase." : "Неверная парольная фраза.");
    setUnlockPass(""); await refresh(); onChange?.(); setBusy(false);
  }
  async function remove() { await clearKey(); await refresh(); onChange?.(); }
  function pickModel(m: GradingModel) { setGradingModel(m); setModel(m); }

  return (
    <aside class="my-6 max-w-[620px] mx-auto bg-card border border-rule-strong rounded-[2px] p-5">
      <div class="meta mb-2">{L.title}</div>
      <p class="text-[12px] text-muted leading-relaxed mb-4">{L.disclosure}</p>

      {status === "locked" ? (
        <div class="flex flex-col gap-2 mb-4">
          <div class="text-[13px] text-ink">{L.locked}</div>
          <div class="flex gap-2">
            <input type="password" value={unlockPass} placeholder={L.passPh} onInput={(e) => setUnlockPass((e.target as HTMLInputElement).value)}
              class="flex-1 bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-sm)] px-3 py-2 text-[14px] text-ink focus:border-accent" />
            <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" disabled={busy} onClick={doUnlock}>{L.unlock}</button>
          </div>
        </div>
      ) : status === "none" ? (
        <div class="flex flex-col gap-3 mb-4">
          <input type="password" autocomplete="off" value={apiKey} placeholder={L.keyPh} onInput={(e) => setApiKey((e.target as HTMLInputElement).value)}
            class="bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-sm)] px-3 py-2 text-[14px] text-ink font-mono focus:border-accent" />
          <div class="flex gap-2">
            {(["device", "passphrase"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                class={`font-mono text-[11px] uppercase px-3 py-1.5 border rounded-[2px] cursor-pointer ${mode === m ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule"}`}>
                {m === "device" ? L.device : L.passphrase}
              </button>
            ))}
          </div>
          {mode === "passphrase" ? (
            <input type="password" value={pass} placeholder={L.passPh} onInput={(e) => setPass((e.target as HTMLInputElement).value)}
              class="bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-sm)] px-3 py-2 text-[14px] text-ink focus:border-accent" />
          ) : null}
          <button type="button" class="oa-btn oa-btn-primary oa-btn-sm self-start" disabled={busy || apiKey.trim().length === 0 || (mode === "passphrase" && pass.length === 0)} onClick={save}>{L.save}</button>
        </div>
      ) : (
        <div class="flex items-center gap-3 mb-4">
          <span class="text-[13px] text-ink">✓ {L.saved}</span>
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]" onClick={remove}>{L.remove}</button>
        </div>
      )}

      <div class="border-t border-rule pt-3">
        <div class="text-[12px] text-muted mb-2">{L.model}</div>
        <div class="flex gap-2">
          {(["claude-haiku-4-5", "claude-sonnet-4-6"] as const).map((m) => (
            <button key={m} type="button" onClick={() => pickModel(m)}
              class={`font-mono text-[11px] px-3 py-1.5 border rounded-[2px] cursor-pointer ${model === m ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule"}`}>
              {m === "claude-haiku-4-5" ? "Haiku" : "Sonnet"}
            </button>
          ))}
        </div>
      </div>
      {err ? <div class="text-[12px] text-danger mt-3">{err}</div> : null}
      {status === "none" ? <div class="text-[12px] text-muted mt-3">{L.noKey}</div> : null}
    </aside>
  );
}

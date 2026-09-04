// src/components/account/IdentitySection.tsx
// 01 · ACCOUNT — identity panel. Reuses the AccountPanel auth flow VERBATIM
// (fetchMe → undefined=loading / null=signed-out / Me=signed-in, terms gate,
// nickname edit, account delete, GitHub sign-in, activateSyncIfSignedIn). Only the
// presentation is re-skinned into the editorial id-card / value-prop layout.
// /api/me 404s locally → me===null → signed-out (NOT an error).
import { useEffect, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { fetchMe } from "~/scripts/account-sync";
import { activateSyncIfSignedIn, clearLocalProgress } from "~/scripts/user-state";

type Me = {
  login: string; nickname: string; avatarUrl: string | null;
  createdAt: number; termsAccepted: boolean; termsVersion: string;
};

const L = {
  en: {
    secNote: "Optional — local-first works without it",
    siProp1: "You're working ", siPropLocal: "locally",
    siProp2: " — everything is saved on this device. Sign in with GitHub to ",
    siPropSync: "sync across machines", siProp3: " and back up your progress. No account is required to use Skein.",
    termsPre: "By signing in you agree to the ", termsLink: "Terms of Use", termsPost: ".",
    handle: "signed in with GitHub",
    synced: "synced", localOnly: "local-only",
    localFirst: "Local-first.",
    localFirstBody: " Progress is stored on this device and works fully offline. GitHub sign-in only mirrors it across your machines — we never gate your data behind an account.",
    member: "Member since",
  },
  ru: {
    secNote: "Опционально — local-first работает и без этого",
    siProp1: "Ты работаешь ", siPropLocal: "локально",
    siProp2: " — всё сохраняется на этом устройстве. Войди через GitHub, чтобы ",
    siPropSync: "синхронизировать между устройствами", siProp3: " и сделать резервную копию прогресса. Аккаунт для работы в Skein не обязателен.",
    termsPre: "Входя, ты соглашаешься с ", termsLink: "Условиями использования", termsPost: ".",
    handle: "вход через GitHub",
    synced: "синхронизировано", localOnly: "только локально",
    localFirst: "Local-first.",
    localFirstBody: " Прогресс хранится на этом устройстве и работает полностью офлайн. Вход через GitHub лишь зеркалит его между твоими машинами — мы никогда не прячем твои данные за аккаунтом.",
    member: "С нами с",
  },
} as const;

export default function IdentitySection({ lang }: { lang: Locale }) {
  const l = L[lang];
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [nick, setNick] = useState("");
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    void fetchMe().then((m) => {
      setMe(m);
      if (m) { setNick(m.nickname); if (m.termsAccepted) void activateSyncIfSignedIn(); }
    });
  }, []);

  async function acceptTerms() {
    const r = await fetch("/api/account/terms", { method: "POST", credentials: "same-origin" });
    if (r.ok) { const m = await fetchMe(); setMe(m); if (m?.termsAccepted) void activateSyncIfSignedIn(); }
  }

  async function saveNick() {
    setMsg("");
    const r = await fetch("/api/account/nickname", {
      method: "PATCH", credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname: nick }),
    });
    setMsg(r.ok ? t("account.nicknameSaved", lang) : t("account.nicknameInvalid", lang));
  }

  async function del() {
    if (!me || confirm !== me.nickname) return;
    const r = await fetch("/api/account", { method: "DELETE", credentials: "same-origin" });
    if (r.ok) { clearLocalProgress(); location.href = `/${lang}/`; }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    location.href = `/${lang}/`;
  }

  // ── loading ──
  if (me === undefined) {
    return (
      <div class="panel identity">
        <p class="meta">{t("account.loading", lang)}</p>
      </div>
    );
  }

  // ── signed out: value prop + GitHub sign-in ──
  if (!me) {
    return (
      <div class="panel identity">
        <div class="signin">
          <p class="si-prop">
            {l.siProp1}<b>{l.siPropLocal}</b>{l.siProp2}<b>{l.siPropSync}</b>{l.siProp3}
          </p>
          <div class="signin-row">
            <a class="btn btn-gh btn-sm" href={`/api/auth/login?lang=${lang}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
              <span>{t("account.signIn", lang)}</span>
            </a>
            <span class="terms">{l.termsPre}<a href={`/${lang}/terms`} target="_blank" rel="noreferrer">{l.termsLink}</a>{l.termsPost}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── signed in: id-card + sync chip + terms gate + nickname + delete ──
  const initials = me.nickname.trim().slice(0, 2).toUpperCase() || "??";
  return (
    <div class="panel identity">
      <div class="id-card">
        {me.avatarUrl
          ? <img class="avatar avatar-img" src={me.avatarUrl} alt="" width={52} height={52} />
          : <span class="avatar" aria-hidden="true">{initials}</span>}
        <div class="id-meta">
          <span class="id-name">{me.nickname}</span>
          <span class="id-handle">@{me.login} · {l.handle}</span>
        </div>
        <div class="id-actions">
          <span class={`sync ${me.termsAccepted ? "synced" : "offline"}`}>
            <span class="sdot" />{me.termsAccepted ? l.synced : l.localOnly}
          </span>
          <button type="button" class="btn btn-quiet btn-sm" onClick={signOut}>{t("account.signOut", lang)}</button>
        </div>
      </div>

      {!me.termsAccepted ? (
        <div class="terms-gate">
          <p>{t("account.termsGate", lang)}</p>
          <a class="terms-readlink" href={`/${lang}/terms`} target="_blank" rel="noreferrer">{t("account.termsLink", lang)}</a>
          <button type="button" class="btn btn-primary btn-sm" onClick={acceptTerms}>{t("account.termsAccept", lang)}</button>
        </div>
      ) : (
        <>
          <div class="id-field">
            <label class="id-field-label" for="cab-nick">{t("account.nickname", lang)}</label>
            <div class="id-field-row">
              <input id="cab-nick" class="cab-input" value={nick} maxLength={32}
                onInput={(e) => setNick((e.target as HTMLInputElement).value)} />
              <button type="button" class="btn btn-quiet btn-sm" onClick={saveNick}>{t("account.nicknameSave", lang)}</button>
            </div>
            <p class="cab-hint">{t("account.nicknameHint", lang)}</p>
            {msg && <p class="cab-hint">{msg}</p>}
          </div>

          <p class="localfirst">
            <b>{l.localFirst}</b>{l.localFirstBody}
            {" "}<span class="cab-hint" style="display:inline">{l.member} {new Date(me.createdAt).toLocaleDateString(lang)} · {t("account.syncOn", lang)}.</span>
          </p>

          <details class="inset id-danger">
            <summary><span class="chev" aria-hidden="true">▸</span>{t("account.delete", lang)}</summary>
            <div class="inset-body">
              <p class="cab-hint">{t("account.deleteWarn", lang)}</p>
              <div class="id-field-row">
                <input class="cab-input" placeholder={t("account.deleteConfirm", lang)} value={confirm}
                  onInput={(e) => setConfirm((e.target as HTMLInputElement).value)} />
                <button type="button" class="btn btn-danger btn-sm" disabled={confirm !== me.nickname}
                  aria-disabled={confirm !== me.nickname} onClick={del}>
                  {t("account.deleteCta", lang)}
                </button>
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

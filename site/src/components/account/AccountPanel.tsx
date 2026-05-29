import { useEffect, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { fetchMe } from "~/scripts/account-sync";
import { activateSyncIfSignedIn, clearLocalProgress } from "~/scripts/user-state";

type Me = {
  login: string; nickname: string; avatarUrl: string | null;
  createdAt: number; termsAccepted: boolean; termsVersion: string;
};

export default function AccountPanel({ lang }: { lang: Locale }) {
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

  if (me === undefined) return <p class="meta">{t("account.loading", lang)}</p>;

  if (!me) {
    return (
      <a class="btn" href={`/api/auth/login?lang=${lang}`}>{t("account.signIn", lang)}</a>
    );
  }

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
    if (confirm !== me!.nickname) return;
    const r = await fetch("/api/account", { method: "DELETE", credentials: "same-origin" });
    if (r.ok) { clearLocalProgress(); location.href = `/${lang}/`; }
  }

  return (
    <div class="flex flex-col gap-8 max-w-[560px]">
      <div class="flex items-center gap-3">
        {me.avatarUrl && <img src={me.avatarUrl} alt="" width={48} height={48} class="rounded-full" />}
        <div>
          <div class="font-semibold">{me.nickname}</div>
          <div class="meta">{t("account.githubLogin", lang)}: {me.login}</div>
          <div class="meta">{t("account.created", lang)}: {new Date(me.createdAt).toLocaleDateString(lang)}</div>
        </div>
      </div>

      {!me.termsAccepted ? (
        <div class="border border-rule rounded-md p-4 flex flex-col gap-3">
          <p>{t("account.termsGate", lang)}</p>
          <a class="underline text-[13px]" href={`/${lang}/terms`} target="_blank">{t("account.termsLink", lang)}</a>
          <button class="btn" onClick={acceptTerms}>{t("account.termsAccept", lang)}</button>
        </div>
      ) : (
        <>
          <div class="flex flex-col gap-2">
            <label class="font-semibold text-[13px]">{t("account.nickname", lang)}</label>
            <div class="flex gap-2">
              <input class="border border-rule rounded px-2 py-1 flex-1" value={nick}
                onInput={(e) => setNick((e.target as HTMLInputElement).value)} maxLength={32} />
              <button class="btn" onClick={saveNick}>{t("account.nicknameSave", lang)}</button>
            </div>
            <p class="meta">{t("account.nicknameHint", lang)}</p>
            {msg && <p class="meta">{msg}</p>}
            <p class="meta">{t("account.syncOn", lang)}</p>
          </div>

          <div class="border border-[color:var(--danger,#c0392b)] rounded-md p-4 flex flex-col gap-3">
            <div class="font-semibold">{t("account.delete", lang)}</div>
            <p class="meta">{t("account.deleteWarn", lang)}</p>
            <input class="border border-rule rounded px-2 py-1" placeholder={t("account.deleteConfirm", lang)}
              value={confirm} onInput={(e) => setConfirm((e.target as HTMLInputElement).value)} />
            <button class="btn" disabled={confirm !== me.nickname}
              style="background:var(--danger,#c0392b);color:#fff;" onClick={del}>
              {t("account.deleteCta", lang)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

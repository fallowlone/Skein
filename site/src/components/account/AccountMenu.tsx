import { useEffect, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { fetchMe } from "~/scripts/account-sync";

type Me = { login: string; nickname: string; avatarUrl: string | null };

export default function AccountMenu({ lang }: { lang: Locale }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined=loading
  const [open, setOpen] = useState(false);

  useEffect(() => { void fetchMe().then((m) => setMe(m)); }, []);

  if (me === undefined) return null; // no layout shift while loading

  if (!me) {
    return (
      <a class="btn ghost shrink-0" href={`/api/auth/login?lang=${lang}`} style="padding:6px 10px;font-size:11px;">
        {t("account.signIn", lang)}
      </a>
    );
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    location.href = `/${lang}/`;
  }

  return (
    <div class="relative shrink-0">
      <button class="btn ghost flex items-center gap-1.5" style="padding:4px 8px;" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        {me.avatarUrl
          ? <img src={me.avatarUrl} alt="" width={20} height={20} class="rounded-full" />
          : <span class="w-5 h-5 rounded-full bg-rule inline-block" />}
        <span class="hidden sm:inline text-[12px] font-semibold">{me.nickname}</span>
      </button>
      {open && (
        <div class="absolute right-0 mt-1 min-w-[160px] bg-paper border border-rule rounded-md shadow-lg py-1 z-50" role="menu">
          <a class="block px-3 py-2 text-[13px] hover:bg-rule/30" href={`/${lang}/account`} role="menuitem">{t("account.menu", lang)}</a>
          <button class="block w-full text-left px-3 py-2 text-[13px] hover:bg-rule/30" onClick={signOut} role="menuitem">{t("account.signOut", lang)}</button>
        </div>
      )}
    </div>
  );
}

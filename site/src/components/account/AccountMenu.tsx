import { useEffect, useRef, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { fetchMe } from "~/scripts/account-sync";
import { activateSyncIfSignedIn } from "~/scripts/user-state";

type Me = { login: string; nickname: string; avatarUrl: string | null };

export default function AccountMenu({ lang }: { lang: Locale }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined=loading
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchMe().then((m) => {
      setMe(m);
      // Present on every Topic/Lesson page: flush learning progress to the server
      // as the user reads, not only when they open /account. No-op if not signed in.
      if (m) void activateSyncIfSignedIn();
    });
  }, []);

  // Dismiss the dropdown on outside click or Escape (a11y + expected UX).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (me === undefined) return null; // no layout shift while loading

  if (!me) {
    return (
      <a class="oa-btn oa-btn-ghost oa-btn-sm shrink-0" href={`/api/auth/login?lang=${lang}`}>
        {t("account.signIn", lang)}
      </a>
    );
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    location.href = `/${lang}/`;
  }

  return (
    <div class="relative shrink-0" ref={rootRef}>
      <button class="icon-btn" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        {me.avatarUrl
          ? <img src={me.avatarUrl} alt="" width={18} height={18} class="rounded-full" />
          : <span class="w-[18px] h-[18px] rounded-full bg-hairline-2 inline-block" />}
        <span class="hidden sm:inline text-[12px] font-medium">{me.nickname}</span>
      </button>
      {open && (
        <div class="absolute right-0 mt-1 min-w-[160px] bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-md)] shadow-soft-md py-1 z-50" role="menu">
          <a class="block px-3 py-2 text-[13px] text-ink-2 hover:bg-card-2" href={`/${lang}/profile`} role="menuitem">{lang === "ru" ? "Профиль" : "Profile"}</a>
          <a class="block px-3 py-2 text-[13px] text-ink-2 hover:bg-card-2" href={`/${lang}/account`} role="menuitem">{t("account.menu", lang)}</a>
          <button class="block w-full text-left px-3 py-2 text-[13px] text-ink-2 hover:bg-card-2" onClick={signOut} role="menuitem">{t("account.signOut", lang)}</button>
        </div>
      )}
    </div>
  );
}

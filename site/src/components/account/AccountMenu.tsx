import { Button as ShadcnButton } from "~/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { useEffect, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { fetchMe } from "~/scripts/account-sync";
import { activateSyncIfSignedIn } from "~/scripts/user-state";

type Me = { login: string; nickname: string; avatarUrl: string | null };

export default function AccountMenu({ lang }: { lang: Locale }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined=loading
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    // Statically imported (not dynamic): a dynamic import() turns account-sync
    // into a separate chunk that can only load AFTER preact mounts the island,
    // adding a serial hop to the LCP network-dependency chain. Bundled into the
    // island chunk it loads in parallel with the runtime. fetchMe still
    // short-circuits for guests via the auth-hint cookie, so no /api/me call.
    void fetchMe().then((m) => {
      setMe(m);
      // Present on every Topic/Lesson page: flush learning progress to the server
      // as the user reads, not only when they open /account. No-op if not signed in.
      if (m) void activateSyncIfSignedIn();
    });
  }, []);

  if (me === undefined) return null; // no layout shift while loading

  if (!me) {
    const returnToCoach = typeof window !== "undefined" && /^\/(en|ru)\/settings\/?$/.test(window.location.pathname);
    return (
      <a class="oa-btn oa-btn-ghost oa-btn-sm shrink-0" href={`/api/auth/login?lang=${lang}${returnToCoach ? "&returnTo=coach" : ""}`}>
        {t("account.signIn", lang)}
      </a>
    );
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    location.href = `/${lang}/`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ShadcnButton class="icon-btn">
          {me.avatarUrl && !avatarBroken
            ? <img
                src={me.avatarUrl}
                alt=""
                width={18}
                height={18}
                class="rounded-full"
                style="width:18px;height:18px;object-fit:cover"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setAvatarBroken(true)}
              />
            : <span class="w-[18px] h-[18px] rounded-full bg-hairline-2 inline-block" />}
          <span class="hidden sm:inline text-[12px] font-medium">{me.nickname}</span>
        </ShadcnButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild><a href={`/${lang}/profile`}>{lang === "ru" ? "Профиль" : "Profile"}</a></DropdownMenuItem>
        <DropdownMenuItem asChild><a href={`/${lang}/account`}>{t("account.menu", lang)}</a></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>{t("account.signOut", lang)}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Launcher for the docked code workspace. The inline textarea this used to be made
// people write real code in a 96px box with no highlighting; the editor now opens in
// CodeDrawer (right third of the viewport) while the task text stays readable on the
// left. The verdict is mirrored here so it survives closing the drawer.
import { useState } from "preact/hooks";
import { lazy, Suspense } from "preact/compat";
import type { Locale } from "~/i18n";
import type { ExecCheck, ExecResult } from "~/scripts/practice-grade";

const CodeDrawer = lazy(() => import("./CodeDrawer"));

type Props = {
  lang: Locale;
  setup?: string;
  initialCode?: string;
  check?: ExecCheck;
  // Second arg added for /assess (ItemView.tsx): see the identical note in CodeDrawer.tsx.
  onResult?: (passed: boolean, result?: ExecResult) => void;
  title?: string;
};

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

export default function JsSandbox({ lang, setup, initialCode, check, onResult, title }: Props) {
  const [code, setCode] = useState(initialCode ?? "");
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  const preview = code.trim() ? code : tt(lang, "// your code goes here", "// здесь твой код");

  return (
    <div class="js-sandbox">
      <pre class="jsb-preview" aria-hidden={open}>{preview}</pre>
      <div class="jsb-bar">
        <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={() => setOpen(true)}>
          {tt(lang, "Write code →", "Написать код →")}
        </button>
        {verdict !== null && (
          <span class={verdict ? "jsb-verdict ok" : "jsb-verdict bad"}>
            {verdict ? tt(lang, "✓ passed", "✓ пройдено") : tt(lang, "✗ not yet", "✗ пока нет")}
          </span>
        )}
      </div>

      {open && (
        <Suspense fallback={null}>
          <CodeDrawer
            lang={lang}
            title={title ?? tt(lang, "Code workspace", "Рабочая область")}
            code={code}
            onCodeChange={setCode}
            onClose={() => setOpen(false)}
            setup={setup}
            check={check}
            onResult={(ok, result) => { setVerdict(ok); onResult?.(ok, result); }}
          />
        </Suspense>
      )}
    </div>
  );
}

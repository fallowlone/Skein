import { useState } from "preact/hooks";
import Sandbox from "../Sandbox";

export type Workload = "read-heavy" | "write-heavy" | "mixed";
export type Tenancy = "single" | "multi";
export type Symptom =
  | "slow-query"
  | "lock-wait"
  | "bloat"
  | "connection-storm"
  | "hot-shard";

export type SandboxInput = {
  rows: number;
  workload: Workload;
  tenancy: Tenancy;
  symptom: Symptom;
};

export type Piece =
  | "01-relational-model"
  | "02-indexes"
  | "03-execution-plans"
  | "04-mvcc-isolation"
  | "05-pooling"
  | "06-migrations"
  | "07-sharding";

export type Lever = { piece: Piece; reason: { en: string; ru: string } };

const REASONS: Record<Piece, { en: string; ru: string }> = {
  "01-relational-model": {
    en: "Schema decisions compound — fix the model before scaling reveals it.",
    ru: "Решения по схеме копятся — чините модель до того, как масштаб её обнажит.",
  },
  "02-indexes": {
    en: "Wrong or missing index is the cheapest lever at 10K–100M rows.",
    ru: "Не тот или отсутствующий индекс — самый дешёвый рычаг на 10K–100M строк.",
  },
  "03-execution-plans": {
    en: "Index exists but planner picks seq-scan — re-ANALYZE, check row estimates.",
    ru: "Индекс есть, planner берёт seq-scan — пересоберите ANALYZE, проверьте оценки.",
  },
  "04-mvcc-isolation": {
    en: "Bloat means a long transaction is holding the xmin horizon — hunt it.",
    ru: "Bloat = длинная транзакция держит xmin-горизонт — ищите её.",
  },
  "05-pooling": {
    en: "App pods × workers > server backends — put PgBouncer in front, size with math.",
    ru: "Pod × worker > backend-ов — поставьте PgBouncer, рассчитайте пул.",
  },
  "06-migrations": {
    en: "ALTER blocks behind a long query — expand-contract and CONCURRENTLY.",
    ru: "ALTER застрял за длинным запросом — expand-contract и CONCURRENTLY.",
  },
  "07-sharding": {
    en: "One node can't hold it — pick a shard key with high cardinality and co-location.",
    ru: "Одна нода не тянет — ключ шардирования с высокой кардинальностью и ко-локацией.",
  },
};

const lever = (piece: Piece): Lever => ({ piece, reason: REASONS[piece] });

export function rankLevers(input: SandboxInput): Lever[] {
  const { rows, workload, tenancy, symptom } = input;

  // Symptom-first decision tree.
  if (symptom === "hot-shard" && tenancy === "multi" && rows >= 100_000_000) {
    return [lever("07-sharding"), lever("01-relational-model"), lever("03-execution-plans")];
  }
  if (symptom === "hot-shard") {
    return [lever("07-sharding"), lever("01-relational-model"), lever("03-execution-plans")];
  }
  if (symptom === "connection-storm") {
    return [lever("05-pooling"), lever("04-mvcc-isolation"), lever("03-execution-plans")];
  }
  if (symptom === "bloat") {
    return [lever("04-mvcc-isolation"), lever("06-migrations"), lever("02-indexes")];
  }
  if (symptom === "lock-wait") {
    return [lever("06-migrations"), lever("04-mvcc-isolation"), lever("05-pooling")];
  }
  if (symptom === "slow-query") {
    if (rows < 100_000) {
      return [lever("01-relational-model"), lever("02-indexes"), lever("03-execution-plans")];
    }
    if (rows >= 1_000_000_000 || (tenancy === "multi" && rows >= 100_000_000)) {
      return [lever("07-sharding"), lever("02-indexes"), lever("03-execution-plans")];
    }
    if (workload === "read-heavy") {
      return [lever("02-indexes"), lever("03-execution-plans"), lever("04-mvcc-isolation")];
    }
    return [lever("02-indexes"), lever("03-execution-plans"), lever("05-pooling")];
  }

  // Default ranking.
  return [lever("01-relational-model"), lever("02-indexes"), lever("03-execution-plans")];
}

type Props = { lang: "en" | "ru" };

export default function DBLeverSandbox({ lang }: Props) {
  const [rowsLog, setRowsLog] = useState(6); // log10(1M)
  const [workload, setWorkload] = useState<Workload>("mixed");
  const [tenancy, setTenancy] = useState<Tenancy>("single");
  const [symptom, setSymptom] = useState<Symptom>("slow-query");

  const rows = Math.pow(10, rowsLog);
  const ranked = rankLevers({ rows, workload, tenancy, symptom });

  const t = (en: string, ru: string) => (lang === "en" ? en : ru);

  return (
    <Sandbox
      id="db-lever-sandbox"
      title={t("First lever heuristic", "Эвристика первого рычага")}
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <label class="block">
            <span class="text-sm font-medium">
              {t("Row count", "Размер таблицы")}: 10^{rowsLog} ≈ {Math.pow(10, rowsLog).toLocaleString()}
            </span>
            <input
              type="range"
              min={3}
              max={9}
              step={1}
              value={rowsLog}
              onInput={(e) => setRowsLog(parseInt((e.target as HTMLInputElement).value, 10))}
              class="w-full"
            />
          </label>

          <fieldset class="space-y-1">
            <legend class="text-sm font-medium">{t("Workload", "Нагрузка")}</legend>
            {(["read-heavy", "write-heavy", "mixed"] as Workload[]).map((w) => (
              <label class="block text-sm">
                <input
                  type="radio"
                  name="workload"
                  value={w}
                  checked={workload === w}
                  onChange={() => setWorkload(w)}
                />{" "}
                {w}
              </label>
            ))}
          </fieldset>

          <fieldset class="space-y-1">
            <legend class="text-sm font-medium">{t("Tenancy", "Tenancy")}</legend>
            {(["single", "multi"] as Tenancy[]).map((tt) => (
              <label class="block text-sm">
                <input
                  type="radio"
                  name="tenancy"
                  value={tt}
                  checked={tenancy === tt}
                  onChange={() => setTenancy(tt)}
                />{" "}
                {tt}
              </label>
            ))}
          </fieldset>

          <fieldset class="space-y-1">
            <legend class="text-sm font-medium">{t("Dominant symptom", "Главный симптом")}</legend>
            {(
              ["slow-query", "lock-wait", "bloat", "connection-storm", "hot-shard"] as Symptom[]
            ).map((s) => (
              <label class="block text-sm">
                <input
                  type="radio"
                  name="symptom"
                  value={s}
                  checked={symptom === s}
                  onChange={() => setSymptom(s)}
                />{" "}
                {s}
              </label>
            ))}
          </fieldset>
        </div>

        <ol class="space-y-3">
          {ranked.map((l, i) => (
            <li class="border-hairline-2 rounded-[var(--r-sm)] p-3">
              <div class="text-xs uppercase tracking-wide text-muted">
                #{i + 1} → piece {l.piece}
              </div>
              <div class="text-sm mt-1">{lang === "en" ? l.reason.en : l.reason.ru}</div>
            </li>
          ))}
        </ol>
      </div>
    </Sandbox>
  );
}

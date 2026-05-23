export type ExecCheckKind = "stdout-equals" | "stdout-contains" | "rows-equal" | "no-error";
export type ExecCheck = { kind: ExecCheckKind; value?: string };
export type ExecResult = { rows?: unknown[]; stdout?: string; error?: string };

export function checkBlank(accept: string[], actual: string): boolean {
  const a = actual.trim().toLowerCase();
  return accept.some((x) => x.trim().toLowerCase() === a);
}

export function applyExecCheck(check: ExecCheck, result: ExecResult): boolean {
  if (result.error) return false;
  switch (check.kind) {
    case "no-error":
      return true;
    case "stdout-equals":
      return (result.stdout ?? "").trim() === (check.value ?? "").trim();
    case "stdout-contains":
      return (result.stdout ?? "").includes(check.value ?? "");
    case "rows-equal":
      return JSON.stringify(result.rows ?? []) === (check.value ?? "");
    default:
      return false;
  }
}

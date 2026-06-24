// Reference solution for the type-safe-sdk workbench.

// --- ValidationError ---
export class ValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(issues.join("; "));
    this.name = "ValidationError";
    this.issues = issues;
  }
}

// --- Schema ---
export type Schema<T> = (data: unknown) => { ok: true; value: T } | { ok: false; issues: string[] };

// --- parse ---
export function parse<T>(schema: Schema<T>, data: unknown): T {
  const result = schema(data);
  if (result.ok) return result.value;
  throw new ValidationError(result.issues);
}

// --- backoffDelays ---
export type Policy = { max: number; baseMs: number };

export function backoffDelays(policy: Policy): number[] {
  const delays: number[] = [];
  for (let i = 0; i < policy.max; i++) {
    delays.push(policy.baseMs * Math.pow(2, i));
  }
  return delays;
}

// --- withRetry ---
export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: Policy,
  sleep: (ms: number) => Promise<void>,
): Promise<T> {
  const delays = backoffDelays(policy);
  let lastError: unknown;
  for (let attempt = 0; attempt <= policy.max; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < policy.max) {
        await sleep(delays[attempt]);
      }
    }
  }
  throw lastError;
}

// --- HttpError ---
export class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

// --- Fetched / ClientOpts / defineClient ---
export type Fetched = { status: number; body: unknown };
export type ClientOpts = {
  baseUrl: string;
  fetchImpl: (url: string) => Promise<Fetched>;
};

export function defineClient(opts: ClientOpts): {
  get<T>(path: string, schema: Schema<T>): Promise<T>;
} {
  return {
    async get<T>(path: string, schema: Schema<T>): Promise<T> {
      const { status, body } = await opts.fetchImpl(opts.baseUrl + path);
      if (status >= 400) throw new HttpError(status, body);
      return parse(schema, body);
    },
  };
}

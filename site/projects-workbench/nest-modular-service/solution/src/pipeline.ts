export type Ctx = { path: string; user?: { id: string; roles: string[] }; body?: unknown; log: string[] };

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export type Guard = { name: string; canActivate: (ctx: Ctx) => boolean };
export type Pipe = { name: string; transform: (body: unknown) => unknown };
export type Interceptor = { name: string; wrap: (ctx: Ctx, next: () => unknown) => unknown };
export type Handler = (ctx: Ctx) => unknown;

/**
 * Request pipeline in Nest's actual order: interceptors (before) → guards → pipes →
 * handler → interceptors (after).
 *
 * The order is the lesson, and getting it wrong is a real security bug rather than a
 * style question:
 *
 *  - Guards run BEFORE pipes, so an unauthenticated caller never reaches validation.
 *    Flip them and you are parsing and validating attacker-supplied bodies — paying
 *    CPU for traffic you are about to reject, and widening the surface to whatever
 *    lives in your validator.
 *  - Interceptors straddle the handler on both sides, which is why a logging
 *    interceptor sees the response of a guard rejection only if it sits outside the
 *    guard.
 *  - Guards run in declaration order and short-circuit, so the cheapest/most
 *    fundamental check (is there a session at all) goes first.
 */
export function runPipeline(
  ctx: Ctx,
  handler: Handler,
  { guards = [], pipes = [], interceptors = [] }: { guards?: Guard[]; pipes?: Pipe[]; interceptors?: Interceptor[] },
): unknown {
  const invoke = (): unknown => {
    for (const guard of guards) {
      ctx.log.push(`guard:${guard.name}`);
      if (!guard.canActivate(ctx)) throw new HttpError(403, `blocked by ${guard.name}`);
    }
    for (const pipe of pipes) {
      ctx.log.push(`pipe:${pipe.name}`);
      ctx.body = pipe.transform(ctx.body);
    }
    ctx.log.push("handler");
    return handler(ctx);
  };

  // Compose outside-in: the first interceptor in the list is the outermost layer.
  let chain = invoke;
  for (const interceptor of [...interceptors].reverse()) {
    const inner = chain;
    chain = () => {
      ctx.log.push(`interceptor:${interceptor.name}:before`);
      const result = interceptor.wrap(ctx, inner);
      ctx.log.push(`interceptor:${interceptor.name}:after`);
      return result;
    };
  }
  return chain();
}

/** Roles guard: authorization, distinct from "is there a user at all". */
export const rolesGuard = (required: string[]): Guard => ({
  name: "roles",
  canActivate: (ctx) => required.every((r) => ctx.user?.roles.includes(r) ?? false),
});

export const authGuard: Guard = { name: "auth", canActivate: (ctx) => ctx.user !== undefined };

export type Scope = "singleton" | "request" | "transient";

/**
 * Provider container with Nest's three scopes.
 *
 * The trap: a REQUEST-scoped provider injected into a SINGLETON is resolved once and
 * then frozen — the singleton keeps the first request's instance forever, so request
 * state leaks between users. Nest handles this by bubbling the scope up; a container
 * that silently allows it is how a tenant id ends up shared.
 */
export class Container {
  private definitions = new Map<string, { scope: Scope; factory: () => unknown; deps: string[] }>();
  private singletons = new Map<string, unknown>();

  register(token: string, scope: Scope, factory: () => unknown, deps: string[] = []): void {
    this.definitions.set(token, { scope, factory, deps });
  }

  /** Effective scope after bubbling: depending on a narrower scope widens yours. */
  effectiveScope(token: string, seen = new Set<string>()): Scope {
    const def = this.definitions.get(token);
    if (!def) throw new Error(`unknown provider ${token}`);
    if (seen.has(token)) throw new Error(`circular dependency at ${token}`);
    seen.add(token);
    let scope = def.scope;
    for (const dep of def.deps) {
      const depScope = this.effectiveScope(dep, new Set(seen));
      if (depScope === "request") scope = "request";
      else if (depScope === "transient" && scope === "singleton") scope = "transient";
    }
    return scope;
  }

  resolve(token: string, requestId?: string, cache = new Map<string, unknown>()): unknown {
    const def = this.definitions.get(token);
    if (!def) throw new Error(`unknown provider ${token}`);
    const scope = this.effectiveScope(token);

    if (scope === "request" && requestId === undefined) {
      throw new Error(`${token} is request-scoped (directly or through a dependency) and needs a request context`);
    }
    if (scope === "singleton") {
      if (!this.singletons.has(token)) this.singletons.set(token, def.factory());
      return this.singletons.get(token);
    }
    if (scope === "request") {
      const key = `${requestId}:${token}`;
      if (!cache.has(key)) cache.set(key, def.factory());
      return cache.get(key);
    }
    return def.factory(); // transient: a fresh instance every time
  }
}

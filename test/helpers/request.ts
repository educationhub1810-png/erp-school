// Helpers for invoking App Router route handlers directly (no HTTP server).
// A handler is just `(req: Request, ctx?) => Promise<Response>`, so we build a
// Request, call it, and parse the JSON envelope ({ success, data | error }).

const BASE = "http://localhost:3000";

interface BuildOpts {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string>;
  headers?: Record<string, string>;
}

export function buildRequest(pathOrUrl: string, opts: BuildOpts = {}): Request {
  const url = new URL(pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}${pathOrUrl}`);
  for (const [k, v] of Object.entries(opts.searchParams ?? {})) url.searchParams.set(k, v);

  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.headers ?? {}) },
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  return new Request(url, init);
}

export interface ParsedResponse<T = unknown> {
  status: number;
  body: { success: boolean; data?: T; error?: string };
}

export async function callRoute<T = unknown>(
  handler: (req: Request, ctx?: unknown) => Promise<Response> | Response,
  req: Request,
  ctx?: unknown,
): Promise<ParsedResponse<T>> {
  const res = await handler(req, ctx);
  let body: ParsedResponse<T>["body"];
  try {
    body = await res.json();
  } catch {
    body = { success: false, error: "<non-json response>" };
  }
  return { status: res.status, body };
}

/** Build the `{ params }` context Next passes to dynamic `[id]` route handlers. */
export function paramsCtx(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

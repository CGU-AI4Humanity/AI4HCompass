import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (origin !== new URL(request.url).origin) throw new ApiError(403, "Request origin was not accepted.");
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) {
    return Response.json({ error: "Please review the highlighted information.", details: error.flatten() }, { status: 400 });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

import { run } from "@/db";
import { issueScope } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { apiErrorResponse, assertSameOrigin, json } from "@/lib/http";
import { z } from "zod";

type Context = { params: Promise<{ issueId: string }> };
const schema = z.object({
  description: z.string().trim().min(2).max(1200),
  owner: z.string().trim().max(160).default(""),
  deadline: z.string().date().nullable().default(null),
});

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { issueId } = await context.params;
    await issueScope(user.id, issueId, "assessor");
    const input = schema.parse(await request.json());
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await run(
      "INSERT INTO mitigations (id, issue_id, description, owner, deadline, completed, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)",
      id,
      issueId,
      input.description,
      input.owner,
      input.deadline,
      user.id,
      user.id,
      now,
      now,
    );
    return json({ mitigationId: id }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

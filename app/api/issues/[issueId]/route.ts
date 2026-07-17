import { first, run } from "@/db";
import { issueScope } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { statusFromScore } from "@/lib/decision";
import { ApiError, apiErrorResponse, assertSameOrigin, json } from "@/lib/http";
import { recomputeProject } from "@/lib/model";
import { z } from "zod";

type Context = { params: Promise<{ issueId: string }> };
const schema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(2400).optional(),
  score: z.number().int().min(0).max(100).optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { issueId } = await context.params;
    const scope = await issueScope(user.id, issueId, "assessor");
    const input = schema.parse(await request.json());
    const current = await first<{ title: string; description: string; score: number }>("SELECT title, description, score FROM issues WHERE id = ?", issueId);
    if (!current) throw new ApiError(404, "Assessment item not found.");
    const score = input.score ?? current.score;
    await run(
      "UPDATE issues SET title = ?, description = ?, score = ?, status = ?, updated_by = ?, updated_at = ? WHERE id = ?",
      input.title ?? current.title,
      input.description ?? current.description,
      score,
      statusFromScore(score),
      user.id,
      new Date().toISOString(),
      issueId,
    );
    await recomputeProject(scope.project_id, user.id);
    return json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { issueId } = await context.params;
    const scope = await issueScope(user.id, issueId, "assessor");
    await run("DELETE FROM issues WHERE id = ?", issueId);
    await recomputeProject(scope.project_id, user.id);
    return json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

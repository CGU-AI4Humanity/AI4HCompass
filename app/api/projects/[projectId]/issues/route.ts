import { first, run } from "@/db";
import { projectScope } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { statusFromScore } from "@/lib/decision";
import { ApiError, apiErrorResponse, assertSameOrigin, json } from "@/lib/http";
import { recomputeProject } from "@/lib/model";
import { z } from "zod";

type Context = { params: Promise<{ projectId: string }> };
const schema = z.object({
  dimensionId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2400).default(""),
  score: z.number().int().min(0).max(100),
});

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { projectId } = await context.params;
    await projectScope(user.id, projectId, "assessor");
    const input = schema.parse(await request.json());
    if (!await first("SELECT id FROM dimensions WHERE id = ? AND project_id = ?", input.dimensionId, projectId)) throw new ApiError(404, "Compass dimension not found.");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await run(
      "INSERT INTO issues (id, dimension_id, title, description, score, status, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id,
      input.dimensionId,
      input.title,
      input.description,
      input.score,
      statusFromScore(input.score),
      user.id,
      user.id,
      now,
      now,
    );
    await recomputeProject(projectId, user.id);
    return json({ issueId: id }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

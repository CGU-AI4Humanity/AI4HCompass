import { first, run } from "@/db";
import { mitigationScope } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { ApiError, apiErrorResponse, assertSameOrigin, json } from "@/lib/http";
import { z } from "zod";

type Context = { params: Promise<{ mitigationId: string }> };
const schema = z.object({
  description: z.string().trim().min(2).max(1200).optional(),
  owner: z.string().trim().max(160).optional(),
  deadline: z.string().date().nullable().optional(),
  completed: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0);

interface MitigationRow {
  description: string;
  owner: string;
  deadline: string | null;
  completed: number;
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { mitigationId } = await context.params;
    await mitigationScope(user.id, mitigationId, "assessor");
    const input = schema.parse(await request.json());
    const current = await first<MitigationRow>("SELECT description, owner, deadline, completed FROM mitigations WHERE id = ?", mitigationId);
    if (!current) throw new ApiError(404, "Mitigation not found.");
    await run(
      "UPDATE mitigations SET description = ?, owner = ?, deadline = ?, completed = ?, updated_by = ?, updated_at = ? WHERE id = ?",
      input.description ?? current.description,
      input.owner ?? current.owner,
      input.deadline !== undefined ? input.deadline : current.deadline,
      input.completed !== undefined ? Number(input.completed) : current.completed,
      user.id,
      new Date().toISOString(),
      mitigationId,
    );
    return json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { mitigationId } = await context.params;
    await mitigationScope(user.id, mitigationId, "assessor");
    await run("DELETE FROM mitigations WHERE id = ?", mitigationId);
    return json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

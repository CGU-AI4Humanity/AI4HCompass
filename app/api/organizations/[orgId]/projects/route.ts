import { all, batch } from "@/db";
import { requireOrgRole } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { apiErrorResponse, assertSameOrigin, json } from "@/lib/http";
import { COMPASS_ATTRIBUTES } from "@/shared/types";
import type { ProjectSummary } from "@/shared/types";
import { z } from "zod";

type Context = { params: Promise<{ orgId: string }> };
const projectSchema = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1200).default(""),
  goalStatement: z.string().trim().max(1200).default(""),
});

interface ProjectRow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  goal_statement: string;
  decision: ProjectSummary["decision"];
  updated_at: string;
  updated_by_email: string;
  completed_dimensions: number;
}

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const { orgId } = await context.params;
    await requireOrgRole(user.id, orgId, "viewer");
    const rows = await all<ProjectRow>(
      `SELECT p.id, p.org_id, p.name, p.description, p.goal_statement, p.decision, p.updated_at, u.email AS updated_by_email, (SELECT COUNT(*) FROM dimensions d WHERE d.project_id = p.id AND d.status != 'pending') AS completed_dimensions FROM projects p JOIN users u ON u.id = p.updated_by WHERE p.org_id = ? ORDER BY p.updated_at DESC`,
      orgId,
    );
    const projects: ProjectSummary[] = rows.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      name: row.name,
      description: row.description,
      goalStatement: row.goal_statement,
      decision: row.decision,
      updatedAt: row.updated_at,
      updatedByEmail: row.updated_by_email,
      completedDimensions: row.completed_dimensions,
    }));
    return json({ projects });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { orgId } = await context.params;
    await requireOrgRole(user.id, orgId, "assessor");
    const input = projectSchema.parse(await request.json());
    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();
    await batch([
      {
        sql: "INSERT INTO projects (id, org_id, name, description, goal_statement, decision, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)",
        values: [projectId, orgId, input.name, input.description, input.goalStatement, user.id, user.id, now, now],
      },
      ...COMPASS_ATTRIBUTES.map((attribute, position) => ({
        sql: "INSERT INTO dimensions (id, project_id, code, name, description, prompt, position, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')",
        values: [crypto.randomUUID(), projectId, attribute.code, attribute.name, attribute.description, attribute.prompt, position],
      })),
    ]);
    return json({ projectId }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

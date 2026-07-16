import { all, first, run } from "@/db";
import { projectScope } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { ApiError, apiErrorResponse, assertSameOrigin, json } from "@/lib/http";
import type { AttributeStatus, CompassCode, DimensionRecord, IssueRecord, MitigationRecord, OrganizationRole, ProjectDecision, ProjectDetail } from "@/shared/types";
import { z } from "zod";

type Context = { params: Promise<{ projectId: string }> };
const updateSchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(1200).optional(),
  goalStatement: z.string().trim().max(1200).optional(),
}).refine((value) => Object.keys(value).length > 0);

interface ProjectRow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  goal_statement: string;
  decision: ProjectDecision;
  updated_at: string;
  updated_by_email: string;
  completed_dimensions: number;
}

interface DimensionRow {
  id: string;
  project_id: string;
  code: CompassCode;
  name: string;
  description: string;
  prompt: string;
  position: number;
  status: AttributeStatus;
}

interface IssueRow {
  id: string;
  dimension_id: string;
  title: string;
  description: string;
  score: number;
  status: Exclude<AttributeStatus, "pending">;
  updated_at: string;
}

interface MitigationRow {
  id: string;
  issue_id: string;
  description: string;
  owner: string;
  deadline: string | null;
  completed: number;
  updated_at: string;
}

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const { projectId } = await context.params;
    const scope = await projectScope(user.id, projectId, "viewer");
    const project = await first<ProjectRow>(
      `SELECT p.id, p.org_id, p.name, p.description, p.goal_statement, p.decision, p.updated_at, u.email AS updated_by_email, (SELECT COUNT(*) FROM dimensions d WHERE d.project_id = p.id AND d.status != 'pending') AS completed_dimensions FROM projects p JOIN users u ON u.id = p.updated_by WHERE p.id = ?`,
      projectId,
    );
    if (!project) throw new ApiError(404, "Project not found.");
    const dimensions = await all<DimensionRow>("SELECT * FROM dimensions WHERE project_id = ? ORDER BY position", projectId);
    const issueRows = await all<IssueRow>(
      "SELECT i.* FROM issues i JOIN dimensions d ON d.id = i.dimension_id WHERE d.project_id = ? ORDER BY i.created_at",
      projectId,
    );
    const mitigationRows = await all<MitigationRow>(
      `SELECT mt.* FROM mitigations mt JOIN issues i ON i.id = mt.issue_id JOIN dimensions d ON d.id = i.dimension_id WHERE d.project_id = ? ORDER BY mt.created_at`,
      projectId,
    );
    const mitigationsByIssue = new Map<string, MitigationRecord[]>();
    for (const row of mitigationRows) {
      const item: MitigationRecord = { id: row.id, issueId: row.issue_id, description: row.description, owner: row.owner, deadline: row.deadline, completed: Boolean(row.completed), updatedAt: row.updated_at };
      mitigationsByIssue.set(row.issue_id, [...(mitigationsByIssue.get(row.issue_id) ?? []), item]);
    }
    const issuesByDimension = new Map<string, IssueRecord[]>();
    for (const row of issueRows) {
      const item: IssueRecord = { id: row.id, dimensionId: row.dimension_id, title: row.title, description: row.description, score: row.score, status: row.status, updatedAt: row.updated_at, mitigations: mitigationsByIssue.get(row.id) ?? [] };
      issuesByDimension.set(row.dimension_id, [...(issuesByDimension.get(row.dimension_id) ?? []), item]);
    }
    const dimensionRecords: DimensionRecord[] = dimensions.map((row) => ({
      id: row.id, projectId: row.project_id, code: row.code, name: row.name, description: row.description, prompt: row.prompt, position: row.position, status: row.status, issues: issuesByDimension.get(row.id) ?? [],
    }));
    const detail: ProjectDetail = {
      id: project.id,
      orgId: project.org_id,
      name: project.name,
      description: project.description,
      goalStatement: project.goal_statement,
      decision: project.decision,
      updatedAt: project.updated_at,
      updatedByEmail: project.updated_by_email,
      completedDimensions: project.completed_dimensions,
      role: scope.role as OrganizationRole,
      dimensions: dimensionRecords,
    };
    return json({ project: detail });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { projectId } = await context.params;
    await projectScope(user.id, projectId, "assessor");
    const input = updateSchema.parse(await request.json());
    const current = await first<{ name: string; description: string; goal_statement: string }>("SELECT name, description, goal_statement FROM projects WHERE id = ?", projectId);
    if (!current) throw new ApiError(404, "Project not found.");
    await run(
      "UPDATE projects SET name = ?, description = ?, goal_statement = ?, updated_by = ?, updated_at = ? WHERE id = ?",
      input.name ?? current.name,
      input.description ?? current.description,
      input.goalStatement ?? current.goal_statement,
      user.id,
      new Date().toISOString(),
      projectId,
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
    const { projectId } = await context.params;
    await projectScope(user.id, projectId, "admin");
    await run("DELETE FROM projects WHERE id = ?", projectId);
    return json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { first } from "@/db";
import { roleAllows } from "@/lib/decision";
import { ApiError } from "@/lib/http";
import type { OrganizationRole } from "@/shared/types";

export async function requireOrgRole(userId: string, orgId: string, minimum: OrganizationRole = "viewer"): Promise<OrganizationRole> {
  const membership = await first<{ role: OrganizationRole }>(
    "SELECT role FROM memberships WHERE org_id = ? AND user_id = ?",
    orgId,
    userId,
  );
  if (!membership) throw new ApiError(404, "Organization not found.");
  if (!roleAllows(membership.role, minimum)) throw new ApiError(403, "Your role does not allow this action.");
  return membership.role;
}

export async function projectScope(userId: string, projectId: string, minimum: OrganizationRole = "viewer") {
  const scope = await first<{ org_id: string; role: OrganizationRole }>(
    "SELECT p.org_id, m.role FROM projects p JOIN memberships m ON m.org_id = p.org_id AND m.user_id = ? WHERE p.id = ?",
    userId,
    projectId,
  );
  if (!scope) throw new ApiError(404, "Project not found.");
  if (!roleAllows(scope.role, minimum)) throw new ApiError(403, "Your role does not allow this action.");
  return scope;
}

export async function issueScope(userId: string, issueId: string, minimum: OrganizationRole = "viewer") {
  const scope = await first<{ project_id: string; org_id: string; role: OrganizationRole }>(
    `SELECT d.project_id, p.org_id, m.role FROM issues i JOIN dimensions d ON d.id = i.dimension_id JOIN projects p ON p.id = d.project_id JOIN memberships m ON m.org_id = p.org_id AND m.user_id = ? WHERE i.id = ?`,
    userId,
    issueId,
  );
  if (!scope) throw new ApiError(404, "Assessment item not found.");
  if (!roleAllows(scope.role, minimum)) throw new ApiError(403, "Your role does not allow this action.");
  return scope;
}

export async function mitigationScope(userId: string, mitigationId: string, minimum: OrganizationRole = "viewer") {
  const scope = await first<{ project_id: string; org_id: string; role: OrganizationRole }>(
    `SELECT d.project_id, p.org_id, m.role FROM mitigations mt JOIN issues i ON i.id = mt.issue_id JOIN dimensions d ON d.id = i.dimension_id JOIN projects p ON p.id = d.project_id JOIN memberships m ON m.org_id = p.org_id AND m.user_id = ? WHERE mt.id = ?`,
    userId,
    mitigationId,
  );
  if (!scope) throw new ApiError(404, "Mitigation not found.");
  if (!roleAllows(scope.role, minimum)) throw new ApiError(403, "Your role does not allow this action.");
  return scope;
}

import { all, run } from "@/db";
import { dimensionStatus, projectDecision } from "@/lib/decision";
import type { AttributeStatus } from "@/shared/types";

export async function recomputeProject(projectId: string, updatedBy?: string): Promise<void> {
  const rows = await all<{ dimension_id: string; issue_status: AttributeStatus | null }>(
    "SELECT d.id AS dimension_id, i.status AS issue_status FROM dimensions d LEFT JOIN issues i ON i.dimension_id = d.id WHERE d.project_id = ? ORDER BY d.position",
    projectId,
  );
  const grouped = new Map<string, AttributeStatus[]>();
  for (const row of rows) {
    if (!grouped.has(row.dimension_id)) grouped.set(row.dimension_id, []);
    if (row.issue_status) grouped.get(row.dimension_id)!.push(row.issue_status);
  }
  const statuses: AttributeStatus[] = [];
  for (const [dimensionId, issueStatuses] of grouped) {
    const status = dimensionStatus(issueStatuses);
    statuses.push(status);
    await run("UPDATE dimensions SET status = ? WHERE id = ?", status, dimensionId);
  }
  const decision = projectDecision(statuses);
  if (updatedBy) {
    await run("UPDATE projects SET decision = ?, updated_by = ?, updated_at = ? WHERE id = ?", decision, updatedBy, new Date().toISOString(), projectId);
  } else {
    await run("UPDATE projects SET decision = ?, updated_at = ? WHERE id = ?", decision, new Date().toISOString(), projectId);
  }
}

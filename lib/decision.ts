import type { AttributeStatus, OrganizationRole, ProjectDecision } from "@/shared/types";

export function statusFromScore(score: number): Exclude<AttributeStatus, "pending"> {
  if (score < 40) return "red";
  if (score < 70) return "yellow";
  return "green";
}

export function dimensionStatus(issueStatuses: AttributeStatus[]): AttributeStatus {
  if (issueStatuses.length === 0 || issueStatuses.some((status) => status === "pending")) return "pending";
  if (issueStatuses.includes("red")) return "red";
  if (issueStatuses.includes("yellow")) return "yellow";
  return "green";
}

export function projectDecision(statuses: AttributeStatus[]): ProjectDecision {
  if (statuses.length === 0 || statuses.some((status) => status === "pending")) return "pending";
  if (statuses.includes("red")) return "pause";
  if (statuses.includes("yellow")) return "fix";
  return "go";
}

const roleRank: Record<OrganizationRole, number> = { viewer: 0, assessor: 1, admin: 2 };

export function roleAllows(actual: OrganizationRole, minimum: OrganizationRole): boolean {
  return roleRank[actual] >= roleRank[minimum];
}

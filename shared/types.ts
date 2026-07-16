export type AttributeStatus = "green" | "yellow" | "red" | "pending";
export type ProjectDecision = "go" | "fix" | "pause" | "pending";
export type OrganizationRole = "admin" | "assessor" | "viewer";
export type CompassCode = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface UserSummary {
  id: string;
  email: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
}

export interface ProjectSummary {
  id: string;
  orgId: string;
  name: string;
  description: string;
  goalStatement: string;
  decision: ProjectDecision;
  updatedAt: string;
  updatedByEmail?: string;
  completedDimensions: number;
}

export interface MitigationRecord {
  id: string;
  issueId: string;
  description: string;
  owner: string;
  deadline: string | null;
  completed: boolean;
  updatedAt: string;
}

export interface IssueRecord {
  id: string;
  dimensionId: string;
  title: string;
  description: string;
  score: number;
  status: Exclude<AttributeStatus, "pending">;
  updatedAt: string;
  mitigations: MitigationRecord[];
}

export interface DimensionRecord {
  id: string;
  projectId: string;
  code: CompassCode;
  name: string;
  description: string;
  prompt: string;
  position: number;
  status: AttributeStatus;
  issues: IssueRecord[];
}

export interface ProjectDetail extends ProjectSummary {
  role: OrganizationRole;
  dimensions: DimensionRecord[];
}

export const COMPASS_ATTRIBUTES = [
  { code: "N", name: "Purpose", description: "The human need this project serves—not only the business case.", prompt: "What meaningful human need does this AI address, and why is AI appropriate?" },
  { code: "NE", name: "People", description: "Who benefits, who may be harmed, and who deserves a voice.", prompt: "Who experiences the benefits and risks, including people not represented in the room?" },
  { code: "E", name: "Values", description: "The principles the team refuses to trade away.", prompt: "Which values must the system protect, and how are they expressed in design decisions?" },
  { code: "SE", name: "Risks", description: "Failure modes, unintended consequences, and safeguards.", prompt: "What could go wrong, how severe would it be, and what prevents or detects it?" },
  { code: "S", name: "Human-in-the-Loop", description: "Where people retain meaningful authority and control.", prompt: "Where can a qualified person review, override, appeal, or stop an AI-supported decision?" },
  { code: "SW", name: "Data & Privacy", description: "Consent, access, retention, provenance, and data boundaries.", prompt: "What data is used, under what consent, for how long, and with access by whom?" },
  { code: "W", name: "Outcomes", description: "The positive impact promised to people and society.", prompt: "Which human outcomes should improve, and what evidence will demonstrate that improvement?" },
  { code: "NW", name: "Metrics of Humanity", description: "How trust, dignity, fairness, and well-being are monitored.", prompt: "Which human-centered measures will reveal progress, inequity, or emerging harm over time?" },
] as const;

export type AttributeStatus = 'green' | 'yellow' | 'red' | 'pending';
export type ProjectDecision = 'go' | 'fix' | 'pause' | 'pending';

export interface User {
  id: number;
  email: string;
  createdAt: Date;
}

export interface Project {
  id: number;
  userId: number;
  name: string;
  description: string;
  goalStatement: string;
  decision: ProjectDecision;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attribute {
  id: number;
  projectId: number;
  code: string;
  name: string;
  description: string;
  status: AttributeStatus;
  order: number;
}

export interface Issue {
  id: number;
  attributeId: number;
  title: string;
  description: string;
  score: number;
  status: AttributeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Mitigation {
  id: number;
  issueId: number;
  description: string;
  owner: string;
  deadline: string | null;
  completed: boolean;
  createdAt: Date;
}

export const COMPASS_ATTRIBUTES = [
  { code: 'N', name: 'Purpose', description: 'The human need. Why this matters to a person, not just to the business.' },
  { code: 'NE', name: 'People', description: 'Who we help, who we might hurt, and who we are responsible for protecting.' },
  { code: 'E', name: 'Values', description: 'The human values we refuse to trade away, and how we build them in.' },
  { code: 'SE', name: 'Risks', description: 'The main ways this can go wrong, and what we are doing about it.' },
  { code: 'S', name: 'Human-in-the-Loop', description: 'Where a real human can play a role, and do we have the right people in that loop.' },
  { code: 'SW', name: 'Data & Privacy', description: 'Data boundaries, consent, retention, and access.' },
  { code: 'W', name: 'Outcomes', description: 'The positive impact we are promising to deliver.' },
  { code: 'NW', name: 'Metrics of Humanity', description: 'How we will track trust, dignity, fairness, and well-being over time.' }
] as const;

import { db, pool } from './index';
import { users, otpCodes, passkeys, projects, attributes, issues, mitigations } from './schema';
import { COMPASS_ATTRIBUTES } from '../../../shared/types';

export async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE attribute_status AS ENUM ('green', 'yellow', 'red', 'pending');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE project_decision AS ENUM ('go', 'fix', 'pause', 'pending');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS passkeys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter INTEGER DEFAULT 0 NOT NULL,
        transports TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '' NOT NULL,
        goal_statement TEXT DEFAULT '' NOT NULL,
        decision project_decision DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attributes (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
        code VARCHAR(10) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT DEFAULT '' NOT NULL,
        status attribute_status DEFAULT 'pending' NOT NULL,
        "order" INTEGER DEFAULT 0 NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id SERIAL PRIMARY KEY,
        attribute_id INTEGER REFERENCES attributes(id) ON DELETE CASCADE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '' NOT NULL,
        score INTEGER DEFAULT 50 NOT NULL,
        status attribute_status DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mitigations (
        id SERIAL PRIMARY KEY,
        issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
        description TEXT NOT NULL,
        owner VARCHAR(255) DEFAULT '' NOT NULL,
        deadline VARCHAR(50),
        completed BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

export async function seedExampleProject(userId: number) {
  const existingProject = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.name, 'AI Triage Agent')
  });
  
  if (existingProject) return existingProject;

  const [project] = await db.insert(projects).values({
    userId,
    name: 'AI Triage Agent',
    description: 'Multilingual AI triage assistant for a clinic that helps patients describe their symptoms and get routed to the right level of care.',
    goalStatement: 'We are building a multilingual AI triage assistant so that patients can describe their symptoms and get routed to the right level of care.',
    decision: 'fix'
  }).returning();

  const attributeData = COMPASS_ATTRIBUTES.map((attr, index) => ({
    projectId: project.id,
    code: attr.code,
    name: attr.name,
    description: attr.description,
    status: getAttributeStatus(attr.code) as 'green' | 'yellow' | 'red' | 'pending',
    order: index
  }));

  const insertedAttributes = await db.insert(attributes).values(attributeData).returning();

  for (const attr of insertedAttributes) {
    const issueData = getIssuesForAttribute(attr.code, attr.id);
    if (issueData.length > 0) {
      const insertedIssues = await db.insert(issues).values(issueData).returning();
      
      for (const issue of insertedIssues) {
        const mitigationData = getMitigationsForIssue(issue.title, issue.id);
        if (mitigationData.length > 0) {
          await db.insert(mitigations).values(mitigationData);
        }
      }
    }
  }

  return project;
}

function getAttributeStatus(code: string): string {
  const yellowCodes = ['SE', 'NW'];
  return yellowCodes.includes(code) ? 'yellow' : 'green';
}

function getIssuesForAttribute(code: string, attributeId: number): any[] {
  const issueMap: Record<string, any[]> = {
    'N': [
      { attributeId, title: 'Reduce patient confusion and anxiety', description: 'Help patients seeking care understand their options and next steps', score: 85, status: 'green' },
      { attributeId, title: 'Help nurses focus on urgent cases', description: 'Route patients appropriately so nurses can prioritize true urgent cases', score: 90, status: 'green' }
    ],
    'NE': [
      { attributeId, title: 'Primary beneficiaries identified', description: 'Patients (especially stressed, non-native speakers) and nurses benefit from the system', score: 85, status: 'green' },
      { attributeId, title: 'At-risk groups protected', description: 'Older adults and low-literacy patients identified as at-risk; duty to never leave high-risk patients alone with AI', score: 80, status: 'green' }
    ],
    'E': [
      { attributeId, title: 'Safety enforced', description: 'Nurse escalation on red flags is mandatory', score: 90, status: 'green' },
      { attributeId, title: 'Empathy built in', description: 'Calm, respectful language used throughout interactions', score: 85, status: 'green' },
      { attributeId, title: 'Transparency maintained', description: 'Clear disclosure: "You are chatting with an AI assistant, not a clinician"', score: 95, status: 'green' }
    ],
    'SE': [
      { attributeId, title: 'Wrong or unsafe advice risk', description: 'Restricted scripts + mandatory nurse review for all recommendations', score: 70, status: 'yellow' },
      { attributeId, title: 'Language bias risk', description: 'Bilingual testing and parity tracking still being validated', score: 55, status: 'yellow' },
      { attributeId, title: 'Over-automation risk', description: 'Human review required for all high-risk cases', score: 75, status: 'green' }
    ],
    'S': [
      { attributeId, title: 'Nurse escalation path defined', description: 'Any red flag or uncertainty sent to licensed nurse within minutes', score: 90, status: 'green' },
      { attributeId, title: 'Override capability confirmed', description: 'Nurses can override routing decisions at any time', score: 85, status: 'green' },
      { attributeId, title: 'Staff readiness verified', description: 'Nurses have training, authority, capacity, and emotional readiness to make calls', score: 80, status: 'green' }
    ],
    'SW': [
      { attributeId, title: 'Minimal data collection', description: 'Only collects symptoms and contact preference', score: 90, status: 'green' },
      { attributeId, title: 'Role-based access control', description: 'Access restricted by role with proper authentication', score: 85, status: 'green' },
      { attributeId, title: 'Data retention limits', description: 'Chat logs auto-delete after 30 days', score: 90, status: 'green' }
    ],
    'W': [
      { attributeId, title: 'Better care navigation', description: 'Patients feel calmer and know their next steps', score: 85, status: 'green' },
      { attributeId, title: 'Reduced nurse burden', description: 'Fewer repeat "what do I do now?" calls to nursing staff', score: 80, status: 'green' },
      { attributeId, title: 'Faster urgent routing', description: 'Urgent cases identified and routed more quickly', score: 85, status: 'green' }
    ],
    'NW': [
      { attributeId, title: 'Trust/clarity metrics', description: '% of patients who say "I understand what to do next" - baseline not yet collected', score: 60, status: 'yellow' },
      { attributeId, title: 'Equity metrics', description: 'Time-to-escalation gap between English and non-English speakers - parity testing ongoing', score: 55, status: 'yellow' },
      { attributeId, title: 'Accessibility checks', description: 'Interface passes basic readability and accessibility checks', score: 80, status: 'green' }
    ]
  };

  return issueMap[code] || [];
}

function getMitigationsForIssue(title: string, issueId: number): any[] {
  const mitigationMap: Record<string, any[]> = {
    'Language bias risk': [
      { issueId, description: 'Complete bilingual testing with Spanish-speaking patients', owner: 'ML Lead', deadline: '2024-02-15', completed: false },
      { issueId, description: 'Establish parity tracking dashboard for response quality', owner: 'Data Team', deadline: '2024-02-28', completed: false }
    ],
    'Trust/clarity metrics': [
      { issueId, description: 'Design and deploy patient satisfaction survey', owner: 'Patient Experience Lead', deadline: '2024-02-10', completed: false },
      { issueId, description: 'Collect baseline "I understand what to do next" scores', owner: 'Patient Experience Lead', deadline: '2024-02-20', completed: false }
    ],
    'Equity metrics': [
      { issueId, description: 'Implement time-to-escalation tracking by language', owner: 'ML Lead', deadline: '2024-02-15', completed: false },
      { issueId, description: 'Review and address any gaps between language groups', owner: 'Clinical Director', deadline: '2024-03-01', completed: false }
    ]
  };

  return mitigationMap[title] || [];
}

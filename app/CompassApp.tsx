"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Compass,
  Eye,
  FileText,
  FolderOpen,
  LogOut,
  Mail,
  PencilLine,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type {
  AttributeStatus,
  DimensionRecord,
  IssueRecord,
  MitigationRecord,
  OrganizationRole,
  OrganizationSummary,
  ProjectDecision,
  ProjectDetail,
  ProjectSummary,
  UserSummary,
} from "@/shared/types";

interface MemberRecord {
  id: string;
  email: string;
  role: OrganizationRole;
  status: "active" | "invited";
}

class RequestError extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  const data = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new RequestError(data.error ?? "Something went wrong. Please try again.");
  return data;
}

const statusMeta: Record<AttributeStatus, { label: string; detail: string; icon: typeof CheckCircle2 }> = {
  green: { label: "Ready", detail: "Score 70–100", icon: CheckCircle2 },
  yellow: { label: "Needs work", detail: "Score 40–69", icon: AlertTriangle },
  red: { label: "Blocking", detail: "Score 0–39", icon: XCircle },
  pending: { label: "Not assessed", detail: "Add at least one item", icon: Clock3 },
};

const decisionMeta: Record<ProjectDecision, { label: string; eyebrow: string; message: string; icon: typeof CheckCircle2 }> = {
  go: { label: "GO", eyebrow: "Ready to advance", message: "All eight dimensions are green. Continue with the safeguards and measures documented here.", icon: CheckCircle2 },
  fix: { label: "FIX", eyebrow: "Address before launch", message: "At least one dimension needs focused improvement before this project advances.", icon: AlertTriangle },
  pause: { label: "PAUSE", eyebrow: "Blocking concerns found", message: "At least one red dimension requires resolution before deployment or expansion.", icon: XCircle },
  pending: { label: "PENDING", eyebrow: "Assessment in progress", message: "Complete all eight Compass dimensions to produce a decision.", icon: Clock3 },
};

export function CompassApp() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [view, setView] = useState<"dashboard" | "project" | "members">("dashboard");
  const [error, setError] = useState("");
  const [projectModal, setProjectModal] = useState(false);
  const [deleteProject, setDeleteProject] = useState<ProjectSummary | null>(null);

  const loadOrganizations = useCallback(async () => {
    const data = await request<{ organizations: OrganizationSummary[] }>("/api/organizations");
    setOrganizations(data.organizations);
    setOrganizationId((current) => data.organizations.some((org) => org.id === current) ? current : (data.organizations[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    request<{ user: UserSummary | null }>("/api/auth/me")
      .then(({ user: nextUser }) => setUser(nextUser))
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadOrganizations().catch((reason) => setError(reason.message));
  }, [user, loadOrganizations]);

  const loadProjects = useCallback(async (orgId: string) => {
    if (!orgId) return setProjects([]);
    const data = await request<{ projects: ProjectSummary[] }>(`/api/organizations/${orgId}/projects`);
    setProjects(data.projects);
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    setView("dashboard");
    setActiveProject(null);
    loadProjects(organizationId).catch((reason) => setError(reason.message));
  }, [organizationId, loadProjects]);

  const activeOrganization = organizations.find((organization) => organization.id === organizationId) ?? null;

  async function openProject(projectId: string) {
    try {
      setError("");
      const data = await request<{ project: ProjectDetail }>(`/api/projects/${projectId}`);
      setActiveProject(data.project);
      setView("project");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function refreshProject() {
    if (!activeProject) return;
    const data = await request<{ project: ProjectDetail }>(`/api/projects/${activeProject.id}`);
    setActiveProject(data.project);
    await loadProjects(activeProject.orgId);
  }

  async function showMembers() {
    if (!organizationId) return;
    try {
      const data = await request<{ members: MemberRecord[] }>(`/api/organizations/${organizationId}/members`);
      setMembers(data.members);
      setView("members");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function signOut() {
    try {
      await request("/api/auth/logout", { method: "POST" });
      setUser(null);
      setOrganizations([]);
      setProjects([]);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function removeProject() {
    if (!deleteProject) return;
    try {
      await request(`/api/projects/${deleteProject.id}`, { method: "DELETE" });
      setDeleteProject(null);
      await loadProjects(organizationId);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  if (loading) return <LoadingScreen />;
  if (!user) return <SignIn onSignedIn={setUser} />;
  if (organizations.length === 0) return <OrganizationOnboarding user={user} onCreated={loadOrganizations} />;

  return (
    <div className="app-shell">
      <AppHeader
        user={user}
        organizations={organizations}
        organizationId={organizationId}
        onOrganizationChange={setOrganizationId}
        onMembers={showMembers}
        onDashboard={() => { setView("dashboard"); setActiveProject(null); }}
        onSignOut={signOut}
      />
      {error && (
        <div className="global-alert" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
          <button className="icon-button" onClick={() => setError("")} aria-label="Dismiss message"><X size={18} /></button>
        </div>
      )}
      <main className="main-content">
        {view === "dashboard" && activeOrganization && (
          <Dashboard
            organization={activeOrganization}
            projects={projects}
            onCreate={() => setProjectModal(true)}
            onOpen={openProject}
            onDelete={setDeleteProject}
          />
        )}
        {view === "members" && activeOrganization && (
          <MembersView organization={activeOrganization} members={members} onBack={() => setView("dashboard")} onRefresh={showMembers} />
        )}
        {view === "project" && activeProject && (
          <ProjectWorkspace project={activeProject} onBack={() => setView("dashboard")} onRefresh={refreshProject} />
        )}
      </main>
      <footer className="app-footer">
        <span>AI for Humanity Lab · Claremont Graduate University</span>
        <span>Human-centered decisions, documented together.</span>
      </footer>
      {projectModal && activeOrganization && (
        <CreateProjectDialog
          organization={activeOrganization}
          onClose={() => setProjectModal(false)}
          onCreated={async (projectId) => { setProjectModal(false); await loadProjects(organizationId); await openProject(projectId); }}
        />
      )}
      {deleteProject && (
        <Modal title="Delete assessment?" onClose={() => setDeleteProject(null)}>
          <p className="dialog-copy">This permanently removes <strong>{deleteProject.name}</strong>, including its issues and mitigations.</p>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setDeleteProject(null)}>Cancel</button>
            <button className="button danger" onClick={removeProject}><Trash2 size={17} /> Delete assessment</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen" role="status">
      <div className="brand-symbol"><Compass size={28} /></div>
      <div><strong>AI for Humanity Compass</strong><span>Preparing your workspace…</span></div>
    </div>
  );
}

function SignIn({ onSignedIn }: { onSignedIn: (user: UserSummary) => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      setMessage("");
      const result = await request<{ devCode?: string }>("/api/auth/request-code", { method: "POST", body: JSON.stringify({ email }) });
      setDevCode(result.devCode ?? "");
      setStep("code");
    } catch (reason) {
      setMessage((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      setMessage("");
      const result = await request<{ user: UserSummary }>("/api/auth/verify-code", { method: "POST", body: JSON.stringify({ email, code }) });
      onSignedIn(result.user);
    } catch (reason) {
      setMessage((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="signin-page">
      <section className="signin-story">
        <div className="signin-brand">
          <img src="/cgu-logo.png" alt="Claremont Graduate University" />
        </div>
        <div className="story-copy">
          <span className="eyebrow light">Responsible AI governance workspace</span>
          <h1>Move AI projects forward without losing sight of people.</h1>
          <p>Guide your team through eight human-centered dimensions, document concerns and mitigations, and reach a clear GO, FIX, or PAUSE decision.</p>
          <div className="story-points">
            <span><ShieldCheck size={19} /> Evidence-led assessment</span>
            <span><Users size={19} /> Built for organization teams</span>
            <span><Compass size={19} /> One shared decision framework</span>
          </div>
        </div>
        <div className="compass-watermark" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => <span className={index === 4 ? "center" : ""} key={index}>{index === 4 ? "AI" : ""}</span>)}
        </div>
      </section>
      <section className="signin-panel" aria-labelledby="signin-heading">
        <div className="signin-card">
          <div className="mobile-brand"><img src="/cgu-logo.png" alt="Claremont Graduate University" /></div>
          <span className="eyebrow">AI for Humanity Compass</span>
          <h2 id="signin-heading">{step === "email" ? "Enter your workspace" : "Check your email"}</h2>
          <p>{step === "email" ? "Use your work email. New users can create an organization after verification." : <>We sent a six-digit code to <strong>{email}</strong>.</>}</p>
          {message && <div className="form-alert" role="alert"><CircleAlert size={17} /> {message}</div>}
          {step === "email" ? (
            <form onSubmit={sendCode} className="form-stack">
              <label htmlFor="signin-email">Email address</label>
              <div className="input-with-icon"><Mail size={18} /><input id="signin-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@organization.org" required /></div>
              <button className="button primary wide" disabled={busy}>{busy ? "Sending code…" : "Continue with email"}<ArrowRight size={17} /></button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="form-stack">
              {devCode && <div className="dev-code">Development code: <strong>{devCode}</strong></div>}
              <label htmlFor="signin-code">One-time code</label>
              <input id="signin-code" className="code-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required />
              <button className="button primary wide" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify and sign in"}<ArrowRight size={17} /></button>
              <button type="button" className="text-button" onClick={() => { setStep("email"); setCode(""); setMessage(""); }}>Use a different email</button>
            </form>
          )}
          <p className="signin-note"><ShieldCheck size={15} /> No password required. Codes expire after 10 minutes.</p>
        </div>
        <div className="partner-logos"><img src="/ai-humanity-lab-logo.png" alt="AI for Humanity Lab" /><img src="/cisat-logo.png" alt="Center for Information Systems and Technology" /></div>
      </section>
    </main>
  );
}

function OrganizationOnboarding({ user, onCreated }: { user: UserSummary; onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      setError("");
      await request("/api/organizations", { method: "POST", body: JSON.stringify({ name }) });
      await onCreated();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-card">
        <div className="brand-symbol"><Building2 size={26} /></div>
        <span className="eyebrow">Welcome, {user.email}</span>
        <h1>Create your first organization</h1>
        <p>Organizations keep projects and team permissions separate. You can belong to more than one.</p>
        {error && <div className="form-alert" role="alert">{error}</div>}
        <form onSubmit={submit} className="form-stack">
          <label htmlFor="organization-name">Organization name</label>
          <input id="organization-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Example: Responsible Innovation Lab" required />
          <button className="button primary wide" disabled={busy}>{busy ? "Creating…" : "Create organization"}<ArrowRight size={17} /></button>
        </form>
      </div>
    </main>
  );
}

function AppHeader({ user, organizations, organizationId, onOrganizationChange, onMembers, onDashboard, onSignOut }: {
  user: UserSummary;
  organizations: OrganizationSummary[];
  organizationId: string;
  onOrganizationChange: (value: string) => void;
  onMembers: () => void;
  onDashboard: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="app-header">
      <button className="wordmark" onClick={onDashboard} aria-label="Go to projects">
        <span className="brand-symbol small"><Compass size={20} /></span>
        <span><strong>AI for Humanity</strong><small>Compass</small></span>
      </button>
      <div className="header-actions">
        <label className="org-picker"><span className="sr-only">Organization</span><Building2 size={17} /><select value={organizationId} onChange={(event) => onOrganizationChange(event.target.value)}>{organizations.map((organization) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}</select></label>
        <button className="header-button" onClick={onMembers}><Users size={17} /><span>Team</span></button>
        <div className="user-chip"><span>{user.email.charAt(0).toUpperCase()}</span><div><strong>{user.email}</strong><small>Signed in</small></div></div>
        <button className="icon-button header-logout" onClick={onSignOut} aria-label="Sign out"><LogOut size={18} /></button>
      </div>
    </header>
  );
}

function Dashboard({ organization, projects, onCreate, onOpen, onDelete }: {
  organization: OrganizationSummary;
  projects: ProjectSummary[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDelete: (project: ProjectSummary) => void;
}) {
  const complete = projects.filter((project) => project.decision !== "pending").length;
  return (
    <div className="page-width dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">{organization.name}</span>
          <h1>AI governance your team can act on.</h1>
          <p>Assess purpose, people, values, risks, human control, data, outcomes, and metrics—then make the next decision visible.</p>
        </div>
        {organization.role !== "viewer" && <button className="button primary" onClick={onCreate}><Plus size={18} /> New assessment</button>}
      </section>
      <section className="metric-row" aria-label="Project overview">
        <div><span>Assessments</span><strong>{projects.length}</strong><small>Across this organization</small></div>
        <div><span>Decision-ready</span><strong>{complete}</strong><small>All dimensions assessed</small></div>
        <div><span>Your role</span><strong className="role-metric">{organization.role}</strong><small>{organization.role === "viewer" ? "Read-only access" : "Can contribute to assessments"}</small></div>
      </section>
      <section className="section-heading">
        <div><span className="eyebrow">Workspace</span><h2>Project assessments</h2></div>
        <span className="section-count">{projects.length} total</span>
      </section>
      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FolderOpen size={28} /></div>
          <h3>Start with one consequential AI project</h3>
          <p>Create an assessment and guide the team through all eight dimensions. A sample is not added automatically, so your workspace starts clean.</p>
          {organization.role !== "viewer" && <button className="button primary" onClick={onCreate}><Plus size={18} /> Create first assessment</button>}
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-card-top"><DecisionBadge decision={project.decision} /><span>{project.completedDimensions}/8 dimensions</span></div>
              <h3>{project.name}</h3>
              <p>{project.description || "No project description yet."}</p>
              <div className="progress-track" aria-label={`${project.completedDimensions} of 8 dimensions completed`}><span style={{ width: `${project.completedDimensions * 12.5}%` }} /></div>
              <div className="project-card-meta"><span>Updated {formatDate(project.updatedAt)}</span>{project.updatedByEmail && <span>by {project.updatedByEmail}</span>}</div>
              <div className="project-card-actions">
                <button className="button secondary" onClick={() => onOpen(project.id)}>{organization.role === "viewer" ? <Eye size={17} /> : <PencilLine size={17} />}{organization.role === "viewer" ? "Review" : "Continue"}<ChevronRight size={16} /></button>
                {organization.role === "admin" && <button className="icon-button danger-ghost" onClick={() => onDelete(project)} aria-label={`Delete ${project.name}`}><Trash2 size={17} /></button>}
              </div>
            </article>
          ))}
        </div>
      )}
      <section className="framework-strip">
        <div className="brand-symbol"><Compass size={25} /></div>
        <div><span className="eyebrow">The eight-dimension Compass</span><h2>A shared language for difficult AI decisions.</h2></div>
        <p>Each direction converts a broad principle into concrete evidence, issues, scores, owners, and mitigations.</p>
      </section>
    </div>
  );
}

function MembersView({ organization, members, onBack, onRefresh }: {
  organization: OrganizationSummary;
  members: MemberRecord[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("assessor");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function invite(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      setMessage("");
      const result = await request<{ status: "active" | "invited" }>(`/api/organizations/${organization.id}/members`, { method: "POST", body: JSON.stringify({ email, role }) });
      setEmail("");
      setMessage(result.status === "active" ? "Member added. Their access is active now." : "Invitation sent. The membership will activate when the recipient signs in.");
      await onRefresh();
    } catch (reason) {
      setMessage((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(userId: string, nextRole: OrganizationRole) {
    try {
      await request(`/api/organizations/${organization.id}/members`, { method: "PATCH", body: JSON.stringify({ userId, role: nextRole }) });
      await onRefresh();
    } catch (reason) {
      setMessage((reason as Error).message);
    }
  }

  async function removeMember(userId: string) {
    try {
      await request(`/api/organizations/${organization.id}/members`, { method: "DELETE", body: JSON.stringify({ userId }) });
      await onRefresh();
    } catch (reason) {
      setMessage((reason as Error).message);
    }
  }

  return (
    <div className="page-width narrow-page">
      <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Back to projects</button>
      <section className="page-title-row"><div><span className="eyebrow">{organization.name}</span><h1>Team access</h1><p>Invite collaborators and give each person only the access they need.</p></div><div className="role-key"><span><ShieldCheck size={18} /> Your role</span><strong>{organization.role}</strong></div></section>
      {message && <div className="inline-message" role="status">{message}</div>}
      {organization.role === "admin" && (
        <form className="invite-panel" onSubmit={invite}>
          <div><span className="eyebrow">Invite a teammate</span><h2>Add someone by email</h2></div>
          <label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@organization.org" required /></label>
          <label><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value as OrganizationRole)}><option value="assessor">Assessor</option><option value="viewer">Viewer</option><option value="admin">Admin</option></select></label>
          <button className="button primary" disabled={busy}><UserPlus size={17} /> {busy ? "Inviting…" : "Send invitation"}</button>
        </form>
      )}
      <div className="member-list">
        <div className="member-list-head"><span>Member</span><span>Access</span><span>Status</span><span className="sr-only">Actions</span></div>
        {members.map((member) => (
          <div className="member-row" key={`${member.status}-${member.id}`}>
            <div className="member-identity"><span className="avatar">{member.email.charAt(0).toUpperCase()}</span><div><strong>{member.email}</strong><small>{member.status === "active" ? "Verified account" : "Awaiting sign-in"}</small></div></div>
            {organization.role === "admin" && member.status === "active" ? (
              <select aria-label={`Role for ${member.email}`} value={member.role} onChange={(event) => updateRole(member.id, event.target.value as OrganizationRole)}><option value="admin">Admin</option><option value="assessor">Assessor</option><option value="viewer">Viewer</option></select>
            ) : <span className="role-pill">{member.role}</span>}
            <span className={`member-status ${member.status}`}>{member.status}</span>
            {organization.role === "admin" ? <button className="icon-button danger-ghost" onClick={() => removeMember(member.id)} aria-label={member.status === "active" ? `Remove ${member.email}` : `Revoke invitation for ${member.email}`}><Trash2 size={17} /></button> : <span />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectWorkspace({ project, onBack, onRefresh }: { project: ProjectDetail; onBack: () => void; onRefresh: () => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [lastSaved, setLastSaved] = useState(project.updatedAt);
  const canEdit = project.role !== "viewer";
  const isSummary = step === project.dimensions.length;
  const dimension = project.dimensions[step];

  async function refreshed() {
    setLastSaved(new Date().toISOString());
    await onRefresh();
  }

  return (
    <div className="workspace-page">
      <div className="workspace-topbar page-width">
        <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Projects</button>
        <div className="workspace-title"><span className="eyebrow">Guided assessment</span><h1>{project.name}</h1></div>
        <div className="save-indicator"><Check size={16} /><span>Saved {formatTime(lastSaved)}</span></div>
        <DecisionBadge decision={project.decision} />
      </div>
      <div className="workspace-layout page-width">
        <aside className="step-navigation" aria-label="Compass dimensions">
          <div className="step-progress"><span>{project.completedDimensions} of 8 assessed</span><strong>{Math.round(project.completedDimensions / 8 * 100)}%</strong><div className="progress-track"><span style={{ width: `${project.completedDimensions * 12.5}%` }} /></div></div>
          <ol>
            {project.dimensions.map((item, index) => <li key={item.id}><button className={step === index ? "active" : ""} onClick={() => setStep(index)}><span className={`step-code status-${item.status}`}>{item.code}</span><span><strong>{item.name}</strong><small>{statusMeta[item.status].label}</small></span>{item.status !== "pending" && <Check size={15} />}</button></li>)}
            <li><button className={isSummary ? "active" : ""} onClick={() => setStep(project.dimensions.length)}><span className="step-code summary"><FileText size={16} /></span><span><strong>Decision summary</strong><small>GO · FIX · PAUSE</small></span><ChevronRight size={15} /></button></li>
          </ol>
        </aside>
        <section className="assessment-panel">
          {isSummary ? <DecisionSummary project={project} onNavigate={setStep} /> : <DimensionStep dimension={dimension} canEdit={canEdit} onChanged={refreshed} />}
          <div className="step-actions">
            <button className="button secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft size={17} /> Previous</button>
            <span>Step {Math.min(step + 1, 9)} of 9</span>
            <button className="button primary" disabled={isSummary} onClick={() => setStep((current) => Math.min(project.dimensions.length, current + 1))}>Next {step === 7 ? "summary" : "dimension"}<ArrowRight size={17} /></button>
          </div>
        </section>
      </div>
    </div>
  );
}

function DimensionStep({ dimension, canEdit, onChanged }: { dimension: DimensionRecord; canEdit: boolean; onChanged: () => Promise<void> }) {
  return (
    <div className="dimension-step">
      <header className="dimension-header">
        <div className={`dimension-code status-${dimension.status}`}>{dimension.code}</div>
        <div><span className="eyebrow">Compass dimension {dimension.position + 1}</span><h2>{dimension.name}</h2><p>{dimension.description}</p></div>
        <StatusBadge status={dimension.status} />
      </header>
      <div className="guidance-card"><Sparkles size={20} /><div><span>Guiding question</span><p>{dimension.prompt}</p></div></div>
      <div className="assessment-heading"><div><h3>Evidence, issues, and goals</h3><p>Add at least one scored item to complete this dimension.</p></div><span>{dimension.issues.length} item{dimension.issues.length === 1 ? "" : "s"}</span></div>
      <div className="issue-list">
        {dimension.issues.map((issue) => <IssueEditor key={issue.id} issue={issue} canEdit={canEdit} onChanged={onChanged} />)}
        {dimension.issues.length === 0 && !canEdit && <div className="read-only-empty"><Eye size={22} /><p>This dimension has not been assessed yet.</p></div>}
      </div>
      {canEdit && <AddIssueForm dimensionId={dimension.id} projectId={dimension.projectId} onChanged={onChanged} />}
    </div>
  );
}

function IssueEditor({ issue, canEdit, onChanged }: { issue: IssueRecord; canEdit: boolean; onChanged: () => Promise<void> }) {
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description);
  const [score, setScore] = useState(issue.score);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMitigationForm, setShowMitigationForm] = useState(false);
  const saveInFlight = useRef(false);
  const localStatus: Exclude<AttributeStatus, "pending"> = score < 40 ? "red" : score < 70 ? "yellow" : "green";

  useEffect(() => { setTitle(issue.title); setDescription(issue.description); setScore(issue.score); }, [issue]);

  async function save() {
    if (!canEdit || saveInFlight.current || (title === issue.title && description === issue.description && score === issue.score)) return;
    saveInFlight.current = true;
    try {
      setSaving(true);
      setFailure("");
      await request(`/api/issues/${issue.id}`, { method: "PATCH", body: JSON.stringify({ title, description, score }) });
      await onChanged();
    } catch (reason) {
      setFailure((reason as Error).message);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  async function remove() {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    try {
      setSaving(true);
      setFailure("");
      await request(`/api/issues/${issue.id}`, { method: "DELETE" });
      await onChanged();
    } catch (reason) {
      setFailure((reason as Error).message);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <article className={`issue-card status-border-${localStatus}`}>
      <div className="issue-card-head">
        <StatusBadge status={localStatus} />
        <div className="score-readout"><strong>{score}</strong><span>/ 100</span></div>
        {saving && <span className="saving-text">Saving…</span>}
      </div>
      {failure && <div className="form-alert" role="alert"><CircleAlert size={17} /> {failure}</div>}
      <label><span>Issue or goal</span><input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={save} disabled={!canEdit} /></label>
      <label><span>Evidence and context</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} onBlur={save} disabled={!canEdit} placeholder="Describe the evidence, affected people, assumptions, and open questions." /></label>
      <div className="score-editor">
        <div><label htmlFor={`score-${issue.id}`}>Human-centered readiness score</label><p>0 means blocking concern; 100 means evidence-backed readiness.</p></div>
        <input id={`score-${issue.id}`} type="range" min="0" max="100" value={score} onChange={(event) => setScore(Number(event.target.value))} onPointerUp={save} onBlur={save} disabled={!canEdit} />
        <div className="score-scale"><span>0 · Blocking</span><span>40 · Needs work</span><span>70 · Ready</span><span>100</span></div>
      </div>
      {(localStatus === "yellow" || localStatus === "red" || issue.mitigations.length > 0) && (
        <div className="mitigation-section">
          <div className="mitigation-heading"><div><h4>Mitigations</h4><p>Assign a concrete response, owner, and due date.</p></div>{canEdit && <button className="text-button" onClick={() => setShowMitigationForm((value) => !value)}><Plus size={16} /> Add mitigation</button>}</div>
          {issue.mitigations.map((mitigation) => <MitigationEditor key={mitigation.id} mitigation={mitigation} canEdit={canEdit} onChanged={onChanged} />)}
          {showMitigationForm && <AddMitigationForm issueId={issue.id} onClose={() => setShowMitigationForm(false)} onChanged={onChanged} />}
          {issue.mitigations.length === 0 && !showMitigationForm && <p className="mitigation-empty">No mitigation has been documented yet.</p>}
        </div>
      )}
      {canEdit && <div className="destructive-row">{confirmDelete ? <><span>Delete this item and its mitigations?</span><button className="button danger compact" onClick={remove}>Yes, delete</button><button className="text-button" onClick={() => setConfirmDelete(false)}>Cancel</button></> : <button className="text-button danger-text" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete item</button>}</div>}
    </article>
  );
}

function AddIssueForm({ dimensionId, projectId, onChanged }: { dimensionId: string; projectId: string; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [score, setScore] = useState(50);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      setFailure("");
      await request(`/api/projects/${projectId}/issues`, { method: "POST", body: JSON.stringify({ dimensionId, title, description, score }) });
      setTitle(""); setDescription(""); setScore(50); setOpen(false);
      await onChanged();
    } catch (reason) {
      setFailure((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <button className="add-item-button" onClick={() => setOpen(true)}><Plus size={20} /><span><strong>Add an assessment item</strong><small>Document evidence, a concern, or a goal and assign a score.</small></span></button>;
  return (
    <form className="new-item-form" onSubmit={submit}>
      <div className="form-title"><div><span className="eyebrow">New assessment item</span><h3>Document what the team knows</h3></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Cancel adding item"><X size={18} /></button></div>
      {failure && <div className="form-alert" role="alert"><CircleAlert size={17} /> {failure}</div>}
      <label><span>Issue or goal</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Patients can appeal an automated recommendation" required /></label>
      <label><span>Evidence and context</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add the evidence, assumptions, affected people, or unresolved questions." /></label>
      <label className="new-score"><span>Readiness score: <strong>{score}</strong></span><input type="range" min="0" max="100" value={score} onChange={(event) => setScore(Number(event.target.value))} /></label>
      <div className="dialog-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Adding…" : "Add item"}<ArrowRight size={16} /></button></div>
    </form>
  );
}

function MitigationEditor({ mitigation, canEdit, onChanged }: { mitigation: MitigationRecord; canEdit: boolean; onChanged: () => Promise<void> }) {
  const [description, setDescription] = useState(mitigation.description);
  const [owner, setOwner] = useState(mitigation.owner);
  const [deadline, setDeadline] = useState(mitigation.deadline ?? "");
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [failure, setFailure] = useState("");
  const saveInFlight = useRef(false);

  useEffect(() => { setDescription(mitigation.description); setOwner(mitigation.owner); setDeadline(mitigation.deadline ?? ""); }, [mitigation]);

  async function save(extra?: Partial<MitigationRecord>) {
    const nextDeadline = deadline || null;
    const unchanged = description === mitigation.description && owner === mitigation.owner && nextDeadline === mitigation.deadline && (extra?.completed ?? mitigation.completed) === mitigation.completed;
    if (!canEdit || saveInFlight.current || unchanged) return;
    saveInFlight.current = true;
    try {
      setFailure("");
      await request(`/api/mitigations/${mitigation.id}`, { method: "PATCH", body: JSON.stringify({ description, owner, deadline: nextDeadline, ...extra }) });
      await onChanged();
    } catch (reason) {
      setFailure((reason as Error).message);
    } finally {
      saveInFlight.current = false;
    }
  }

  async function remove() {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    try {
      setFailure("");
      await request(`/api/mitigations/${mitigation.id}`, { method: "DELETE" });
      await onChanged();
    } catch (reason) {
      setFailure((reason as Error).message);
    } finally {
      saveInFlight.current = false;
    }
  }

  return (
    <div className={`mitigation-row ${mitigation.completed ? "completed" : ""}`}>
      <input className="check-input" type="checkbox" checked={mitigation.completed} onChange={(event) => save({ completed: event.target.checked })} disabled={!canEdit} aria-label={`Mark ${mitigation.description} complete`} />
      <div className="mitigation-fields">
        <input value={description} onChange={(event) => setDescription(event.target.value)} onBlur={() => save()} disabled={!canEdit} aria-label="Mitigation description" />
        <div><input value={owner} onChange={(event) => setOwner(event.target.value)} onBlur={() => save()} disabled={!canEdit} placeholder="Owner" aria-label="Mitigation owner" /><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} onBlur={() => save()} disabled={!canEdit} aria-label="Mitigation due date" /></div>
      </div>
      {canEdit && (removeConfirm ? <div className="mini-confirm"><button className="text-button danger-text" onClick={remove}>Delete</button><button className="text-button" onClick={() => setRemoveConfirm(false)}>Keep</button></div> : <button className="icon-button danger-ghost" onClick={() => setRemoveConfirm(true)} aria-label="Delete mitigation"><Trash2 size={16} /></button>)}
      {failure && <div className="form-alert mitigation-error" role="alert"><CircleAlert size={16} /> {failure}</div>}
    </div>
  );
}

function AddMitigationForm({ issueId, onClose, onChanged }: { issueId: string; onClose: () => void; onChanged: () => Promise<void> }) {
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      setFailure("");
      await request(`/api/issues/${issueId}/mitigations`, { method: "POST", body: JSON.stringify({ description, owner, deadline: deadline || null }) });
      onClose();
      await onChanged();
    } catch (reason) {
      setFailure((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mitigation-form" onSubmit={submit}>
      {failure && <div className="form-alert mitigation-form-error" role="alert"><CircleAlert size={16} /> {failure}</div>}
      <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the safeguard or corrective action" aria-label="Mitigation description" required />
      <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Owner" aria-label="Mitigation owner" />
      <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} aria-label="Mitigation due date" />
      <button className="button primary compact" disabled={busy}>{busy ? "Adding…" : "Add"}</button><button type="button" className="text-button" onClick={onClose}>Cancel</button>
    </form>
  );
}

function DecisionSummary({ project, onNavigate }: { project: ProjectDetail; onNavigate: (step: number) => void }) {
  const meta = decisionMeta[project.decision];
  const Icon = meta.icon;
  const issues = project.dimensions.flatMap((dimension) => dimension.issues.map((issue) => ({ ...issue, dimension })));
  const blockers = issues.filter((issue) => issue.status === "red");
  const needsWork = issues.filter((issue) => issue.status === "yellow");
  const openMitigations = issues.flatMap((issue) => issue.mitigations).filter((mitigation) => !mitigation.completed);
  return (
    <div className="decision-summary">
      <header className={`decision-hero decision-${project.decision}`}>
        <div className="decision-icon"><Icon size={34} /></div>
        <div><span>{meta.eyebrow}</span><h2>{meta.label}</h2><p>{meta.message}</p></div>
        <div className="decision-completion"><strong>{project.completedDimensions}/8</strong><span>dimensions assessed</span></div>
      </header>
      <div className="summary-metrics"><div><span>Blocking items</span><strong>{blockers.length}</strong></div><div><span>Needs work</span><strong>{needsWork.length}</strong></div><div><span>Open mitigations</span><strong>{openMitigations.length}</strong></div></div>
      <section className="summary-section"><div className="assessment-heading"><div><h3>Compass overview</h3><p>Select a dimension to review its evidence and mitigations.</p></div></div><div className="dimension-summary-grid">{project.dimensions.map((dimension) => <button onClick={() => onNavigate(dimension.position)} key={dimension.id}><span className={`step-code status-${dimension.status}`}>{dimension.code}</span><div><strong>{dimension.name}</strong><small>{dimension.issues.length} item{dimension.issues.length === 1 ? "" : "s"}</small></div><StatusBadge status={dimension.status} /></button>)}</div></section>
      <section className="summary-section"><div className="assessment-heading"><div><h3>Priority actions</h3><p>Focus first on red and yellow items with incomplete mitigations.</p></div></div>{blockers.length + needsWork.length === 0 ? <div className="positive-empty"><CheckCircle2 size={23} /><div><strong>No red or yellow items remain.</strong><p>Continue monitoring the measures documented across the Compass.</p></div></div> : <div className="priority-list">{[...blockers, ...needsWork].map((issue) => <button key={issue.id} onClick={() => onNavigate(issue.dimension.position)}><StatusBadge status={issue.status} /><div><strong>{issue.title}</strong><small>{issue.dimension.code} · {issue.dimension.name} · {issue.mitigations.filter((item) => !item.completed).length} open mitigations</small></div><ChevronRight size={17} /></button>)}</div>}</section>
    </div>
  );
}

function CreateProjectDialog({ organization, onClose, onCreated }: { organization: OrganizationSummary; onClose: () => void; onCreated: (projectId: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalStatement, setGoalStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      setError("");
      const result = await request<{ projectId: string }>(`/api/organizations/${organization.id}/projects`, { method: "POST", body: JSON.stringify({ name, description, goalStatement }) });
      await onCreated(result.projectId);
    } catch (reason) {
      setError((reason as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Create a new assessment" onClose={onClose} wide>
      <p className="dialog-copy">Start with a concise project definition. The Compass will guide the team through the rest.</p>
      {error && <div className="form-alert" role="alert">{error}</div>}
      <form onSubmit={submit} className="form-stack">
        <label><span>Project name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Example: AI-assisted patient triage" required /></label>
        <label><span>Brief description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is the project and where will it be used?" /></label>
        <label><span>Human-centered goal statement</span><textarea value={goalStatement} onChange={(event) => setGoalStatement(event.target.value)} placeholder="We are building… so that… can…" /></label>
        <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Creating…" : "Create and begin"}<ArrowRight size={17} /></button></div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter((element) => !element.hidden);
    (focusable()[0] ?? dialogRef.current)?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      previouslyFocused?.focus();
    };
  }, []);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}><header><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>{children}</section></div>;
}

function StatusBadge({ status }: { status: AttributeStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return <span className={`status-badge status-${status}`} title={meta.detail}><Icon size={15} /><span>{meta.label}</span></span>;
}

function DecisionBadge({ decision }: { decision: ProjectDecision }) {
  const meta = decisionMeta[decision];
  const Icon = meta.icon;
  return <span className={`decision-badge decision-${decision}`}><Icon size={15} /><span>{meta.label}</span></span>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

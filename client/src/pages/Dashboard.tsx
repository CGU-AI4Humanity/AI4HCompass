import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Plus, FolderOpen, Trash2, ArrowRight, CheckCircle, AlertTriangle, XCircle, Clock, X, Sparkles } from 'lucide-react';

const dimensionDescriptions: Record<string, { name: string; description: string; question: string }> = {
  N: {
    name: 'Purpose',
    description: 'The fundamental human need or problem that this AI initiative aims to address.',
    question: 'What human need does this AI serve? Why does this solution need to exist?'
  },
  NE: {
    name: 'People',
    description: 'Understanding who benefits from and who could potentially be harmed by this AI system.',
    question: 'Who benefits from this AI? Who could be negatively impacted? Have we considered all stakeholders?'
  },
  E: {
    name: 'Values',
    description: 'The human values, ethical principles, and moral considerations built into the AI design.',
    question: 'What values are embedded in the design? How do we ensure fairness, transparency, and respect for human dignity?'
  },
  SE: {
    name: 'Risks',
    description: 'Potential failures, unintended consequences, and mitigation strategies.',
    question: 'What can go wrong? What are the worst-case scenarios? How do we prevent and respond to failures?'
  },
  S: {
    name: 'Human-in-the-Loop',
    description: 'Points where human oversight, control, and intervention are maintained.',
    question: 'Where do humans stay in control? Can users override AI decisions? Is there meaningful human oversight?'
  },
  SW: {
    name: 'Data & Privacy',
    description: 'Data governance, privacy protection, consent mechanisms, and access controls.',
    question: 'What data is collected and why? How is privacy protected? Who has access? Is there informed consent?'
  },
  W: {
    name: 'Outcomes',
    description: 'The measurable positive impact and value this AI will deliver to users and society.',
    question: 'What positive outcomes will this deliver? How do we measure success beyond metrics?'
  },
  NW: {
    name: 'Metrics of Humanity',
    description: 'How we track and ensure trust, dignity, fairness, and human well-being over time.',
    question: 'How do we measure trust and dignity? What human-centered KPIs will we track?'
  }
};

interface Project {
  id: number;
  name: string;
  description: string;
  decision: 'go' | 'fix' | 'pause' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', goalStatement: '' });
  const [creating, setCreating] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newProject)
      });

      if (res.ok) {
        const project = await res.json();
        setProjects([...projects, project]);
        setShowCreate(false);
        setNewProject({ name: '', description: '', goalStatement: '' });
        setLocation(`/project/${project.id}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(id: number) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }

  function getDecisionBadge(decision: string) {
    const badges: Record<string, { icon: any; label: string; className: string }> = {
      go: { icon: CheckCircle, label: 'GO', className: 'bg-traffic-green text-white' },
      fix: { icon: AlertTriangle, label: 'FIX', className: 'bg-traffic-yellow text-cgu-dark' },
      pause: { icon: XCircle, label: 'PAUSE', className: 'bg-traffic-red text-white' },
      pending: { icon: Clock, label: 'PENDING', className: 'bg-gray-400 text-white' }
    };
    const badge = badges[decision] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase ${badge.className}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bauhaus-card p-8">
          <div className="animate-pulse">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-cgu-dark">Your Projects</h2>
          <p className="text-cgu-dark/60">Assess AI initiatives with the 8-dimension compass</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bauhaus-btn bg-cgu-green text-white px-4 py-2 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bauhaus-card p-6 w-full max-w-lg animate-fade-in">
            <h3 className="text-xl font-bold text-cgu-dark mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-cgu-dark mb-1 uppercase tracking-wide">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g., AI Triage Agent"
                  className="bauhaus-input w-full px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-cgu-dark mb-1 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Brief description of the AI project..."
                  className="bauhaus-input w-full px-3 py-2 h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-cgu-dark mb-1 uppercase tracking-wide">
                  Goal Statement
                </label>
                <p className="text-xs text-cgu-dark/60 mb-2">
                  "We are building __________ so that __________ can __________."
                </p>
                <textarea
                  value={newProject.goalStatement}
                  onChange={(e) => setNewProject({ ...newProject, goalStatement: e.target.value })}
                  placeholder="We are building... so that... can..."
                  className="bauhaus-input w-full px-3 py-2 h-20 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewProject({ name: '', description: '', goalStatement: '' }); }}
                  className="bauhaus-btn bg-white text-cgu-dark px-4 py-2 flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bauhaus-btn bg-cgu-red text-white px-4 py-2 flex-1"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bauhaus-card p-12 text-center">
          <FolderOpen className="w-16 h-16 text-cgu-dark/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-cgu-dark mb-2">No projects yet</h3>
          <p className="text-cgu-dark/60 mb-6">
            Create your first project to start assessing AI initiatives
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="bauhaus-btn bg-cgu-red text-white px-6 py-3 inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bauhaus-card p-5 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-cgu-dark">{project.name}</h3>
                    {getDecisionBadge(project.decision)}
                  </div>
                  {project.description && (
                    <p className="text-sm text-cgu-dark/60 line-clamp-2">{project.description}</p>
                  )}
                  <p className="text-xs text-cgu-dark/40 mt-2">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="bauhaus-btn bg-white text-traffic-red px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setLocation(`/project/${project.id}`)}
                    className="bauhaus-btn bg-cgu-red text-white px-4 py-2 flex items-center gap-2"
                  >
                    Open
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 bauhaus-card p-6 bg-cgu-green/10 border-cgu-green">
        <h3 className="font-bold text-cgu-dark mb-2">About the AI for Humanity Compass</h3>
        <p className="text-sm text-cgu-dark/70 mb-4">
          The Compass is a decision tool for AI projects. It helps teams keep every AI initiative aligned with 
          human dignity, safety, and well-being through 8 essential dimensions. <strong>Click any dimension to learn more.</strong>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {Object.entries(dimensionDescriptions).map(([code, dim]) => (
            <button
              key={code}
              onClick={() => setSelectedDimension(code)}
              className="bg-white p-2 border border-cgu-dark/10 text-left hover:bg-cgu-red/10 hover:border-cgu-red transition-colors cursor-pointer"
            >
              <strong>{code}</strong> {dim.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 bauhaus-card p-6 bg-gradient-to-r from-cgu-red/10 to-cgu-maroon/10 border-cgu-red">
        <div className="flex items-start gap-4">
          <div className="bg-cgu-red text-white p-3 rounded-full">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-cgu-dark mb-1 flex items-center gap-2">
              Coming Soon!
              <span className="text-xs bg-cgu-red text-white px-2 py-0.5 rounded-full font-normal">NEW</span>
            </h3>
            <p className="text-sm text-cgu-dark/80">
              <strong>AI-powered recommendations for risks and issues</strong> — When you enter a Risk or Issue for each dimension, 
              you can request AI to provide a list of mitigations automatically! Stay tuned...
            </p>
          </div>
        </div>
      </div>

      {selectedDimension && dimensionDescriptions[selectedDimension] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedDimension(null)}>
          <div className="bauhaus-card p-6 w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="bg-cgu-red text-white px-3 py-1 text-xl font-black">{selectedDimension}</span>
                <h3 className="text-xl font-bold text-cgu-dark">{dimensionDescriptions[selectedDimension].name}</h3>
              </div>
              <button onClick={() => setSelectedDimension(null)} className="text-cgu-dark/50 hover:text-cgu-dark">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-cgu-dark/80 mb-4">{dimensionDescriptions[selectedDimension].description}</p>
            <div className="bg-cgu-green/10 p-4 border-l-4 border-cgu-green">
              <p className="text-sm font-semibold text-cgu-dark mb-1">Key Question:</p>
              <p className="text-sm text-cgu-dark/80 italic">"{dimensionDescriptions[selectedDimension].question}"</p>
            </div>
            <button
              onClick={() => setSelectedDimension(null)}
              className="mt-4 w-full bauhaus-btn bg-cgu-red text-white py-2"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

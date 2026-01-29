import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, Save, Plus, Trash2, CheckCircle, AlertTriangle, 
  XCircle, Clock, ChevronDown, ChevronUp, Edit2, X 
} from 'lucide-react';
import { COMPASS_ATTRIBUTES } from '@shared/types';

interface Mitigation {
  id: number;
  description: string;
  owner: string;
  deadline: string | null;
  completed: boolean;
}

interface Issue {
  id: number;
  title: string;
  description: string;
  score: number;
  status: 'green' | 'yellow' | 'red' | 'pending';
  mitigations: Mitigation[];
}

interface Attribute {
  id: number;
  code: string;
  name: string;
  description: string;
  status: 'green' | 'yellow' | 'red' | 'pending';
  issues: Issue[];
}

interface Project {
  id: number;
  name: string;
  description: string;
  goalStatement: string;
  decision: 'go' | 'fix' | 'pause' | 'pending';
  attributes: Attribute[];
}

export default function ProjectView({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else {
        setLocation('/');
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
      setLocation('/');
    } finally {
      setLoading(false);
    }
  }

  async function updateProject(updates: Partial<Project>) {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        setProject({ ...project, ...updated });
      }
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  }

  async function calculateDecision() {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/calculate-decision`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        fetchProject();
      }
    } catch (error) {
      console.error('Failed to calculate decision:', error);
    } finally {
      setSaving(false);
    }
  }

  async function addIssue(attrId: number) {
    if (!project) return;
    const title = prompt('Enter issue/goal title:');
    if (!title) return;

    try {
      const res = await fetch(`/api/projects/${project.id}/attributes/${attrId}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, status: 'pending', score: 50 })
      });
      if (res.ok) {
        fetchProject();
      }
    } catch (error) {
      console.error('Failed to add issue:', error);
    }
  }

  async function updateIssue(issueId: number, updates: Partial<Issue>) {
    if (!project) return;
    try {
      await fetch(`/api/projects/${project.id}/issues/${issueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      fetchProject();
    } catch (error) {
      console.error('Failed to update issue:', error);
    }
  }

  async function deleteIssue(issueId: number) {
    if (!project || !confirm('Delete this issue?')) return;
    try {
      await fetch(`/api/projects/${project.id}/issues/${issueId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      fetchProject();
    } catch (error) {
      console.error('Failed to delete issue:', error);
    }
  }

  async function addMitigation(issueId: number) {
    if (!project) return;
    const description = prompt('Enter mitigation description:');
    if (!description) return;

    try {
      await fetch(`/api/projects/${project.id}/issues/${issueId}/mitigations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description, owner: '', deadline: null })
      });
      fetchProject();
    } catch (error) {
      console.error('Failed to add mitigation:', error);
    }
  }

  async function updateMitigation(mitId: number, updates: Partial<Mitigation>) {
    if (!project) return;
    try {
      await fetch(`/api/projects/${project.id}/mitigations/${mitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      fetchProject();
    } catch (error) {
      console.error('Failed to update mitigation:', error);
    }
  }

  async function deleteMitigation(mitId: number) {
    if (!project || !confirm('Delete this mitigation?')) return;
    try {
      await fetch(`/api/projects/${project.id}/mitigations/${mitId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      fetchProject();
    } catch (error) {
      console.error('Failed to delete mitigation:', error);
    }
  }

  function getStatusIcon(status: string, size = 'w-5 h-5') {
    switch (status) {
      case 'green': return <CheckCircle className={`${size} text-traffic-green`} />;
      case 'yellow': return <AlertTriangle className={`${size} text-traffic-yellow`} />;
      case 'red': return <XCircle className={`${size} text-traffic-red`} />;
      default: return <Clock className={`${size} text-gray-400`} />;
    }
  }

  function getDecisionDisplay(decision: string) {
    const displays: Record<string, { label: string; color: string; desc: string }> = {
      go: { label: 'GO', color: 'bg-traffic-green', desc: 'All items green. Ready to launch!' },
      fix: { label: 'FIX', color: 'bg-traffic-yellow', desc: 'Yellow items need attention before launch.' },
      pause: { label: 'PAUSE', color: 'bg-traffic-red', desc: 'Red items block deployment. Address them first.' },
      pending: { label: 'PENDING', color: 'bg-gray-400', desc: 'Complete assessments to determine status.' }
    };
    return displays[decision] || displays.pending;
  }

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bauhaus-card p-8">
          <div className="animate-pulse">Loading project...</div>
        </div>
      </div>
    );
  }

  const decision = getDecisionDisplay(project.decision);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setLocation('/')}
          className="bauhaus-btn bg-white text-cgu-dark px-3 py-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-cgu-dark">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-cgu-dark/60">{project.description}</p>
          )}
        </div>
        <button
          onClick={calculateDecision}
          disabled={saving}
          className="bauhaus-btn bg-cgu-green text-white px-4 py-2 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Calculating...' : 'Calculate Decision'}
        </button>
      </div>

      {project.goalStatement && (
        <div className="bauhaus-card p-4 mb-6 bg-cgu-light border-cgu-dark/20">
          <p className="text-sm font-medium text-cgu-dark/80">
            <strong>Goal:</strong> {project.goalStatement}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`bauhaus-btn px-4 py-2 text-sm whitespace-nowrap ${
            activeTab === 'summary' ? 'tab-active' : 'bg-white text-cgu-dark'
          }`}
        >
          Summary
        </button>
        {project.attributes.map((attr) => (
          <button
            key={attr.code}
            onClick={() => setActiveTab(attr.code)}
            className={`bauhaus-btn px-4 py-2 text-sm flex items-center gap-2 whitespace-nowrap ${
              activeTab === attr.code ? 'tab-active' : 'bg-white text-cgu-dark'
            }`}
          >
            {getStatusIcon(attr.status, 'w-4 h-4')}
            <span className="font-bold">{attr.code}</span>
            <span className="hidden sm:inline">{attr.name}</span>
          </button>
        ))}
      </div>

      {activeTab === 'summary' ? (
        <SummaryTab project={project} decision={decision} onNavigate={setActiveTab} getStatusIcon={getStatusIcon} />
      ) : (
        <AttributeTab
          project={project}
          attribute={project.attributes.find(a => a.code === activeTab)!}
          onAddIssue={addIssue}
          onUpdateIssue={updateIssue}
          onDeleteIssue={deleteIssue}
          onAddMitigation={addMitigation}
          onUpdateMitigation={updateMitigation}
          onDeleteMitigation={deleteMitigation}
          getStatusIcon={getStatusIcon}
        />
      )}
    </div>
  );
}

function SummaryTab({ 
  project, 
  decision, 
  onNavigate,
  getStatusIcon 
}: { 
  project: Project; 
  decision: { label: string; color: string; desc: string };
  onNavigate: (tab: string) => void;
  getStatusIcon: (status: string, size?: string) => JSX.Element;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`bauhaus-card p-6 ${decision.color} text-white`}>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="text-6xl font-black">{decision.label}</div>
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold mb-1">Project Decision</h3>
            <p className="opacity-90">{decision.desc}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {project.attributes.map((attr) => (
          <div
            key={attr.code}
            onClick={() => onNavigate(attr.code)}
            className="bauhaus-card p-4 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-cgu-dark">{attr.code}</span>
              {getStatusIcon(attr.status)}
            </div>
            <h4 className="font-semibold text-cgu-dark text-sm mb-1">{attr.name}</h4>
            <p className="text-xs text-cgu-dark/60 line-clamp-2">{attr.description}</p>
            <div className="mt-2 text-xs text-cgu-dark/50">
              {attr.issues.length} issue{attr.issues.length !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="bauhaus-card p-6">
        <h3 className="font-bold text-cgu-dark mb-4">Compass Overview</h3>
        <div className="compass-container">
          {['NW', 'N', 'NE', 'W', '', 'E', 'SW', 'S', 'SE'].map((code, i) => {
            if (code === '') {
              return (
                <div key={i} className="compass-cell compass-center">
                  AI
                </div>
              );
            }
            const attr = project.attributes.find(a => a.code === code);
            const statusColors: Record<string, string> = {
              green: 'bg-traffic-green/20 border-traffic-green',
              yellow: 'bg-traffic-yellow/20 border-traffic-yellow',
              red: 'bg-traffic-red/20 border-traffic-red',
              pending: 'bg-gray-100 border-gray-300'
            };
            return (
              <div
                key={code}
                onClick={() => onNavigate(code)}
                className={`compass-cell ${statusColors[attr?.status || 'pending']}`}
                title={attr?.name}
              >
                {code}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AttributeTab({
  project,
  attribute,
  onAddIssue,
  onUpdateIssue,
  onDeleteIssue,
  onAddMitigation,
  onUpdateMitigation,
  onDeleteMitigation,
  getStatusIcon
}: {
  project: Project;
  attribute: Attribute;
  onAddIssue: (attrId: number) => void;
  onUpdateIssue: (issueId: number, updates: Partial<Issue>) => void;
  onDeleteIssue: (issueId: number) => void;
  onAddMitigation: (issueId: number) => void;
  onUpdateMitigation: (mitId: number, updates: Partial<Mitigation>) => void;
  onDeleteMitigation: (mitId: number) => void;
  getStatusIcon: (status: string, size?: string) => JSX.Element;
}) {
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    const next = new Set(expandedIssues);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIssues(next);
  }

  function getScoreColor(score: number) {
    if (score >= 70) return 'text-traffic-green';
    if (score >= 40) return 'text-traffic-yellow';
    return 'text-traffic-red';
  }

  function getStatusFromScore(score: number): 'green' | 'yellow' | 'red' {
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
  }

  return (
    <div className="animate-fade-in">
      <div className="bauhaus-card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl font-black text-cgu-red">{attribute.code}</span>
              <h2 className="text-2xl font-bold text-cgu-dark">{attribute.name}</h2>
              {getStatusIcon(attribute.status, 'w-6 h-6')}
            </div>
            <p className="text-cgu-dark/70">{attribute.description}</p>
          </div>
          <button
            onClick={() => onAddIssue(attribute.id)}
            className="bauhaus-btn bg-cgu-green text-white px-4 py-2 flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Issue
          </button>
        </div>
      </div>

      {attribute.issues.length === 0 ? (
        <div className="bauhaus-card p-8 text-center">
          <p className="text-cgu-dark/60 mb-4">No issues or goals added yet.</p>
          <button
            onClick={() => onAddIssue(attribute.id)}
            className="bauhaus-btn bg-cgu-red text-white px-4 py-2"
          >
            Add Your First Issue
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {attribute.issues.map((issue) => (
            <div key={issue.id} className="bauhaus-card overflow-hidden">
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(issue.id)}
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(issue.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-cgu-dark">{issue.title}</h3>
                    {issue.description && (
                      <p className="text-sm text-cgu-dark/60 line-clamp-1">{issue.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getScoreColor(issue.score)}`}>
                        {issue.score}
                      </div>
                      <div className="text-xs text-cgu-dark/50">Score</div>
                    </div>
                    {(issue.status === 'yellow' || issue.status === 'red') && (
                      <span className="px-2 py-1 text-xs bg-cgu-red/10 text-cgu-red font-semibold rounded">
                        {issue.mitigations.length} mitigation{issue.mitigations.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {expandedIssues.has(issue.id) ? (
                      <ChevronUp className="w-5 h-5 text-cgu-dark/40" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-cgu-dark/40" />
                    )}
                  </div>
                </div>
              </div>

              {expandedIssues.has(issue.id) && (
                <div className="border-t-2 border-cgu-dark/10 p-4 bg-cgu-light/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-cgu-dark/60 uppercase mb-1">
                        Description
                      </label>
                      <textarea
                        value={issue.description}
                        onChange={(e) => onUpdateIssue(issue.id, { description: e.target.value })}
                        className="bauhaus-input w-full px-3 py-2 h-20 text-sm resize-none"
                        placeholder="Add details..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cgu-dark/60 uppercase mb-1">
                        Score (0-100)
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={issue.score}
                          onChange={(e) => {
                            const score = parseInt(e.target.value);
                            onUpdateIssue(issue.id, { 
                              score, 
                              status: getStatusFromScore(score) 
                            });
                          }}
                          className="flex-1"
                        />
                        <span className={`text-xl font-bold w-12 text-right ${getScoreColor(issue.score)}`}>
                          {issue.score}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-cgu-dark/50 mt-1">
                        <span>Red (&lt;40)</span>
                        <span>Yellow (40-69)</span>
                        <span>Green (70+)</span>
                      </div>
                    </div>
                  </div>

                  {(issue.status === 'yellow' || issue.status === 'red') && (
                    <div className="mt-4 border-t border-cgu-dark/10 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-cgu-dark text-sm">Mitigations</h4>
                        <button
                          onClick={() => onAddMitigation(issue.id)}
                          className="bauhaus-btn bg-cgu-green text-white px-3 py-1 text-xs flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Mitigation
                        </button>
                      </div>
                      
                      {issue.mitigations.length === 0 ? (
                        <p className="text-sm text-cgu-dark/60 italic">
                          No mitigations yet. Add mitigations to address this issue.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {issue.mitigations.map((mit) => (
                            <div key={mit.id} className="bg-white p-3 border border-cgu-dark/10">
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={mit.completed}
                                  onChange={(e) => onUpdateMitigation(mit.id, { completed: e.target.checked })}
                                  className="mt-1 w-4 h-4"
                                />
                                <div className="flex-1">
                                  <p className={`text-sm ${mit.completed ? 'line-through text-cgu-dark/40' : 'text-cgu-dark'}`}>
                                    {mit.description}
                                  </p>
                                  <div className="flex flex-wrap gap-3 mt-2">
                                    <input
                                      type="text"
                                      value={mit.owner}
                                      onChange={(e) => onUpdateMitigation(mit.id, { owner: e.target.value })}
                                      placeholder="Owner"
                                      className="bauhaus-input px-2 py-1 text-xs w-32"
                                    />
                                    <input
                                      type="date"
                                      value={mit.deadline || ''}
                                      onChange={(e) => onUpdateMitigation(mit.id, { deadline: e.target.value || null })}
                                      className="bauhaus-input px-2 py-1 text-xs"
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={() => onDeleteMitigation(mit.id)}
                                  className="text-traffic-red hover:bg-traffic-red/10 p-1 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-cgu-dark/10">
                    <button
                      onClick={() => onDeleteIssue(issue.id)}
                      className="bauhaus-btn bg-traffic-red text-white px-3 py-1 text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Issue
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

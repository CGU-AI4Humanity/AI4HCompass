import { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import Header from './components/Header';

interface User {
  id: number;
  email: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPasskey, setHasPasskey] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setHasPasskey(data.hasPasskey);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
      setUser(null);
      setHasPasskey(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cgu-light">
        <div className="bauhaus-card p-8">
          <div className="animate-pulse flex space-x-4">
            <div className="h-4 w-32 bg-cgu-red/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(u) => { setUser(u); checkAuth(); }} />;
  }

  return (
    <div className="min-h-screen bg-cgu-light">
      <Header user={user} hasPasskey={hasPasskey} onLogout={handleLogout} onPasskeyRegistered={() => setHasPasskey(true)} />
      <main className="container mx-auto px-4 py-6">
        <Switch>
          <Route path="/" component={() => <Dashboard />} />
          <Route path="/project/:id">
            {(params) => <ProjectView id={parseInt(params.id)} />}
          </Route>
        </Switch>
      </main>
    </div>
  );
}

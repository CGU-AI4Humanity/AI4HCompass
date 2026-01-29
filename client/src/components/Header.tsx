import { useState } from 'react';
import { useLocation } from 'wouter';
import { Compass, LogOut, Key, User as UserIcon } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';

interface HeaderProps {
  user: { id: number; email: string };
  hasPasskey: boolean;
  onLogout: () => void;
  onPasskeyRegistered: () => void;
}

export default function Header({ user, hasPasskey, onLogout, onPasskeyRegistered }: HeaderProps) {
  const [, setLocation] = useLocation();
  const [registering, setRegistering] = useState(false);

  async function handleRegisterPasskey() {
    setRegistering(true);
    try {
      const optionsRes = await fetch('/api/auth/passkey/register-options', {
        method: 'POST',
        credentials: 'include'
      });
      const options = await optionsRes.json();
      
      const credential = await startRegistration(options);
      
      const verifyRes = await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credential)
      });

      if (verifyRes.ok) {
        onPasskeyRegistered();
        alert('Passkey registered successfully!');
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      console.error('Passkey registration failed:', error);
      alert('Failed to register passkey. Your browser may not support this feature.');
    } finally {
      setRegistering(false);
    }
  }

  return (
    <header className="bg-cgu-red text-white border-b-4 border-cgu-dark">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => setLocation('/')}
          >
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Compass className="w-6 h-6 text-cgu-red" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">AI for Humanity Compass</h1>
              <p className="text-xs text-white/80">Claremont Graduate University</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded">
              <UserIcon className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">{user.email}</span>
            </div>

            {!hasPasskey && (
              <button
                onClick={handleRegisterPasskey}
                disabled={registering}
                className="bauhaus-btn bg-cgu-green text-white px-3 py-2 text-sm flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span className="hidden sm:inline">{registering ? 'Registering...' : 'Add Passkey'}</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="bauhaus-btn bg-white text-cgu-red px-3 py-2 text-sm flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

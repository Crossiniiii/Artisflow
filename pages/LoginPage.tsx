
import React, { useState } from 'react';
import { UserRole, UserAccount } from '../types';
import { ShieldCheck, LogIn, Lock, Mail } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

interface LoginPageProps {
  accounts: UserAccount[];
  onLogin: (account: UserAccount) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ accounts, onLogin }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const account = accounts.find(a => a.id === selectedId);
    if (account) {
      setIsAnimating(true);
      setTimeout(() => onLogin(account), 600);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      const result = await signInWithGoogle();
      const email = result.user.email;
      if (!email) {
        setError('Google account has no email.');
        return;
      }
      
      const account = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
      
      if (!account) {
        setError(`No staff profile matches this Google account (${email}). Please contact an administrator.`);
        return;
      }
      const updatedAccount: UserAccount = {
        ...account,
        lastLogin: new Date().toISOString()
      };
      setIsAnimating(true);
      setTimeout(() => onLogin(updatedAccount), 600);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const errorMessage = err?.code ? `Error: ${err.code}` : err?.message || 'Google sign-in failed.';
      setError(`Google sign-in failed. ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Art Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
      </div>

      <div className={`w-full max-w-md transition-all duration-700 transform ${isAnimating ? 'scale-95 opacity-0 blur-lg' : 'scale-100 opacity-100'}`}>
        <div className="text-center mb-12">
          <h1 className="text-5xl font-serif italic text-white tracking-tighter mb-2">ArtisFlow</h1>
          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.4em]">Gallery Management Suite</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-4 border border-white/10">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Personnel Authentication</h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">Please select your staff profile to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <select
                  required
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none transition-all hover:bg-white/10"
                >
                  <option value="" className="bg-slate-900">Select User Profile</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} className="bg-slate-900">
                      {acc.name} — {acc.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input 
                  type="password"
                  disabled
                  placeholder="Password (Managed by Directory)"
                  className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-slate-500 cursor-not-allowed"
                  value="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedId}
              className="w-full flex items-center justify-center space-x-3 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-slate-950 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 group transform hover:-translate-y-0.5"
            >
              <span>Initialize Session</span>
              <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center space-x-3 py-3 bg-white text-slate-900 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-slate-100 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <span>Sign in with Google</span>
            </button>
          </div>

          {error && (
            <p className="mt-4 text-xs text-rose-400 text-center font-medium">
              {error}
            </p>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center space-x-6">
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Encrypted</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Audit Log</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Verified</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>
             </div>
          </div>
        </div>
        
        <p className="text-center text-slate-500 text-[10px] mt-10 font-bold uppercase tracking-[0.2em]">
          Internal Access Only &copy; 2024 ArtisFlow Systems
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

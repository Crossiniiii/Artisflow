import React, { useState } from 'react';
import { UserAccount } from '../types';
import { Shield, LogIn, Lock, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import AnimatedBackground from '../components/AnimatedBackground';
import LoadingArtBackground from '../components/LoadingArtBackground';

interface LoginPageProps {
  accounts: UserAccount[];
  onLogin: (account: UserAccount) => void;
  isLoading?: boolean;
  loadingMessage?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ accounts, onLogin, isLoading, loadingMessage }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const account = accounts.find(a => a.id === selectedId);
    if (account) {
      setIsAnimating(true);
      setError(null);

      try {
        // Delegate all auth and profile logic to the onLogin handler (AuthContext)
        await onLogin(account);
      } catch (err: any) {
        console.error("Auth process error:", err);
        setError(err.message || "Authentication failed. Please check your connection.");
        setIsAnimating(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      
      // Note: Full migration logic for Google Auth would happen in the AuthContext onAuthStateChange 
      // or after redirect since signInWithOAuth is a redirect-based flow in the browser.
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(`Google sign-in failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {isLoading ? <LoadingArtBackground /> : <AnimatedBackground />}
      <div className={`w-full max-w-md transition-all duration-700 transform ${isAnimating ? 'scale-95 opacity-0 blur-lg' : 'scale-100 opacity-100'} relative z-10`}>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif italic text-neutral-900 tracking-tighter mb-2">Galerie Joaquin</h1>
          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.4em]">Inventory System</p>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-10 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-neutral-900/20">
              <Shield size={32} />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Personnel Authentication</h2>
            <p className="text-xs text-neutral-500 mt-2 font-medium">Please select your staff profile to continue</p>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
              <Loader2 size={40} className="text-neutral-900 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-neutral-900 tracking-tight">
                  {loadingMessage || "Synchronizing"}
                </p>
                <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-widest">
                  {loadingMessage ? "Finalizing Session Data" : "Securing Database Connection"}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    <Mail size={18} />
                  </div>
                  <select
                    required
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    disabled={isLoading}
                    className="block w-full pl-11 pr-4 py-4 bg-white/50 border border-neutral-200 rounded-2xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300 appearance-none transition-all hover:bg-white/80 disabled:opacity-50 disabled:cursor-wait"
                  >
                    <option value="" className="bg-white text-neutral-400">
                      Select User Profile
                    </option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id} className="bg-white text-neutral-900">
                        {acc.name} — {acc.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    disabled
                    placeholder="Password (Managed by Directory)"
                    className="block w-full pl-11 pr-4 py-4 bg-white/50 border border-neutral-200 rounded-2xl text-sm text-neutral-400 cursor-not-allowed"
                    value="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedId}
                className="w-full flex items-center justify-center space-x-3 py-4 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-neutral-900/20 group transform hover:-translate-y-0.5"
              >
                <span>Initialize Session</span>
                <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          {!isLoading && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center space-x-3 py-3 bg-white text-neutral-900 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-neutral-50 border border-neutral-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 text-xs text-red-600 text-center font-medium bg-red-50 p-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <div className="mt-8 pt-8 border-t border-neutral-200/60 flex items-center justify-center space-x-6">
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">Encrypted</span>
              <div className="relative w-2 h-2 mt-1">
                <span className="absolute inset-0 rounded-full bg-neutral-900"></span>
                <span className="absolute inset-0 rounded-full bg-neutral-900 opacity-20 animate-ping"></span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">Audit Log</span>
              <div className="relative w-2 h-2 mt-1">
                <span className="absolute inset-0 rounded-full bg-neutral-700"></span>
                <span className="absolute inset-0 rounded-full bg-neutral-700 opacity-20 animate-ping [animation-delay:75ms]"></span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">Verified</span>
              <div className="relative w-2 h-2 mt-1">
                <span className="absolute inset-0 rounded-full bg-neutral-500"></span>
                <span className="absolute inset-0 rounded-full bg-neutral-500 opacity-20 animate-ping [animation-delay:150ms]"></span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-neutral-400 text-[10px] mt-10 font-bold uppercase tracking-[0.2em]">
          Internal Access Only &copy; 2026 Galerie Joaquin
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

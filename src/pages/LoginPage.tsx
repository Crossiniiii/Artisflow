import React, { useState } from 'react';
import { UserAccount, Artwork } from '../types';
import { Shield, LogIn, Lock, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import AnimatedBackground from '../components/AnimatedBackground';
import LoadingArtBackground from '../components/LoadingArtBackground';

interface LoginPageProps {
  accounts: UserAccount[];
  artworks: Artwork[];
  onLogin: (account: UserAccount) => void;
  isLoading?: boolean;
  loadingMessage?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ accounts, artworks, onLogin, isLoading, loadingMessage }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const account = accounts.find(a => a.id === selectedId);
    if (account) {
      if (account.password && password !== account.password) {
        setError("Invalid password. Please check your credentials.");
        return;
      }
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

  const selectedAccount = accounts.find(a => a.id === selectedId);
  const hasPasswordSet = !!selectedAccount?.password;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {isLoading ? <LoadingArtBackground /> : <AnimatedBackground artworks={artworks} />}
      <div className={`w-full max-w-md transition-all duration-700 transform ${isAnimating ? 'scale-95 opacity-0 blur-lg' : 'scale-100 opacity-100'} relative z-10`}>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif italic text-neutral-900 tracking-tighter mb-2">Galerie Joaquin</h1>
          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.4em]">Inventory System</p>
        </div>

        <div className="bg-white/82 backdrop-blur-xl border border-neutral-200/80 rounded-md p-10 shadow-[0_24px_70px_rgba(0,0,0,0.14)] ring-1 ring-white/70">
          <div className="mb-8 text-center">
            <div className="w-14 h-14 bg-neutral-900 rounded-sm flex items-center justify-center text-white mx-auto mb-5 shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
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
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      setPassword('');
                      setError(null);
                    }}
                    disabled={isLoading}
                    className="block w-full pl-11 pr-4 py-3.5 bg-white/88 border border-neutral-300 rounded-sm text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] appearance-none transition-all hover:bg-white hover:border-neutral-400 disabled:opacity-50 disabled:cursor-wait"
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
                    required={hasPasswordSet}
                    placeholder={
                      !selectedId
                        ? "Select a profile first"
                        : hasPasswordSet
                        ? "Enter your password"
                        : "Password (No password set for this profile)"
                    }
                    disabled={isLoading || !selectedId || !hasPasswordSet}
                    className={`block w-full pl-11 pr-4 py-3.5 border rounded-sm text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] ${
                      !selectedId || !hasPasswordSet
                        ? "bg-white/70 border-neutral-300 text-neutral-400 cursor-not-allowed"
                        : "bg-white/88 border-neutral-300 text-neutral-900 hover:bg-white hover:border-neutral-400"
                    }`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedId}
                className="w-full flex items-center justify-center space-x-3 py-3.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 text-white rounded-sm font-black text-sm uppercase tracking-widest transition-all shadow-[0_10px_22px_rgba(0,0,0,0.16)] group"
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
                className="w-full flex items-center justify-center space-x-3 py-3 bg-white text-neutral-900 rounded-sm font-bold text-xs uppercase tracking-widest transition-all hover:bg-neutral-50 border border-neutral-300 shadow-sm"
              >
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 text-xs text-red-600 text-center font-medium bg-red-50 p-2 rounded-sm border border-red-100">
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

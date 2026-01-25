
import React from 'react';
import { UserAccount, ActivityLog, UserRole } from '../types';
import { X, Mail, ShieldCheck, Clock, Award, Briefcase, Activity } from 'lucide-react';

interface ProfileModalProps {
  user: UserAccount;
  logs: ActivityLog[];
  salesCount: number;
  inventoryCount: number;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, logs, salesCount, inventoryCount, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="relative h-32 bg-slate-900 overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:scale-105 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-10 pb-10 relative">
          {/* Avatar Monogram */}
          <div className="absolute -top-12 left-10 w-24 h-24 bg-white rounded-[2rem] p-1.5 shadow-xl">
            <div className="w-full h-full bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-3xl font-black text-emerald-400">
              {user.name.charAt(0)}
            </div>
          </div>

          <div className="pt-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h2>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1.5 text-slate-500 text-sm font-medium">
                  <Mail size={14} className="opacity-50" />
                  <span>{user.email}</span>
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{user.role}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            <StatCard 
              label="Session ID" 
              value={user.id.toUpperCase()} 
              icon={<ShieldCheck size={18}/>} 
              color="text-slate-800" 
            />
            {user.role === UserRole.SALES_AGENT || user.role === UserRole.ADMIN ? (
              <StatCard 
                label="Sales Closed" 
                value={salesCount} 
                icon={<Award size={18}/>} 
                color="text-amber-600" 
              />
            ) : (
              <StatCard 
                label="Art Registered" 
                value={inventoryCount} 
                icon={<Briefcase size={18}/>} 
                color="text-blue-600" 
              />
            )}
            <StatCard 
              label="System Logs" 
              value={logs.length} 
              icon={<Activity size={18}/>} 
              color="text-emerald-600" 
            />
          </div>

          <div className="mt-10 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center">
              <Clock size={12} className="mr-2" /> Recent Authorized Activity
            </h3>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                {logs.length > 0 ? logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between group hover:bg-white transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{log.action}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{log.details || 'System event recorded'}</p>
                    </div>
                    <time className="text-[9px] font-bold text-slate-300">{new Date(log.timestamp).toLocaleDateString()}</time>
                  </div>
                )) : (
                  <div className="p-8 text-center">
                    <p className="text-xs font-medium text-slate-400 italic">No activity logs recorded for this session.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Encrypted Personnel Connection</span>
            </div>
            <button className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest">
              Security Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) => (
  <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl flex flex-col justify-between h-28 hover:border-slate-200 transition-colors">
    <div className={`p-2 rounded-xl bg-white border border-slate-100 shadow-sm w-fit ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-lg font-black text-slate-900 leading-tight">{value}</p>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  </div>
);

export default ProfileModal;

import React from 'react';
import { ChevronDown } from 'lucide-react';

export const ActionButton: React.FC<{ label: string, icon: React.ReactNode, variant?: string, disabled?: boolean, onClick: () => void }> = React.memo(({ label, icon, variant, disabled, onClick }) => {
  const styles = {
    default: 'bg-white hover:bg-neutral-50 text-neutral-900 border-neutral-200 shadow-sm',
    amber: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
    yellow: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
    indigo: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm',
    rose: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
    slate: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
    neutral: 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 shadow-sm',
  };
  const activeStyle = variant ? styles[variant as keyof typeof styles] : styles.default;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`relative z-10 w-full flex items-center justify-between px-5 py-3 rounded-xl font-bold text-[13px] border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 ${activeStyle}`}
    >
      <div className="flex items-center space-x-3.5">
        <span className="text-neutral-500 group-hover:text-neutral-900 transition-colors">{icon}</span>
        <span className="truncate tracking-tight">{label}</span>
      </div>
      <ChevronDown className="w-4 h-4 opacity-20 flex-shrink-0 -rotate-90" />
    </button>
  );
});

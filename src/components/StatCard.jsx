import React from 'react';

const StatCard = ({ label, value, icon: Icon, color, trend }) => {
  return (
    <div className="premium-card p-10 flex items-center gap-10 relative overflow-hidden group border-none shadow-[0_20px_50px_rgba(0,0,0,0.02)] hover:shadow-primary/10">
      <div className={`absolute -right-4 -bottom-4 w-32 h-32 ${color} opacity-[0.05] rounded-full blur-3xl group-hover:opacity-[0.15] transition-opacity duration-700`}></div>
      <div className="relative z-10 w-24 h-24 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
        <div className={`absolute inset-0 ${color.replace('bg-', 'bg-')} opacity-20 blur-2xl rounded-full`}></div>
        <Icon className={`w-12 h-12 ${color.replace('bg-', 'text-')} relative z-10 drop-shadow-lg`} />
      </div>
      <div className="relative z-10">
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mb-2">{label}</p>
        <div className="flex items-baseline gap-3">
           <h3 className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{value}</h3>
           {trend && (
             <span className={`pill-badge ${trend > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} shadow-none border border-current/10`}>
               {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
             </span>
           )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;

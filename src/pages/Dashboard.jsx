import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import { getStats, getLeads, getCallbacks } from '../api';
import { UserPlus, PhoneCall, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { formatSlug } from '../utils';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_contacts: 0,
    total_leads: 0,
    pending_callbacks: 0,
    new_leads: 0,
    total_messages: 0,
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leadsRes] = await Promise.all([
          getStats(),
          getLeads({ limit: 10, offset: 0 })
        ]);
        setStats(statsRes.data || { total_contacts: 0, total_leads: 0, pending_callbacks: 0, new_leads: 0, total_messages: 0 });
        // Correctly parse paginated response and show all statuses including converted
        const leadsArray = leadsRes.data?.data || leadsRes.data || [];
        setRecentLeads(Array.isArray(leadsArray) ? leadsArray.slice(0, 10) : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Initializing Dashboard...</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-14 max-w-[1700px] mx-auto animate-in h-full flex flex-col min-h-0">
      {/* Hero Section - Compact */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Control Panel</span>
            </div>
            <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-green-600 uppercase">Live</span>
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
            Real-time <span className="bg-gradient-to-r from-primary via-indigo-500 to-secondary bg-clip-text text-transparent">Operations</span>
          </h1>
        </div>

        <div className="hidden lg:flex bg-[#020617] p-5 rounded-[25px] shadow-2xl shadow-primary/10 items-center gap-8 border border-white/5">
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mb-1">Health</p>
            <h4 className="text-xl font-black text-white tracking-tight leading-none">99.9%</h4>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mb-1">Status</p>
            <h4 className="text-xl font-black text-white tracking-tight italic leading-none">ACTIVE</h4>
          </div>
        </div>
      </div>

      {/* Main Stats - Distributed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
        <StatCard
          label="New Leads"
          value={stats.new_leads}
          icon={UserPlus}
          color="bg-primary"
        />
        <StatCard
          label="Callbacks"
          value={stats.pending_callbacks}
          icon={PhoneCall}
          color="bg-amber-500"
        />
        <StatCard
          label="Bot Contacts"
          value={stats.total_contacts}
          icon={Users}
          color="bg-indigo-500"
        />
        <StatCard
          label="Messages"
          value={stats.total_messages}
          icon={MessageSquare}
          color="bg-cyan-500"
        />
      </div>

      {/* Primary Data Area - Flex Fill */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0 overflow-hidden">
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4 px-4 shrink-0">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter">Current Stream</h2>
            <div className="h-px flex-1 mx-8 bg-slate-100"></div>
          </div>
          <div className="premium-card flex-1 overflow-hidden border-none bg-white flex flex-col min-h-0 shadow-sm">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50/80 backdrop-blur-md">
                    <th className="px-10 py-5">ID</th>
                    <th className="px-10 py-5">Identity</th>
                    <th className="px-10 py-5">Status</th>
                    <th className="px-10 py-5 text-right">Time Stamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {recentLeads.map((lead, idx) => {
                    const statusConfig = {
                      new:         { dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
                      called:      { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
                      in_progress: { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-100' },
                      converted:   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                    };
                    const cfg = statusConfig[lead.status] || statusConfig.new;
                    return (
                      <tr key={lead.id || idx} className="group hover:bg-slate-50/50 transition-all duration-300">
                        <td className="px-10 py-5 text-[10px] font-black text-slate-400 group-hover:text-primary transition-colors uppercase">#ASK-{String(lead.id || idx + 1).padStart(3, '0')}</td>
                        <td className="px-10 py-5">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-sm tracking-tight capitalize">{lead.name ? formatSlug(lead.name) : 'Anonymous'}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">{lead.company || lead.phone || 'Private'}</span>
                          </div>
                        </td>
                        <td className="px-10 py-5">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${cfg.badge}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></div>
                            {lead.status === 'in_progress' ? 'In Progress' : (lead.status || 'new')}
                          </div>
                        </td>
                        <td className="px-10 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest tabular-nums">
                          {lead.created_at ? format(new Date(lead.created_at), 'dd MMM, hh:mm a') : '--:--'}
                        </td>
                      </tr>
                    );
                  })}
                  {recentLeads.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-10 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-2 border-slate-100 border-t-primary rounded-full animate-spin"></div>
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Awaiting Live Data...</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col min-h-0 space-y-6">
          <div className="premium-card flex-1 p-8 border-none shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] rounded-full -mr-16 -mt-16"></div>

            <div className="space-y-8">
              <h2 className="text-xl font-black text-slate-900 tracking-tighter relative z-10">Operational Flow</h2>
              <div className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Bot Efficiency</span>
                    <span className="text-sm font-black text-primary">94%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Response Delay</span>
                    <span className="text-sm font-black text-secondary">0.8s</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-secondary to-cyan-400 rounded-full" style={{ width: '88%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            {/* 
              <div className="bg-slate-900 p-6 rounded-[25px] shadow-xl shadow-primary/10 relative z-10 mt-6">
                 <div className="flex items-center gap-4 mb-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                       <TrendingUp className="text-primary w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">Bot Insight</span>
                 </div>
                 <p className="text-[10px] font-bold text-slate-300 leading-tight">
                    Lead retention is currently <span className="text-green-400 font-black">+42%</span> above baseline.
                 </p>
              </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

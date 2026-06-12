import React, { useState, useEffect } from 'react';
import { getCallbacks, markCallbackDone } from '../api';
import { format } from 'date-fns';
import { formatSlug } from '../utils';

const Callbacks = () => {
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallbacks();
  }, []);

  const fetchCallbacks = async () => {
    try {
      const resp = await getCallbacks();
      setCallbacks(resp.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id) => {
    try {
      await markCallbackDone(id);
      setCallbacks(callbacks.map(c => c.id === id ? { ...c, status: 'completed' } : c));
    } catch (err) {
      alert('Update failed');
    }
  };

  return (
    <div className="p-10 lg:p-14 max-w-[1800px] mx-auto animate-in h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      <div className="flex justify-between items-end mb-12 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-600">Callbacks</span>
             </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
             Pending <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">Callbacks</span>
          </h1>
        </div>
        <div className="text-right">
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Unresolved</span>
           <span className="text-3xl font-black text-amber-500 tracking-tighter tabular-nums">
             {callbacks.filter(c => c.status === 'pending').length}
           </span>
        </div>
      </div>

      <div className="premium-card flex-1 overflow-hidden bg-white shadow-sm border-none flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50/80 backdrop-blur-md">
                <th className="px-10 py-6">Requestor</th>
                <th className="px-10 py-6">Status</th>
                <th className="px-10 py-6">Request Time</th>
                <th className="px-10 py-6 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {callbacks.map((callback, idx) => (
                <tr key={callback.id || idx} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-10 py-8">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-sm tracking-tight capitalize">{callback.name ? formatSlug(callback.name) : 'Awaiting Profile'}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">+{callback.phone}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                     <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${callback.status === 'pending' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-green-500'}`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${callback.status === 'pending' ? 'text-amber-600' : 'text-green-600'}`}>
                           {callback.status}
                        </span>
                     </div>
                  </td>
                  <td className="px-10 py-8 text-[10px] font-black text-slate-600 uppercase tracking-widest tabular-nums font-mono">
                    {callback.created_at ? format(new Date(callback.created_at), 'MMM d, HH:mm') : '--:--'}
                  </td>
                  <td className="px-10 py-8 text-right">
                    {callback.status === 'pending' ? (
                      <button 
                        onClick={() => handleUpdateStatus(callback.id)}
                        className="bg-slate-900 hover:bg-primary text-white text-[9px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95"
                      >
                        Resolve Task
                      </button>
                    ) : (
                       <span className="text-[9px] font-black uppercase tracking-[0.2em] text-green-500">Operation Sync</span>
                    )}
                  </td>
                </tr>
              ))}
              {callbacks.length === 0 && !loading && (
                <tr>
                  <td colSpan="4" className="px-10 py-20 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">All callback requests resolved</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Callbacks;

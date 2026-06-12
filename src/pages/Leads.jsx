import React, { useState, useEffect } from 'react';
import { getLeads, updateLeadStatus } from '../api';
import { format } from 'date-fns';
import { formatSlug } from '../utils';
import Modal from '../components/Modal';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'expert', 'quote'
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchLeads();
  }, [page]);

  const fetchLeads = async () => {
    try {
      const resp = await getLeads({ 
        limit: 10, 
        offset: page * 10 
      });
      setLeads(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateLeadStatus(id, newStatus);
      setModal({
        open: true,
        title: 'Status Updated! ⚡',
        message: `Lead status has been successfully updated to ${newStatus.replace('_', ' ')}.`,
        type: 'success'
      });
      fetchLeads(); // Refresh list
    } catch (err) {
      setModal({
        open: true,
        title: 'Update Failed',
        message: 'Could not synchronize status with the database. Please try again.',
        type: 'error'
      });
    }
  };

  const filteredLeads = leads.filter(l => {
    if (activeTab === 'all') return true;
    const req = l.requirement?.toLowerCase() || '';
    const isExpert = req.includes('request:') || 
                    req.includes('quotation:') ||
                    req.includes('query:') ||
                    req.includes(': ');
    
    if (activeTab === 'expert') return isExpert;
    if (activeTab === 'quote') return !isExpert && req !== '';
    return true;
  });

  const handleRefresh = () => {
    setLoading(true);
    fetchLeads();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'called': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'in_progress': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'converted': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="p-10 lg:p-14 max-w-[1800px] mx-auto animate-in h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      <Modal 
        isOpen={modal.open} 
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
      <div className="flex justify-between items-end mb-12 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Leads Management</span>
             </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
             Business <span className="bg-gradient-to-r from-primary via-indigo-500 to-secondary bg-clip-text text-transparent">Pipeline</span>
          </h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            {['all', 'expert', 'quote'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="text-right ml-4">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Pipeline</span>
             <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{filteredLeads.length}</span>
          </div>
        </div>
      </div>

      <div className="premium-card flex-1 overflow-hidden bg-white shadow-sm border-none flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50/80 backdrop-blur-md">
                <th className="px-10 py-6">Identity & Contact</th>
                <th className="px-10 py-6">Organization</th>
                <th className="px-10 py-6">Requirement</th>
                <th className="px-10 py-6">Status</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredLeads.map((lead, idx) => (
                <tr key={lead.id || idx} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-10 py-8">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-sm tracking-tight capitalize">{lead.name ? formatSlug(lead.name) : 'Anonymous'}</span>
                      <span className="text-[11px] text-primary font-black uppercase tracking-widest mt-1">
                        {lead.contact_phone ? `📞 ${lead.contact_phone}` : `📱 +${lead.phone}`}
                      </span>
                      {lead.contact_phone && (
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">Origin: +{lead.phone}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-sm font-semibold text-slate-600 uppercase tracking-tight">{lead.company ? formatSlug(lead.company) : 'N/A'}</td>
                  <td className="px-10 py-8">
                    <p className="text-xs text-slate-600 font-medium max-w-md leading-relaxed">{lead.requirement || 'General Inquiry'}</p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">
                       {lead.created_at ? format(new Date(lead.created_at), 'MMM d, HH:mm') : '--:--'}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    <span className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusColor(lead.status)}`}>
                      {lead.status || 'new'}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex gap-2 justify-end transition-opacity">
                      {lead.status === 'new' && (
                        <button 
                          onClick={() => handleStatusUpdate(lead.id, 'called')}
                          className="px-3 py-1 bg-amber-500 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20"
                        >
                          Mark Called
                        </button>
                      )}
                      {(lead.status === 'new' || lead.status === 'called') && (
                        <button 
                          onClick={() => handleStatusUpdate(lead.id, 'in_progress')}
                          className="px-3 py-1 bg-purple-500 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-purple-600 shadow-lg shadow-purple-500/20"
                        >
                          Progress
                        </button>
                      )}
                      {lead.status !== 'converted' && (
                        <button 
                          onClick={() => handleStatusUpdate(lead.id, 'converted')}
                          className="px-3 py-1 bg-emerald-500 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                        >
                          Convert
                        </button>
                      )}
                    </div>
                    {lead.status === 'converted' && (
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">✨ Deal Closed</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-10 py-20 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No leads in this pipeline</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {total > 10 && (
          <div className="shrink-0 px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
               Showing Page <span className="text-slate-900">{page + 1}</span> of {Math.ceil(total / 10)}
            </span>
            <div className="flex gap-6 items-center">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary disabled:opacity-30 transition-all"
              >
                Previous
              </button>
              <span className="w-px h-4 bg-slate-200" />
              <button
                disabled={(page + 1) * 10 >= total}
                onClick={() => setPage(page + 1)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leads;

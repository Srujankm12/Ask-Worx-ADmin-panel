import React, { useState, useEffect } from 'react';
import { getLeads, updateLeadStatus } from '../api';
import { format } from 'date-fns';
import { formatSlug } from '../utils';
import Modal from '../components/Modal';

// Status → badge classes, on the same shared primary/warning/success tokens
// used in Campaigns.jsx, so status meaning reads the same across pages.
// Should live in one shared file (e.g. constants/status.js) rather than
// being duplicated per-page — flagging again, still not part of this pass.
const statusConfig = {
  new: {
    badge: 'bg-primary-light text-primary',
    label: 'New',
  },
  called: {
    badge: 'bg-warning-light text-warning',
    label: 'Called',
  },
  in_progress: {
    badge: 'bg-primary text-white',
    label: 'In progress',
  },
  converted: {
    badge: 'bg-success-light text-success',
    label: 'Converted',
  },
};

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
        title: 'Status updated',
        message: `Lead status has been successfully updated to ${newStatus.replace('_', ' ')}.`,
        type: 'success'
      });
      fetchLeads(); // Refresh list
    } catch (err) {
      setModal({
        open: true,
        title: 'Update failed',
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

  const getStatusBadge = (status) => (statusConfig[status] || statusConfig.new).badge;
  const getStatusLabel = (status) => (statusConfig[status] || statusConfig.new).label;

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
             <div className="px-3 py-1 bg-primary-light rounded-full">
                <span className="text-[10px] font-medium uppercase tracking-widest text-primary">Leads Management</span>
             </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight leading-none">
             Business Pipeline
          </h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="bg-background p-1 rounded-lg flex gap-1 border border-border">
            {['all', 'expert', 'quote'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-[10px] font-medium uppercase tracking-widest transition-colors ${
                  activeTab === tab ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="text-right ml-4">
             <span className="text-[10px] font-medium uppercase tracking-widest text-text-secondary block mb-1">Active Pipeline</span>
             <span className="text-3xl font-semibold text-text-primary tracking-tight tabular-nums">{filteredLeads.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white shadow-card border border-border rounded-lg flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-text-secondary text-[10px] font-medium uppercase tracking-widest bg-background border-b border-border">
                <th className="px-10 py-6">Identity & Contact</th>
                <th className="px-10 py-6">Organization</th>
                <th className="px-10 py-6">Requirement</th>
                <th className="px-10 py-6">Status</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLeads.map((lead, idx) => (
                <tr key={lead.id || idx} className="group hover:bg-background transition-colors">
                  <td className="px-10 py-8">
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-primary text-sm tracking-tight capitalize">{lead.name ? formatSlug(lead.name) : 'Anonymous'}</span>
                      <span className="text-[11px] text-primary font-medium uppercase tracking-widest mt-1">
                        {lead.contact_phone ? lead.contact_phone : `+${lead.phone}`}
                      </span>
                      {lead.contact_phone && (
                        <span className="text-[8px] text-text-secondary font-medium uppercase tracking-tight">Origin: +{lead.phone}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-sm font-medium text-text-secondary uppercase tracking-tight">{lead.company ? formatSlug(lead.company) : 'N/A'}</td>
                  <td className="px-10 py-8">
                    <p className="text-xs text-text-secondary font-normal max-w-md leading-relaxed">{lead.requirement || 'General Inquiry'}</p>
                    <span className="text-[9px] font-medium text-text-secondary uppercase tracking-widest mt-2 block">
                       {lead.created_at ? format(new Date(lead.created_at), 'MMM d, HH:mm') : '--:--'}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-medium uppercase tracking-widest ${getStatusBadge(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex gap-2 justify-end transition-opacity">
                      {lead.status === 'new' && (
                        <button 
                          onClick={() => handleStatusUpdate(lead.id, 'called')}
                          className="px-3 py-1 bg-warning text-white rounded text-[9px] font-medium uppercase tracking-widest hover:opacity-90 transition-opacity"
                        >
                          Mark Called
                        </button>
                      )}
                      {(lead.status === 'new' || lead.status === 'called') && (
                        <button 
                          onClick={() => handleStatusUpdate(lead.id, 'in_progress')}
                          className="px-3 py-1 bg-primary text-white rounded text-[9px] font-medium uppercase tracking-widest hover:bg-primary-hover transition-colors"
                        >
                          Progress
                        </button>
                      )}
                      {lead.status !== 'converted' && (
                        <button 
                          onClick={() => handleStatusUpdate(lead.id, 'converted')}
                          className="px-3 py-1 bg-success text-white rounded text-[9px] font-medium uppercase tracking-widest hover:opacity-90 transition-opacity"
                        >
                          Convert
                        </button>
                      )}
                    </div>
                    {lead.status === 'converted' && (
                      <span className="text-[9px] font-medium text-success uppercase tracking-widest">Deal Closed</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-10 py-20 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">No leads in this pipeline</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {total > 10 && (
          <div className="shrink-0 px-10 py-6 bg-background border-t border-border flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">
               Showing Page <span className="text-text-primary font-semibold">{page + 1}</span> of {Math.ceil(total / 10)}
            </span>
            <div className="flex gap-6 items-center">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="text-[10px] font-medium uppercase tracking-widest text-text-secondary hover:text-primary disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="w-px h-4 bg-border" />
              <button
                disabled={(page + 1) * 10 >= total}
                onClick={() => setPage(page + 1)}
                className="text-[10px] font-medium uppercase tracking-widest text-text-secondary hover:text-primary disabled:opacity-40 transition-colors"
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
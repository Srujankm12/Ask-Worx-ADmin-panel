import React, { useState, useEffect } from 'react';
import { getEmployees, sendAnnouncement, getRemindersHistory } from '../api';
import { Megaphone, Send, Users, ShieldAlert, History } from 'lucide-react';
import Modal from '../components/Modal';
import { format } from 'date-fns';

const Announcements = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhones, setSelectedPhones] = useState([]);
  const [message, setMessage] = useState('');

  // Modal State
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });

  // Broadcast history — we reuse reminders history for the audit trail
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchEmployees = async () => {
    try {
      const resp = await getEmployees({ limit: 100 });
      setEmployees(resp.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const resp = await getRemindersHistory({
        limit: 5,
        offset: page * 5
      });
      setHistory(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (phone) => {
    if (selectedPhones.includes(phone)) {
      setSelectedPhones(selectedPhones.filter(p => p !== phone));
    } else {
      setSelectedPhones([...selectedPhones, phone]);
    }
  };

  const selectAll = () => {
    if (selectedPhones.length === employees.length) {
      setSelectedPhones([]);
    } else {
      setSelectedPhones(employees.map(e => e.phone));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message) return;
    setLoading(true);
    try {
      await sendAnnouncement({ message, phones: selectedPhones });
      setModal({
        open: true,
        title: 'Broadcast Launched! 🚀',
        message: 'Your official announcement is now being pushed to the team via WhatsApp.',
        type: 'success'
      });
      setMessage('');
      setSelectedPhones([]);
      // Refresh history after short delay to allow backend to process
      setTimeout(() => fetchHistory(), 2000);
    } catch (err) {
      setModal({
        open: true,
        title: 'Launch Failed',
        message: 'We encountered an error while attempting the broadcast. Please check your connection.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 lg:p-14 max-w-[1400px] mx-auto animate-in flex flex-col gap-12 overflow-y-auto no-scrollbar pb-20">
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      <div className="flex justify-between items-end shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="px-3 py-1 bg-purple-500/10 rounded-full border border-purple-500/20">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-600">Global Communication</span>
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
            Team <span className="bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">Announcements</span>
          </h1>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Target Audience</span>
          <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">
            {selectedPhones.length > 0 ? selectedPhones.length : employees.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 shrink-0">
        <div className="lg:col-span-5 flex flex-col h-[500px]">
          <div className="bg-slate-900 rounded-[40px] p-8 flex flex-col flex-1 overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Select Recipients</h3>
              <button
                onClick={selectAll}
                className="text-[9px] font-black text-purple-400 uppercase tracking-widest hover:text-white transition-all underline underline-offset-4"
              >
                {selectedPhones.length === employees.length ? 'Deselect All' : 'Select All Team'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => toggleSelect(emp.phone)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedPhones.includes(emp.phone)
                      ? 'bg-purple-500/10 border-purple-500/40'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${selectedPhones.includes(emp.phone) ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/40'}`}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-xs font-bold tracking-tight ${selectedPhones.includes(emp.phone) ? 'text-white' : 'text-slate-400'}`}>{emp.name}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedPhones.includes(emp.phone) ? 'bg-purple-500 border-purple-500' : 'border-white/10'
                    }`}>
                    {selectedPhones.includes(emp.phone) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
              {employees.length === 0 && (
                <div className="py-16 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No employees registered</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-8 h-[500px]">
          <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-4 mb-8 shrink-0">
              <div className="p-4 bg-purple-50 rounded-2xl text-purple-500">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 tracking-tight leading-none mb-1">Broadcast Message</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ASKworX Official Channel</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[32px] px-8 py-8 text-sm font-semibold text-slate-800 focus:border-purple-500 focus:outline-none transition-all placeholder:text-slate-300 flex-1 resize-none"
                placeholder="Write your announcement here... (Supports emojis ✨)"
              />

              <div className="mt-8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-amber-500 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Instant WhatsApp Push</span>
                </div>
                <button
                  type="submit"
                  disabled={loading || !message}
                  className="bg-slate-900 text-white px-10 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] flex items-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-slate-900/40 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Broadcasting...' : 'Launch Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Sent History Section */}
      <div className="shrink-0 bg-slate-50/50 rounded-[40px] p-10 border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-500">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Communication History</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit trail of all sent notifications</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] py-20 flex text-center">
              <div className="mx-auto">
                <Megaphone className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">No sent communications found</p>
              </div>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between gap-8 group hover:border-purple-200 transition-all">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-purple-50 group-hover:text-purple-500 transition-colors">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-black text-slate-900 truncate">{item.name}</span>
                      <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest ${
                        item.status === 'sent' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>{item.status}</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 line-clamp-1">{item.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-black text-slate-900 mb-0.5 tabular-nums">
                    {format(new Date(item.due_at), 'dd MMM yyyy')}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest tabular-nums">
                    {format(new Date(item.due_at), 'hh:mm a')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {total > 5 && (
          <div className="flex justify-center items-center gap-6 mt-10">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-purple-600 disabled:opacity-30 transition-all"
            >
              Previous
            </button>
            <span className="text-xs font-black text-slate-900 tabular-nums">
              {page + 1} <span className="text-slate-300 mx-1">/</span> {Math.ceil(total / 5)}
            </span>
            <button
              disabled={(page + 1) * 5 >= total}
              onClick={() => setPage(page + 1)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-purple-600 disabled:opacity-30 transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;

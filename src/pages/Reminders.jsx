import React, { useState, useEffect } from 'react';
import { getEmployees, createReminder, getRemindersHistory } from '../api';
import { Clock, Send, User, Calendar, CheckCircle2, Timer, History } from 'lucide-react';
import Modal from '../components/Modal';
import { format } from 'date-fns';

const Reminders = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    desc: '',
    due: ''
  });
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });

  // History state
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [historyPage]);

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
        offset: historyPage * 5
      });
      setHistory(resp.data.data || []);
      setHistoryTotal(resp.data.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convert datetime-local to ISO string for Go's time.Time parser
      const isoDate = new Date(formData.due).toISOString();
      await createReminder({
        phone: formData.phone,
        desc: formData.desc,
        due: isoDate
      });
      setModal({
        open: true,
        title: 'Reminder Set! ⏰',
        message: 'Your team member will receive a WhatsApp notification at the scheduled time.',
        type: 'success'
      });
      setFormData({ phone: '', desc: '', due: '' });
      fetchHistory(); // Refresh history after creating
    } catch (err) {
      setModal({
        open: true,
        title: 'Scheduling Failed',
        message: 'We could not schedule the reminder. Please verify the date and try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Delivered' };
      case 'scheduled':
        return { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', dot: 'bg-blue-500 animate-pulse', label: 'Scheduled' };
      default:
        return { bg: 'bg-slate-50 border-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: status || 'Pending' };
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

      <div className="shrink-0 text-center lg:text-left">
        <div className="flex items-center gap-3 mb-3 justify-center lg:justify-start">
           <div className="px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-600">Productivity Tools</span>
           </div>
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
           Staff <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">Reminders</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 shrink-0">
        <div className="lg:col-span-3">
            <div className="premium-card bg-white p-10 border-none shadow-xl shadow-slate-200/50 rounded-[40px]">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4 px-1">1. Select Recipient</label>
                        <div className="grid grid-cols-2 gap-4">
                            {employees.map(emp => (
                                <button
                                    key={emp.id}
                                    type="button"
                                    onClick={() => setFormData({...formData, phone: emp.phone})}
                                    className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center gap-4 ${
                                        formData.phone === emp.phone 
                                        ? 'border-amber-500 bg-amber-50/50 ring-4 ring-amber-500/10' 
                                        : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${formData.phone === emp.phone ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        {emp.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className={`text-[11px] font-black uppercase tracking-widest truncate ${formData.phone === emp.phone ? 'text-amber-700' : 'text-slate-600'}`}>{emp.name}</span>
                                        <span className="text-[9px] font-bold text-slate-400 tracking-tight">{emp.phone}</span>
                                    </div>
                                </button>
                            ))}
                            {employees.length === 0 && (
                              <div className="col-span-2 py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No employees registered yet</p>
                              </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4 px-1">2. Task Description</label>
                        <textarea
                            required
                            value={formData.desc}
                            onChange={(e) => setFormData({...formData, desc: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] px-8 py-6 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-300 min-h-[150px]"
                            placeholder="Example: Finalize the client dashboard PPT by end of day..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4 px-1">3. Schedule Time</label>
                            <input
                                required
                                type="datetime-local"
                                value={formData.due}
                                onChange={(e) => setFormData({...formData, due: e.target.value})}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 focus:border-amber-500 focus:outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={loading || !formData.phone}
                                className="w-full bg-slate-900 text-white rounded-2xl py-5 font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                {loading ? 'Scheduling...' : 'Send Reminder'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <div className="lg:col-span-2 hidden lg:block">
            <div className="premium-card bg-slate-900 rounded-[40px] p-10 h-fit relative overflow-hidden">
                <div className="relative z-10">
                    <Clock className="w-12 h-12 text-amber-400 mb-8" />
                    <h3 className="text-2xl font-black text-white tracking-tighter mb-4 leading-none">Smart <br/>Recall System</h3>
                    <p className="text-slate-400 text-xs font-semibold leading-relaxed mb-8">
                        Our automated engine will notify employees exactly at the scheduled time via WhatsApp. Perfect for deadlines, meetings, and updates.
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Real-time Delivery</span>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Employee Tracking</span>
                        </div>
                    </div>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-10">
                   <Calendar className="w-64 h-64 text-white" />
                </div>
            </div>
        </div>
      </div>

      {/* Reminder History Section */}
      <div className="shrink-0 bg-slate-50/50 rounded-[40px] p-10 border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-500">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Reminder History</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All scheduled & delivered notifications</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] py-20 flex text-center">
              <div className="mx-auto">
                <Timer className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">No reminders yet</p>
              </div>
            </div>
          ) : (
            history.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <div key={item.id} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between gap-8 group hover:border-amber-200 transition-all">
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors">
                      {item.status === 'sent' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black text-slate-900 truncate">{item.name || 'Staff'}</span>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${badge.bg} ${badge.text}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></div>
                          {badge.label}
                        </div>
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
              );
            })
          )}
        </div>

        {historyTotal > 5 && (
          <div className="flex justify-center items-center gap-6 mt-10">
            <button
              disabled={historyPage === 0}
              onClick={() => setHistoryPage(historyPage - 1)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-600 disabled:opacity-30 transition-all"
            >
              Previous
            </button>
            <span className="text-xs font-black text-slate-900 tabular-nums">
              {historyPage + 1} <span className="text-slate-300 mx-1">/</span> {Math.ceil(historyTotal / 5)}
            </span>
            <button
              disabled={(historyPage + 1) * 5 >= historyTotal}
              onClick={() => setHistoryPage(historyPage + 1)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-600 disabled:opacity-30 transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reminders;

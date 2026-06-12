import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, deleteEmployee } from '../api';
import { UserPlus, Trash2, ShieldCheck, Mail } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchEmployees();
  }, [page]);

  const fetchEmployees = async () => {
    try {
      const resp = await getEmployees({
        limit: 10,
        offset: page * 10
      });
      setEmployees(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addEmployee(formData);
      setFormData({ name: '', phone: '' });
      setShowAddModal(false);
      setModal({
        open: true,
        title: 'Team Member Added! 🏆',
        message: `${formData.name} has been successfully onboarded to the ASKworX internal system.`,
        type: 'success'
      });
      fetchEmployees();
    } catch (err) {
      setModal({
        open: true,
        title: 'Onboarding Failed',
        message: 'Could not register the employee. Please check the network or phone number format.',
        type: 'error'
      });
    }
  };

  const confirmDelete = async () => {
    if (!confirm.id) return;
    try {
      await deleteEmployee(confirm.id);
      fetchEmployees();
      setModal({
        open: true,
        title: 'Member Removed',
        message: 'The team member has been successfully removed from the system.',
        type: 'success'
      });
    } catch (err) {
      setModal({
        open: true,
        title: 'Removal Failed',
        message: 'There was an issue removing the record from the database.',
        type: 'error'
      });
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
      <ConfirmModal
        isOpen={confirm.open}
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={confirmDelete}
        title="Remove Team Member?"
        message="This action will permanently revoke their access to the ASKworX internal hub. This cannot be undone."
        confirmText="Remove Member"
      />
      <div className="flex justify-between items-end mb-12 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-600">Human Resources</span>
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
            Team <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">Roster</span>
          </h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      <div className="premium-card flex-1 overflow-hidden bg-white shadow-sm border-none flex flex-col min-h-0">
        <div className="flex-1 overflow-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50/80 backdrop-blur-md">
                <th className="px-10 py-6">Member Identity</th>
                <th className="px-10 py-6">Verification</th>
                <th className="px-10 py-6">Role</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {employees.map((emp) => (
                <tr key={emp.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-sm tracking-tight">{emp.name}</span>
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">Verified Member</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="text-xs font-bold text-slate-600 tracking-widest">📞 {emp.phone}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200 w-fit">
                      <ShieldCheck className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{emp.role}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button
                      onClick={() => setConfirm({ open: true, id: emp.id })}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && !loading && (
                <tr>
                  <td colSpan="4" className="px-10 py-20 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No registered employees</p>
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
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-600 disabled:opacity-30 transition-all"
              >
                Previous
              </button>
              <span className="w-px h-4 bg-slate-200" />
              <button
                disabled={(page + 1) * 10 >= total}
                onClick={() => setPage(page + 1)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-600 disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-500">
            <div className="p-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">New <span className="text-cyan-500">Member</span></h2>
              <p className="text-slate-400 text-sm font-medium mb-8">Onboard a new employee to the ASKworX internal system.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2 px-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 focus:border-cyan-500 focus:outline-none transition-all"
                    placeholder="Enter name..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2 px-1">WhatsApp Number (Digits only)</label>
                  <input
                    required
                    type="text"
                    pattern="[0-9]+"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 focus:border-cyan-500 focus:outline-none transition-all"
                    placeholder="e.g. 918310029635"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 bg-cyan-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-cyan-400/30 hover:bg-cyan-600 transition-all"
                  >
                    Register Team Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;

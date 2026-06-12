import React, { useState, useEffect } from 'react';
import { getAttendance } from '../api';
import { format } from 'date-fns';
import { ClipboardCheck, Search } from 'lucide-react';

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ start_date: '', end_date: '' });

  useEffect(() => {
    fetchAttendance();
  }, [page, filters]);

  const fetchAttendance = async () => {
    try {
      const resp = await getAttendance({
        limit: 10,
        offset: page * 10,
        ...filters
      });
      setRecords(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 lg:p-14 max-w-[1800px] mx-auto animate-in h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      <div className="flex justify-between items-end mb-12 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600">Operations</span>
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
            Attendance <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">Log</span>
          </h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-2xl">
            <input
              type="date"
              className="bg-white border-none rounded-xl px-4 py-2 text-[10px] font-bold text-slate-600 outline-none transition-all"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />
            <span className="text-slate-300 font-black">—</span>
            <input
              type="date"
              className="bg-white border-none rounded-xl px-4 py-2 text-[10px] font-bold text-slate-600 outline-none transition-all"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
          </div>
          <div className="text-right ml-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Entries</span>
            <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{total}</span>
          </div>
        </div>
      </div>

      <div className="premium-card flex-1 overflow-hidden bg-white shadow-sm border-none flex flex-col min-h-0">
        <div className="flex-1 overflow-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] bg-slate-50/80 backdrop-blur-md">
                <th className="px-10 py-6">Employee Name</th>
                <th className="px-10 py-6">Date</th>
                <th className="px-10 py-6">Check-In</th>
                <th className="px-10 py-6">Check-Out</th>
                <th className="px-10 py-6">Status</th>
                <th className="px-10 py-6 text-right">Site Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {records.map((r) => (
                <tr key={r.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-10 py-8">
                    <span className="font-black text-slate-800 text-sm tracking-tight">{r.employee_name}</span>
                  </td>
                  <td className="px-10 py-8">
                    <span className="text-xs font-bold text-slate-600">{format(new Date(r.date), 'dd MMM yyyy')}</span>
                  </td>
                  <td className="px-10 py-8">
                    {r.check_in ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{format(new Date(r.check_in), 'hh:mm a')}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Arrival Recorded</span>
                      </div>
                    ) : '--:--'}
                  </td>
                  <td className="px-10 py-8">
                    {r.check_out ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{format(new Date(r.check_out), 'hh:mm a')}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Departure Recorded</span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ongoing...</span>
                    )}
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 w-fit">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{r.check_out ? 'Completed' : 'Present'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex gap-3 justify-end">
                      {r.check_in_lat && (
                        <a
                          href={`https://www.google.com/maps?q=${r.check_in_lat},${r.check_in_lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 text-[9px] font-black text-slate-600 hover:text-emerald-700 rounded-lg border border-slate-200 transition-all flex items-center gap-2"
                        >
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          Arrival Loc
                        </a>
                      )}
                      {r.check_out_lat && (
                        <a
                          href={`https://www.google.com/maps?q=${r.check_out_lat},${r.check_out_lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-[9px] font-black text-slate-600 hover:text-blue-700 rounded-lg border border-slate-200 transition-all flex items-center gap-2"
                        >
                          <div className="w-1 h-1 rounded-full bg-blue-500" />
                          Departure Loc
                        </a>
                      )}
                      {!r.check_in_lat && !r.check_out_lat && (
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No GPS Data</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-10 py-20 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No attendance logs found</p>
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
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-all"
              >
                Previous
              </button>
              <span className="w-px h-4 bg-slate-200" />
              <button
                disabled={(page + 1) * 10 >= total}
                onClick={() => setPage(page + 1)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-all"
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

export default Attendance;

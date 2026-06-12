import React, { useState, useEffect } from 'react';
import { getAttendance } from '../api';
import { format } from 'date-fns';
import { BarChart3, Search, CheckCircle2 } from 'lucide-react';

const EODReports = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const resp = await getAttendance();
      // Filter only those who HAVE an EOD report
      const withReports = (resp.data.data || []).filter(r => r.eod_report && r.eod_report !== '');
      setRecords(withReports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => 
    r.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-10 lg:p-14 max-w-[1800px] mx-auto animate-in h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      <div className="flex justify-between items-end mb-12 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600">Daily Deliverables</span>
             </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
             EOD <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">Accomplishments</span>
          </h1>
        </div>
        <div className="flex gap-4 items-center">
            <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
                <input 
                    type="text"
                    placeholder="Search by member..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none w-[300px] transition-all"
                />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 overflow-y-auto no-scrollbar pb-20">
        {filteredRecords.map((r) => (
          <div key={r.id} className="bg-white rounded-[32px] p-10 border border-slate-100 hover:border-blue-200 transition-all group shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all">
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 text-lg tracking-tight leading-none mb-2">{r.employee_name}</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">{format(new Date(r.date), 'EEEE, do MMM')}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Exit at {format(new Date(r.check_out), 'hh:mm a')}</span>
                        </div>
                    </div>
                </div>
                <div className="flex h-fit px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Daily Task Done</span>
                </div>
            </div>

            <div className="bg-slate-50/50 rounded-2xl p-8 border border-slate-100/50 relative overflow-hidden">
                <BarChart3 className="w-24 h-24 text-blue-500/5 absolute -right-6 -bottom-6 rotate-12" />
                <div className="flex gap-4 mb-4">
                    <div className="w-1 h-auto bg-blue-500 rounded-full" />
                    <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap relative z-10 italic">
                       "{r.eod_report}"
                    </p>
                </div>
            </div>
            
            <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-slate-100 rounded-lg">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Shift Closed</span>
                    </div>
                </div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Report ID: #EOD-{r.id}</span>
            </div>
          </div>
        ))}
        {filteredRecords.length === 0 && !loading && (
          <div className="col-span-full py-32 text-center rounded-[40px] border-4 border-dashed border-slate-100">
            <BarChart3 className="w-16 h-16 text-slate-100 mx-auto mb-6" />
            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-300">No end-of-day reports submitted yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EODReports;

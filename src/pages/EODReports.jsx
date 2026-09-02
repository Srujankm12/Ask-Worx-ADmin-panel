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
  const withReports = (resp.data.data || []).filter(
    r => r.eod_report && r.eod_report !== ''
  );

  setRecords(withReports);
} catch (err) {
  console.error(err);
} finally {
  setLoading(false);
}

};

const filteredRecords = records.filter(r =>
r.employee_name
.toLowerCase()
.includes(searchTerm.toLowerCase())
);

return ( <div className="p-10 lg:p-14 max-w-[1800px] mx-auto animate-in h-[calc(100vh-80px)] flex flex-col overflow-hidden">

  {/* ================= HEADER ================= */}

  <div className="flex justify-between items-end mb-12 shrink-0">

    <div>

      <div className="flex items-center gap-3 mb-3">

        <div className="px-3 py-1 bg-primary-light rounded-full">

          <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
            Daily Deliverables
          </span>

        </div>

      </div>


      <h1 className="text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight leading-none">
        EOD Accomplishments
      </h1>

    </div>


    {/* ================= SEARCH ================= */}

    <div className="relative">

      <Search className="w-4 h-4 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2" />

      <input
        type="text"
        placeholder="Search by member..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="
          bg-white
          border
          border-border
          rounded-lg
          pl-11
          pr-5
          py-3
          text-xs
          font-medium
          text-text-primary
          placeholder:text-text-secondary
          focus:border-primary
          focus:outline-none
          w-[300px]
          transition-colors
        "
      />

    </div>

  </div>


  {/* ================= REPORT CARDS ================= */}

  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto no-scrollbar pb-10">

    {filteredRecords.map((r) => (

      <div
        key={r.id}
        className="
          bg-white
          rounded-lg
          p-8
          border
          border-border
          hover:border-primary/30
          transition-colors
          shadow-card
          group
        "
      >

        {/* ================= CARD HEADER ================= */}

        <div className="flex justify-between items-start mb-7">

          <div className="flex items-center gap-4">

            {/* Report Icon */}

            <div className="
              w-11
              h-11
              rounded-lg
              bg-primary-light
              flex
              items-center
              justify-center
              text-primary
              shrink-0
            ">

              <CheckCircle2 className="w-5 h-5" />

            </div>


            {/* Employee Information */}

            <div>

              <h3 className="font-semibold text-text-primary text-base tracking-tight leading-none mb-2">

                {r.employee_name}

              </h3>


              <div className="flex items-center gap-2 flex-wrap">

                <span className="text-[9px] font-medium uppercase tracking-widest text-primary">

                  {format(
                    new Date(r.date),
                    'EEEE, do MMM'
                  )}

                </span>


                <span className="w-1 h-1 rounded-full bg-border" />


                <span className="text-[9px] font-medium uppercase tracking-widest text-text-secondary">

                  Exit at{' '}

                  {format(
                    new Date(r.check_out),
                    'hh:mm a'
                  )}

                </span>

              </div>

            </div>

          </div>


          {/* Daily Task Done */}

          <div className="
            flex
            h-fit
            px-3
            py-2
            bg-success-light
            rounded-lg
            border
            border-success/10
          ">

            <span className="text-[9px] font-medium text-success uppercase tracking-widest">

              Daily Task Done

            </span>

          </div>

        </div>


        {/* ================= REPORT CONTENT ================= */}

        <div className="
          bg-background
          rounded-lg
          p-7
          border
          border-border
          relative
          overflow-hidden
        ">

          <BarChart3 className="
            w-20
            h-20
            text-primary/5
            absolute
            -right-5
            -bottom-5
            rotate-12
          " />


          <div className="flex gap-4 relative z-10">

            <div className="w-1 shrink-0 bg-primary rounded-full" />


            <p className="
              text-sm
              font-medium
              text-text-primary
              leading-relaxed
              whitespace-pre-wrap
            ">

              "{r.eod_report}"

            </p>

          </div>

        </div>


        {/* ================= CARD FOOTER ================= */}

        <div className="mt-7 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="
              px-3
              py-2
              bg-background
              rounded-lg
              border
              border-border
            ">

              <span className="text-[9px] font-medium text-text-secondary uppercase tracking-widest">

                Shift Closed

              </span>

            </div>

          </div>


          <span className="text-[9px] font-medium text-text-secondary uppercase tracking-widest">

            Report ID: #EOD-{r.id}

          </span>

        </div>

      </div>

    ))}


    {/* ================= EMPTY STATE ================= */}

    {filteredRecords.length === 0 && !loading && (

      <div className="
        col-span-full
        py-32
        text-center
        rounded-lg
        border
        border-dashed
        border-border
        bg-white
      ">

        <div className="
          w-16
          h-16
          bg-primary-light
          rounded-lg
          flex
          items-center
          justify-center
          mx-auto
          mb-6
        ">

          <BarChart3 className="w-7 h-7 text-primary" />

        </div>


        <p className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">

          No end-of-day reports submitted yet

        </p>

      </div>

    )}

  </div>

</div>

);
};

export default EODReports;

import React, { useState, useEffect } from 'react';
import { getAttendance } from '../api';
import { format } from 'date-fns';
import { BookOpen, Search, User } from 'lucide-react';

const WorkPlans = () => {
const [records, setRecords] = useState([]);
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');

useEffect(() => {
fetchAttendance();
}, []);

const fetchAttendance = async () => {
try {
const resp = await getAttendance();

  // Filter only those who HAVE a work plan
  const withPlans = (resp.data.data || []).filter(
    r => r.work_plan && r.work_plan !== ''
  );

  setRecords(withPlans);
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

return ( <div className="flex flex-col">

  {/* ================= HEADER ================= */}

  <div className="flex justify-between items-end mb-12 shrink-0">

    <div>

      <div className="flex items-center gap-3 mb-3">

        <div className="px-3 py-1 bg-primary-light rounded-full">

          <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
            Daily Objectives
          </span>

        </div>

      </div>


      <h1 className="text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight leading-none">
        Team Work Plans
      </h1>

    </div>


    {/* Search */}

    <div className="relative">

      <Search className="w-4 h-4 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2" />

      <input
        type="text"
        placeholder="Search employee..."
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


  {/* ================= WORK PLAN CARDS ================= */}

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

            {/* Employee Icon */}

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

              <User className="w-5 h-5" />

            </div>


            {/* Employee Details */}

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

                  Recorded at{' '}

                  {format(
                    new Date(r.check_in),
                    'hh:mm a'
                  )}

                </span>

              </div>

            </div>

          </div>


          {/* Daily Commitment Badge */}

          <div className="
            flex
            h-fit
            px-3
            py-2
            bg-background
            rounded-lg
            border
            border-border
          ">

            <span className="text-[9px] font-medium text-text-secondary uppercase tracking-widest">

              Daily Commitment

            </span>

          </div>

        </div>


        {/* ================= WORK PLAN CONTENT ================= */}

        <div className="
          bg-background
          rounded-lg
          p-7
          border
          border-border
          relative
          overflow-hidden
        ">

          <BookOpen className="
            w-20
            h-20
            text-primary/5
            absolute
            -right-5
            -bottom-5
            rotate-12
          " />


          <p className="
            text-sm
            font-medium
            text-text-primary
            leading-relaxed
            whitespace-pre-wrap
            relative
            z-10
          ">

            {r.work_plan}

          </p>

        </div>


        {/* ================= CARD FOOTER ================= */}

        <div className="mt-7 flex items-center gap-3">

          <div className="flex -space-x-2">

            {[1, 2, 3].map(i => (

              <div
                key={i}
                className="
                  w-6
                  h-6
                  rounded-full
                  border-2
                  border-white
                  bg-border
                "
              />

            ))}

          </div>


          <span className="text-[10px] font-medium text-text-secondary uppercase tracking-widest">

            Awaiting EOD Review

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

          <BookOpen className="w-7 h-7 text-primary" />

        </div>


        <p className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">

          No active work plans found today

        </p>

      </div>

    )}

  </div>

</div>

);
};

export default WorkPlans;

import React, { useState, useEffect } from 'react';
import { getAttendance } from '../api';
import { format } from 'date-fns';
import { ClipboardCheck, Search } from 'lucide-react';

const Attendance = () => {
const [records, setRecords] = useState([]);
const [loading, setLoading] = useState(true);

const [total, setTotal] = useState(0);
const [page, setPage] = useState(0);
const [filters, setFilters] = useState({
start_date: '',
end_date: ''
});

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
  setTotal(resp.data.total || []);
} catch (err) {
  console.error(err);
} finally {
  setLoading(false);
}
};

return ( <div className="flex flex-col">

  {/* ================= HEADER ================= */}

  <div className="flex justify-between items-end mb-12 shrink-0">

    <div>

      <div className="flex items-center gap-3 mb-3">

        <div className="px-3 py-1 bg-primary-light rounded-full">

          <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
            Operations
          </span>

        </div>

      </div>


      <h1 className="text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight leading-none">
        Attendance Log
      </h1>

    </div>


    <div className="flex gap-4 items-center">

      {/* Date Filters */}

      <div className="flex items-center gap-3 bg-background border border-border p-2 rounded-lg">

        <input
          type="date"
          className=" bg-white border border-border rounded-lg px-4 py-2 text-[10px] font-medium text-text-secondary outline-none focus:border-primary transition-colors"
          value={filters.start_date}
          onChange={(e) =>
            setFilters({
              ...filters,
              start_date: e.target.value
            })
          }
        />

        <span className="text-text-secondary font-medium">
          —
        </span>
        <input
          type="date"
          className="bg-white border border-border rounded-lg px-4 py-2 text-[10px] font-medium text-text-secondary outline-none focus:border-primary transition-colors"
          value={filters.end_date}
          onChange={(e) =>
            setFilters({
              ...filters,
              end_date: e.target.value
            })
          }
        />

      </div>
      {/* Total Entries */}
      <div className="text-right ml-4">
        <span className="text-[10px] font-medium uppercase tracking-widest text-text-secondary block mb-1">
          Total Entries
        </span>
        <span className="text-3xl font-semibold text-text-primary tracking-tight tabular-nums">
          {total}
        </span>
      </div>
    </div>
  </div>
  
  <div className="flex-1 overflow-hidden bg-white shadow-card border border-border rounded-lg flex flex-col min-h-0">
    <div className="flex-1 overflow-auto no-scrollbar">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="sticky top-0 z-10">
          <tr className="text-text-secondary text-[10px] font-medium uppercase tracking-widest bg-background border-b border-border">
            <th className="px-10 py-6">
              Employee Name
            </th>
            <th className="px-10 py-6 text-center">
              Date
            </th>
            <th className="px-10 py-6 text-center">
              Check-In
            </th>
            <th className="px-10 py-6 text-center">
              Check-Out
            </th>
            <th className="px-10 py-6 text-center">
              Status
            </th>
            <th className="px-10 py-6 text-right">
              Site Verification
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((r) => (
            <tr
              key={r.id}
              className="group hover:bg-background transition-colors"
            >
              {/* Employee Name */}
              <td className="px-10 py-8">
                <span className="font-semibold text-text-primary text-sm tracking-tight">
                  {r.employee_name}
                </span>
              </td>
              {/* Date */}
              <td className="px-10 py-8 text-center">
                <span className="text-xs font-medium text-text-secondary">
                  {format(
                    new Date(r.date),
                    'dd MMM yyyy'
                  )}
                </span>
              </td>
              {/* Check-In */}
              <td className="px-10 py-8 text-center">
                {r.check_in ? (
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-success uppercase tracking-widest">
                      {format(
                        new Date(r.check_in),
                        'hh:mm a'
                      )}
                    </span>
                    <span className="text-[8px] text-text-secondary font-medium uppercase tracking-widest mt-1">
                      Arrival Recorded
                    </span>
                  </div>
                ) : (
                  '--:--'
                )}
              </td>
              {/* Check-Out */}
              <td className="px-10 py-8 text-center">
                {r.check_out ? (
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                      {format(
                        new Date(r.check_out),
                        'hh:mm a'
                      )}
                    </span>


                    <span className="text-[8px] text-text-secondary font-medium uppercase tracking-widest mt-1">

                      Departure Recorded

                    </span>

                  </div>

                ) : (

                  <span className="text-[9px] font-medium text-text-secondary uppercase tracking-widest">
                    Ongoing...
                  </span>

                )}

              </td>


              {/* Status */}

              <td className="px-10 py-8 text-center">

                <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-success/10 bg-success-light px-3 py-1.5 text-success">

                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />

                  <span className="text-[9px] font-medium uppercase tracking-widest">

                    {r.check_out
                      ? 'Completed'
                      : 'Present'}

                  </span>

                </div>

              </td>


              {/* Site Verification */}

              <td className="px-10 py-8 text-right">

                <div className="flex gap-3 justify-end">

                  {r.check_in_lat && (

                    <a
                      href={`https://www.google.com/maps?q=${r.check_in_lat},${r.check_in_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        px-3
                        py-2
                        bg-background
                        hover:bg-primary-light
                        text-[9px]
                        font-medium
                        text-text-secondary
                        hover:text-primary
                        rounded-lg
                        border
                        border-border
                        transition-colors
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <div className="w-1.5 h-1.5 rounded-full bg-success" />

                      Arrival Loc

                    </a>

                  )}


                  {r.check_out_lat && (

                    <a
                      href={`https://www.google.com/maps?q=${r.check_out_lat},${r.check_out_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        px-3
                        py-2
                        bg-background
                        hover:bg-primary-light
                        text-[9px]
                        font-medium
                        text-text-secondary
                        hover:text-primary
                        rounded-lg
                        border
                        border-border
                        transition-colors
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />

                      Departure Loc

                    </a>

                  )}


                  {!r.check_in_lat && !r.check_out_lat && (

                    <span className="text-[9px] font-medium text-text-secondary uppercase tracking-widest">

                      No GPS Data

                    </span>

                  )}

                </div>

              </td>

            </tr>

          ))}


          {/* Empty State */}

          {records.length === 0 && !loading && (

            <tr>

              <td
                colSpan="5"
                className="px-10 py-20 text-center"
              >

                <p className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">

                  No attendance logs found

                </p>

              </td>

            </tr>

          )}

        </tbody>

      </table>

    </div>


    {/* ================= PAGINATION ================= */}

    {total > 10 && (

      <div className="shrink-0 px-10 py-6 bg-background border-t border-border flex items-center justify-between">

        <span className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">

          Showing Page{' '}

          <span className="text-text-primary">
            {page + 1}
          </span>

          {' '}of{' '}

          {Math.ceil(total / 10)}

        </span>


        <div className="flex gap-6 items-center">

          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="
              text-[10px]
              font-medium
              uppercase
              tracking-widest
              text-text-secondary
              hover:text-primary
              disabled:opacity-30
              transition-colors
            "
          >

            Previous

          </button>


          <span className="w-px h-4 bg-border" />


          <button
            disabled={(page + 1) * 10 >= total}
            onClick={() => setPage(page + 1)}
            className="
              text-[10px]
              font-medium
              uppercase
              tracking-widest
              text-text-secondary
              hover:text-primary
              disabled:opacity-30
              transition-colors
            "
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

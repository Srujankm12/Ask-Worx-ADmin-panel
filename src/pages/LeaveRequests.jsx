import React, { useState, useEffect } from 'react';
import { getLeaveRequests, updateLeaveStatus } from '../api';
import { CalendarRange, Check, X, Clock } from 'lucide-react';
import Modal from '../components/Modal';

const LeaveRequests = () => {
const [requests, setRequests] = useState([]);
const [loading, setLoading] = useState(true);

// Modal State
const [modal, setModal] = useState({
open: false,
title: '',
message: '',
type: 'success'
});

useEffect(() => {
fetchRequests();
}, []);

const [total, setTotal] = useState(0);
const [page, setPage] = useState(0);
const [filters, setFilters] = useState({
start_date: '',
end_date: ''
});

useEffect(() => {
fetchRequests();
}, [page, filters]);

const fetchRequests = async () => {
try {
const resp = await getLeaveRequests({
limit: 10,
offset: page * 10,
...filters
});

  setRequests(resp.data.data || []);
  setTotal(resp.data.total || 0);
} catch (err) {
  console.error(err);
} finally {
  setLoading(false);
}

};

const handleAction = async (id, status) => {
try {
await updateLeaveStatus(id, status);

  setModal({
    open: true,
    title:
      status === 'Approved'
        ? 'Leave approved'
        : 'Leave rejected',
    message: `The employee has been notified via WhatsApp that their leave request was ${status.toLowerCase()}.`,
    type: status === 'Approved' ? 'success' : 'error'
  });

  fetchRequests();
} catch (err) {
  console.error(err);
  setModal({
    open: true,
    title: 'Could not update the request',
    message:
      'Nothing was changed and the employee has not been notified. Please try again.',
    type: 'error'
  });
}
};

const getStatusStyle = (status) => {
switch (status) {
case 'Approved':
return 'bg-success-light text-success border-success/10';

  case 'Rejected':
    return 'bg-red-50 text-red-600 border-red-100';

  default:
    return 'bg-amber-50 text-amber-600 border-amber-100';
}

};

return ( <div className="flex flex-col">

  <Modal
    isOpen={modal.open}
    onClose={() =>
      setModal({
        ...modal,
        open: false
      })
    }
    title={modal.title}
    message={modal.message}
    type={modal.type}
  />


  {/* ================= HEADER ================= */}

  <div className="flex justify-between items-end mb-12 shrink-0">

    <div>

      <div className="flex items-center gap-3 mb-3">

        <div className="px-3 py-1 bg-primary-light rounded-full">

          <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
            Personnel Records
          </span>

        </div>

      </div>


      <h1 className="text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight leading-none">
        Leave Approvals
      </h1>

    </div>


    {/* ================= FILTERS & TOTAL ================= */}

    <div className="flex items-center gap-8">

      {/* Date Filters */}

      <div className="
        flex
        items-center
        gap-3
        bg-background
        border
        border-border
        p-2
        rounded-lg
      ">

        <input
          type="date"
          className="
            bg-white
            border
            border-border
            rounded-lg
            px-4
            py-2
            text-[10px]
            font-medium
            text-text-secondary
            outline-none
            focus:border-primary
            transition-colors
          "
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
          className="
            bg-white
            border
            border-border
            rounded-lg
            px-4
            py-2
            text-[10px]
            font-medium
            text-text-secondary
            outline-none
            focus:border-primary
            transition-colors
          "
          value={filters.end_date}
          onChange={(e) =>
            setFilters({
              ...filters,
              end_date: e.target.value
            })
          }
        />

      </div>


      {/* Total Records */}

      <div className="text-right">

        <span className="text-[10px] font-medium uppercase tracking-widest text-text-secondary block mb-1">
          Total Records
        </span>

        <span className="text-3xl font-semibold text-text-primary tracking-tight tabular-nums">
          {total}
        </span>

      </div>

    </div>

  </div>


  {/* ================= LEAVE REQUEST TABLE ================= */}

  <div className="
    flex-1
    overflow-hidden
    bg-white
    shadow-card
    border
    border-border
    rounded-lg
    flex
    flex-col
    min-h-0
  ">

    <div className="flex-1 overflow-auto no-scrollbar">

      <table className="w-full text-left border-collapse min-w-[1100px]">

        <thead className="sticky top-0 z-10">

          <tr className="
            text-text-secondary
            text-[10px]
            font-medium
            uppercase
            tracking-widest
            bg-background
            border-b
            border-border
          ">

            <th className="px-10 py-6">
              Requested By
            </th>

            <th className="px-10 py-6">
              Leave Details
            </th>

            <th className="px-10 py-6">
              Justification
            </th>

            <th className="px-10 py-6">
              Status
            </th>

            <th className="px-10 py-6 text-right">
              Review Action
            </th>

          </tr>

        </thead>


        <tbody className="divide-y divide-border">

          {requests.map((r) => (

            <tr
              key={r.id}
              className="
                group
                hover:bg-background
                transition-colors
              "
            >

              {/* Requested By */}

              <td className="px-10 py-8">

                <div className="flex flex-col">

                  <span className="
                    font-semibold
                    text-text-primary
                    text-sm
                    tracking-tight
                  ">

                    {r.employee_name}

                  </span>


                  <span className="
                    text-[10px]
                    text-text-secondary
                    font-medium
                    tracking-widest
                    uppercase
                    mt-1
                  ">

                    📞 {r.employee_phone}

                  </span>

                </div>

              </td>


              {/* Leave Details */}

              <td className="px-10 py-8">

                <div className="flex flex-col">

                  <span className="
                    text-xs
                    font-semibold
                    text-text-primary
                    uppercase
                    tracking-widest
                  ">

                    {r.leave_type.replace('leave_', '')}

                  </span>


                  <span className="
                    text-[10px]
                    text-primary
                    font-medium
                    uppercase
                    tracking-widest
                    mt-1
                  ">

                    🗓️ {r.leave_date}

                  </span>

                </div>

              </td>


              {/* Justification */}

              <td className="px-10 py-8">

                <p className="
                  text-xs
                  text-text-secondary
                  font-medium
                  max-w-xs
                  line-clamp-2
                  leading-relaxed
                ">

                  "{r.reason}"

                </p>

              </td>


              {/* Status */}

              <td className="px-10 py-8">

                <div
                  className={`
                    flex
                    items-center
                    gap-2
                    px-3
                    py-1.5
                    rounded-full
                    border
                    w-fit
                    ${getStatusStyle(r.status)}
                  `}
                >

                  <span className="
                    text-[9px]
                    font-medium
                    uppercase
                    tracking-widest
                  ">

                    {r.status}

                  </span>

                </div>

              </td>


              {/* Review Actions */}

              <td className="px-10 py-8 text-right">

                {r.status === 'Pending' ? (

                  <div className="flex justify-end gap-3">

                    {/* Reject */}

                    <button
                      onClick={() =>
                        handleAction(
                          r.id,
                          'Rejected'
                        )
                      }
                      className="
                        p-3
                        bg-red-50
                        text-red-600
                        rounded-lg
                        border
                        border-red-100
                        hover:bg-red-600
                        hover:text-white
                        transition-colors
                        active:scale-95
                      "
                    >

                      <X className="w-4 h-4" />

                    </button>


                    {/* Approve */}

                    <button
                      onClick={() =>
                        handleAction(
                          r.id,
                          'Approved'
                        )
                      }
                      className="
                        p-3
                        bg-success-light
                        text-success
                        rounded-lg
                        border
                        border-success/10
                        hover:bg-success
                        hover:text-white
                        transition-colors
                        active:scale-95
                      "
                    >

                      <Check className="w-4 h-4" />

                    </button>

                  </div>

                ) : (

                  <span className="
                    text-[9px]
                    font-medium
                    text-text-secondary
                    uppercase
                    tracking-widest
                  ">

                    Decision Finalized

                  </span>

                )}

              </td>

            </tr>

          ))}


          {/* ================= EMPTY STATE ================= */}

          {requests.length === 0 && !loading && (

            <tr>

              <td
                colSpan="5"
                className="px-10 py-20 text-center"
              >

                <div className="
                  w-14
                  h-14
                  bg-primary-light
                  rounded-lg
                  flex
                  items-center
                  justify-center
                  mx-auto
                  mb-5
                ">

                  <CalendarRange className="w-6 h-6 text-primary" />

                </div>


                <p className="
                  text-[10px]
                  font-medium
                  uppercase
                  tracking-widest
                  text-text-secondary
                ">

                  No leave requests recorded

                </p>

              </td>

            </tr>

          )}

        </tbody>

      </table>

    </div>


    {/* ================= PAGINATION ================= */}

    {total > 10 && (

      <div className="
        shrink-0
        px-10
        py-6
        bg-background
        border-t
        border-border
        flex
        items-center
        justify-between
      ">

        <span className="
          text-[10px]
          font-medium
          uppercase
          tracking-widest
          text-text-secondary
        ">

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
            className="text-[10px] font-medium uppercase tracking-widest text-text-secondary hover:text-primary disabled:opacity-30 transition-colors"
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
export default LeaveRequests;

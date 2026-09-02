import React, { useState, useEffect } from 'react';
import { getCallbacks, markCallbackDone } from '../api';
import { format } from 'date-fns';
import { formatSlug } from '../utils';

const Callbacks = () => {
const [callbacks, setCallbacks] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
fetchCallbacks();
}, []);

const fetchCallbacks = async () => {
try {
const resp = await getCallbacks();
setCallbacks(resp.data || []);
} catch (err) {
console.error(err);
} finally {
setLoading(false);
}
};

const handleUpdateStatus = async (id) => {
try {
await markCallbackDone(id);

  setCallbacks(
    callbacks.map((c) =>
      c.id === id
        ? { ...c, status: 'completed' }
        : c
    )
  );
} catch (err) {
  alert('Update failed');
}

};

return ( <div className="p-10 lg:p-14 max-w-[1800px] mx-auto animate-in h-[calc(100vh-80px)] flex flex-col overflow-hidden">

  {/* ================= HEADER ================= */}

  <div className="flex justify-between items-end mb-12 shrink-0">

    <div>

      <div className="flex items-center gap-3 mb-3">

        <div className="px-3 py-1 bg-primary-light rounded-full">

          <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
            Callbacks
          </span>

        </div>

      </div>


      <h1 className="text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight leading-none">
        Pending Callbacks
      </h1>

    </div>


    <div className="text-right">

      <span className="text-[10px] font-medium uppercase tracking-widest text-text-secondary block mb-1">
        Unresolved
      </span>

      <span className="text-3xl font-semibold text-text-primary tracking-tight tabular-nums">
        {callbacks.filter(
          (c) => c.status === 'pending'
        ).length}
      </span>

    </div>

  </div>


  {/* ================= CALLBACK TABLE ================= */}

  <div className="flex-1 overflow-hidden bg-white shadow-card border border-border rounded-lg flex flex-col min-h-0">

    <div className="flex-1 overflow-auto">

      <table className="w-full text-left border-collapse min-w-[800px]">

        <thead className="sticky top-0 z-10">

          <tr className="text-text-secondary text-[10px] font-medium uppercase tracking-widest bg-background border-b border-border">

            <th className="px-10 py-6">
              Requestor
            </th>

            <th className="px-10 py-6">
              Status
            </th>

            <th className="px-10 py-6">
              Request Time
            </th>

            <th className="px-10 py-6 text-right">
              Operational Actions
            </th>

          </tr>

        </thead>


        <tbody className="divide-y divide-border">

          {callbacks.map((callback, idx) => (

            <tr
              key={callback.id || idx}
              className="group hover:bg-background transition-colors"
            >

              {/* Requestor */}

              <td className="px-10 py-8">

                <div className="flex flex-col">

                  <span className="font-semibold text-text-primary text-sm tracking-tight capitalize">

                    {callback.name
                      ? formatSlug(callback.name)
                      : 'Awaiting Profile'}

                  </span>


                  <span className="text-[10px] text-text-secondary font-medium uppercase tracking-widest mt-1">

                    +{callback.phone}

                  </span>

                </div>

              </td>


              {/* Status */}

              <td className="px-10 py-8">

                <div className="flex items-center gap-2">

                  <div
                    className={`
                      w-2
                      h-2
                      rounded-full
                      ${
                        callback.status === 'pending'
                          ? 'bg-warning'
                          : 'bg-success'
                      }
                    `}
                  />

                  <span
                    className={`
                      text-[10px]
                      font-medium
                      uppercase
                      tracking-widest
                      ${
                        callback.status === 'pending'
                          ? 'text-warning'
                          : 'text-success'
                      }
                    `}
                  >

                    {callback.status}

                  </span>

                </div>

              </td>


              {/* Request Time */}

              <td className="px-10 py-8 text-[10px] font-medium text-text-secondary uppercase tracking-widest tabular-nums">

                {callback.created_at
                  ? format(
                      new Date(callback.created_at),
                      'MMM d, HH:mm'
                    )
                  : '--:--'}

              </td>


              {/* Operational Actions */}

              <td className="px-10 py-8 text-right">

                {callback.status === 'pending' ? (

                  <button
                    onClick={() =>
                      handleUpdateStatus(callback.id)
                    }
                    className="
                      bg-primary
                      hover:bg-primary-hover
                      text-white
                      text-[9px]
                      font-medium
                      uppercase
                      tracking-widest
                      px-5
                      py-2.5
                      rounded-lg
                      transition-colors
                      active:scale-95
                    "
                  >

                    Resolve Task

                  </button>

                ) : (

                  <span className="text-[9px] font-medium uppercase tracking-widest text-success">

                    Operation Sync

                  </span>

                )}

              </td>

            </tr>

          ))}


          {/* Empty State */}

          {callbacks.length === 0 && !loading && (

            <tr>

              <td
                colSpan="4"
                className="px-10 py-20 text-center"
              >

                <p className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">

                  All callback requests resolved

                </p>

              </td>

            </tr>

          )}

        </tbody>

      </table>

    </div>

  </div>

</div>
);
};

export default Callbacks;

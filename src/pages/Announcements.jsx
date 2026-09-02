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
const [modal, setModal] = useState({
open: false,
title: '',
message: '',
type: 'success'
});

// Broadcast history — functionality unchanged
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
setSelectedPhones(selectedPhones.filter((p) => p !== phone));
} else {
setSelectedPhones([...selectedPhones, phone]);
}
};

const selectAll = () => {
if (selectedPhones.length === employees.length) {
setSelectedPhones([]);
} else {
setSelectedPhones(employees.map((e) => e.phone));
}
};

const handleSubmit = async (e) => {
e.preventDefault();

if (!message) return;

setLoading(true);

try {
  await sendAnnouncement({
    message,
    phones: selectedPhones
  });

  setModal({
    open: true,
    title: 'Announcement sent',
    message:
      'Your team is receiving it on WhatsApp now.',
    type: 'success'
  });

  setMessage('');
  setSelectedPhones([]);

  setTimeout(() => fetchHistory(), 2000);
} catch (err) {
  console.error(err);
  setModal({
    open: true,
    title: 'Could not send the announcement',
    message:
      'Nothing was sent. Check your connection and try again — nobody has received a partial message.',
    type: 'error'
  });
} finally {
  setLoading(false);
}
};

const selectedCount =
selectedPhones.length > 0
? selectedPhones.length
: employees.length;

return ( <div className="flex flex-col gap-8">

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

  <div className="flex justify-between items-end shrink-0">

    <div>
      <div className="flex items-center gap-3 mb-3">

        <div className="px-3 py-1 bg-primary-light rounded-full">
          <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
            Global Communication
          </span>
        </div>

      </div>

      <h1 className="text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight leading-none">
        Team Announcements
      </h1>
    </div>

    <div className="text-right">
      <span className="text-[10px] font-medium uppercase tracking-widest text-text-secondary block mb-1">
        Target Audience
      </span>

      <span className="text-3xl font-semibold text-text-primary tracking-tight tabular-nums">
        {selectedCount}
      </span>
    </div>
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 shrink-0">
    <div className="lg:col-span-5">

      <div className="
        bg-white
        border
        border-border
        rounded-lg
        shadow-card
        p-8
        h-[520px]
        flex
        flex-col
      ">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-text-primary tracking-tight mb-1">
              Select Recipients
            </h3>
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">
              Choose employees for this announcement
            </p>
          </div>
          <button
            type="button"
            onClick={selectAll}
            className="
              text-[10px]
              font-medium
              uppercase
              tracking-widest
              text-primary
              hover:text-primary-dark
              transition-colors
            "
          >
            {selectedPhones.length === employees.length
              ? 'Deselect All'
              : 'Select All'}
          </button>
        </div>
        <div className="
          flex-1
          overflow-y-auto
          no-scrollbar
          space-y-2
          pr-1
        ">
          {employees.map((emp) => {
            const isSelected =
              selectedPhones.includes(emp.phone);
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() =>
                  toggleSelect(emp.phone)
                }
                className={`
                  w-full
                  flex
                  items-center
                  justify-between
                  gap-4
                  p-4
                  rounded-lg
                  border
                  text-left
                  transition-colors
                  ${
                    isSelected
                      ? 'bg-primary-light border-primary/30'
                      : 'bg-white border-border hover:bg-background hover:border-primary/20'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`
                      w-10
                      h-10
                      rounded-lg
                      flex
                      items-center
                      justify-center
                      text-sm
                      font-semibold
                      shrink-0
                      ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-background text-text-secondary'
                      }
                    `}
                  >
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`
                        text-sm
                        font-semibold
                        truncate
                        ${
                          isSelected
                            ? 'text-primary'
                            : 'text-text-primary'
                        }
                      `}
                    >
                      {emp.name}
                    </p>
                    <p className="text-[10px] font-medium text-text-secondary truncate mt-1">
                      {emp.phone}
                    </p>
                  </div>
                </div>
                <div
                  className={`
                    w-5
                    h-5
                    rounded-md
                    border
                    flex
                    items-center
                    justify-center
                    shrink-0
                    transition-colors
                    ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-border bg-white'
                    }
                  `}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-sm bg-white" />
                  )}
                </div>
              </button>
            );
          })}
          {employees.length === 0 && (
            <div className="
              h-full
              min-h-[220px]
              flex
              flex-col
              items-center
              justify-center
              text-center
              border
              border-dashed
              border-border
              rounded-lg
            ">
              <div className="
                w-12
                h-12
                rounded-lg
                bg-primary-light
                flex
                items-center
                justify-center
                mb-4
              ">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="
                text-[10px]
                font-medium
                uppercase
                tracking-widest
                text-text-secondary
              ">
                No employees registered
              </p>
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="lg:col-span-7">
      <div className="
        bg-white
        border
        border-border
        rounded-lg
        shadow-card
        p-8
        h-[520px]
        flex
        flex-col
      ">
        <div className="flex items-center gap-4 mb-8 shrink-0">
          <div className="
            w-12
            h-12
            rounded-lg
            bg-primary-light
            text-primary
            flex
            items-center
            justify-center
          ">
            <Megaphone className="w-6 h-6" />
          </div>


          <div>
            <h3 className="
              text-lg
              font-semibold
              text-text-primary
              tracking-tight
              mb-1
            ">
              Broadcast Message
            </h3>

            <p className="
              text-[10px]
              font-medium
              uppercase
              tracking-widest
              text-text-secondary
            ">
              Official Team Communication
            </p>
          </div>

        </div>


        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col min-h-0"
        >

          <textarea
            required
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            className="
              flex-1
              min-h-[220px]
              w-full
              bg-background
              border
              border-border
              rounded-lg
              px-6
              py-5
              text-sm
              font-medium
              text-text-primary
              leading-relaxed
              resize-none
              outline-none
              focus:border-primary
              transition-colors
              placeholder:text-text-secondary
            "
            placeholder="Write your announcement here..."
          />
          <div className="
            mt-6
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-4
            shrink-0
          ">
            <div className="
              inline-flex
              items-center
              gap-3
              px-4
              py-3
              bg-background
              border
              border-border
              rounded-lg
              w-fit
            ">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span className="
                text-[10px]
                font-medium
                uppercase
                tracking-widest
                text-text-secondary
              ">
                Instant WhatsApp Delivery
              </span>
            </div>
            <button
              type="submit"
              disabled={loading || !message}
              className="
                bg-primary
                hover:bg-primary-dark
                text-white
                px-8
                py-3.5
                rounded-lg
                font-medium
                text-[10px]
                uppercase
                tracking-widest
                flex
                items-center
                justify-center
                gap-3
                transition-all
                active:scale-[0.98]
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              <Send className="w-4 h-4" />
              {loading
                ? 'Broadcasting...'
                : 'Send Announcement'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div className="
    bg-white
    border
    border-border
    rounded-lg
    shadow-card
    p-8
  ">

    <div className="
      flex
      flex-col
      sm:flex-row
      sm:items-center
      sm:justify-between
      gap-5
      mb-8
    ">

      <div className="flex items-center gap-4">

        <div className="
          w-11
          h-11
          rounded-lg
          bg-primary-light
          text-primary
          flex
          items-center
          justify-center
        ">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h3 className="
            text-xl
            font-semibold
            text-text-primary
            tracking-tight
            mb-1
          ">
            Communication History
          </h3>
          <p className="
            text-[10px]
            font-medium
            uppercase
            tracking-widest
            text-text-secondary
          ">
            Audit trail of sent notifications
          </p>
        </div>
      </div>

      <div className="
        px-4
        py-2
        bg-background
        border
        border-border
        rounded-lg
      ">
        <span className="
          text-[10px]
          font-medium
          uppercase
          tracking-widest
          text-text-secondary
        ">
          Total Records: {total}
        </span>
      </div>
    </div>

    <div className="space-y-3">

      {history.length === 0 ? (

        <div className="
          py-20
          text-center
          border
          border-dashed
          border-border
          rounded-lg
          bg-background
        ">

          <div className="
            w-12
            h-12
            rounded-lg
            bg-primary-light
            flex
            items-center
            justify-center
            mx-auto
            mb-5
          ">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>

          <p className="
            text-[10px]
            font-medium
            uppercase
            tracking-widest
            text-text-secondary
          ">
            No sent communications found
          </p>
        </div>
      ) : (
        history.map((item) => (
          <div
            key={item.id}
            className="
              bg-white
              p-5
              rounded-lg
              border
              border-border
              flex
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-5
              hover:bg-background
              transition-colors
            "
          >
            <div className="
              flex
              items-center
              gap-4
              flex-1
              min-w-0
            ">
              <div className="
                w-11
                h-11
                bg-background
                rounded-lg
                flex
                items-center
                justify-center
                text-primary
                shrink-0
              ">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">

                <div className="
                  flex
                  flex-wrap
                  items-center
                  gap-3
                  mb-1
                ">

                  <span className="
                    text-sm
                    font-semibold
                    text-text-primary
                    truncate
                  ">
                    {item.name || 'Team Announcement'}
                  </span>

                  <span
                    className={`
                      px-3
                      py-1
                      rounded-full
                      border
                      text-[9px]
                      font-medium
                      uppercase
                      tracking-widest
                      ${
                        item.status === 'sent'
                          ? 'bg-success-light text-success border-success/10'
                          : 'bg-primary-light text-primary border-primary/10'
                      }
                    `}
                  >
                    {item.status}
                  </span>

                </div>


                <p className="
                  text-xs
                  font-medium
                  text-text-secondary
                  line-clamp-1
                ">
                  {item.description}
                </p>

              </div>

            </div>


            <div className="
              text-left
              sm:text-right
              shrink-0
            ">

              <p className="
                text-[10px]
                font-medium
                text-text-primary
                mb-1
                tabular-nums
              ">
                {format(
                  new Date(item.due_at),
                  'dd MMM yyyy'
                )}
              </p>


              <p className="
                text-[9px]
                font-medium
                text-text-secondary
                uppercase
                tracking-widest
                tabular-nums
              ">
                {format(
                  new Date(item.due_at),
                  'hh:mm a'
                )}
              </p>

            </div>

          </div>

        ))

      )}

    </div>


    {/* ================= PAGINATION ================= */}

    {total > 5 && (

      <div className="
        flex
        justify-center
        items-center
        gap-6
        mt-8
      ">

        <button
          disabled={page === 0}
          onClick={() =>
            setPage(page - 1)
          }
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


        <span className="
          text-xs
          font-semibold
          text-text-primary
          tabular-nums
        ">

          {page + 1}

          <span className="text-text-secondary mx-2">
            /
          </span>

          {Math.ceil(total / 5)}

        </span>


        <button
          disabled={
            (page + 1) * 5 >= total
          }
          onClick={() =>
            setPage(page + 1)
          }
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

    )}

  </div>

</div>

);
};

export default Announcements;

import React, { useState, useEffect } from 'react';
import { getEmployees, createReminder, getRemindersHistory } from '../api';
import {
Clock,
Send,
User,
Calendar,
CheckCircle2,
Timer,
History
} from 'lucide-react';
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

const [modal, setModal] = useState({
open: false,
title: '',
message: '',
type: 'success'
});

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
const resp = await getEmployees({
limit: 100
});


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
    message:
      'Your team member will receive a WhatsApp notification at the scheduled time.',
    type: 'success'
  });

  setFormData({
    phone: '',
    desc: '',
    due: ''
  });

  fetchHistory();

} catch (err) {

  setModal({
    open: true,
    title: 'Scheduling Failed',
    message:
      'We could not schedule the reminder. Please verify the date and try again.',
    type: 'error'
  });

} finally {

  setLoading(false);

}
};

const getStatusBadge = (status) => {
switch (status) {

  case 'sent':
    return {
      bg: 'bg-success-light border-success/10',
      text: 'text-success',
      dot: 'bg-success',
      label: 'Delivered'
    };

  case 'scheduled':
    return {
      bg: 'bg-primary-light border-primary/10',
      text: 'text-primary',
      dot: 'bg-primary animate-pulse',
      label: 'Scheduled'
    };

  default:
    return {
      bg: 'bg-background border-border',
      text: 'text-text-secondary',
      dot: 'bg-text-secondary',
      label: status || 'Pending'
    };
}
};

return (

<div className="p-10 lg:p-14 max-w-[1800px] mx-auto animate-in flex flex-col gap-10 overflow-y-auto no-scrollbar pb-12">

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

  <div className="shrink-0">

    <div className="flex items-center gap-3 mb-3">

      <div className="px-3 py-1 bg-primary-light rounded-full">

        <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
          Productivity Tools
        </span>

      </div>

    </div>


    <h1 className="text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight leading-none">
      Staff Reminders
    </h1>

  </div>


  {/* ================= MAIN CONTENT ================= */}

  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 shrink-0">


    {/* ================= REMINDER FORM ================= */}

    <div className="lg:col-span-3">

      <div className="
        bg-white
        p-8
        border
        border-border
        rounded-lg
        shadow-card
      ">

        <form
          onSubmit={handleSubmit}
          className="space-y-8"
        >


          {/* ================= SELECT RECIPIENT ================= */}

          <div>

            <label className="
              text-[10px]
              font-medium
              uppercase
              tracking-widest
              text-text-secondary
              block
              mb-4
            ">
              1. Select Recipient
            </label>


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {employees.map((emp) => (

                <button
                  key={emp.id}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      phone: emp.phone
                    })
                  }
                  className={`
                    p-4
                    rounded-lg
                    border
                    text-left
                    transition-colors
                    flex
                    items-center
                    gap-3
                    ${
                      formData.phone === emp.phone
                        ? 'border-primary bg-primary-light'
                        : 'border-border bg-white hover:bg-background hover:border-primary/30'
                    }
                  `}
                >


                  {/* Employee Initial */}

                  <div
                    className={`
                      w-10
                      h-10
                      rounded-lg
                      flex
                      items-center
                      justify-center
                      font-semibold
                      text-sm
                      shrink-0
                      ${
                        formData.phone === emp.phone
                          ? 'bg-primary text-white'
                          : 'bg-background text-text-secondary'
                      }
                    `}
                  >

                    {emp.name.charAt(0).toUpperCase()}

                  </div>


                  {/* Employee Details */}

                  <div className="flex flex-col overflow-hidden">

                    <span
                      className={`
                        text-xs
                        font-semibold
                        truncate
                        ${
                          formData.phone === emp.phone
                            ? 'text-primary'
                            : 'text-text-primary'
                        }
                      `}
                    >

                      {emp.name}

                    </span>


                    <span className="text-[10px] font-medium text-text-secondary truncate">

                      {emp.phone}

                    </span>

                  </div>

                </button>

              ))}


              {employees.length === 0 && (

                <div className="
                  col-span-full
                  py-10
                  text-center
                  border
                  border-dashed
                  border-border
                  rounded-lg
                ">

                  <p className="
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-widest
                    text-text-secondary
                  ">
                    No employees registered yet
                  </p>

                </div>

              )}

            </div>

          </div>


          {/* ================= TASK DESCRIPTION ================= */}

          <div>

            <label className="
              text-[10px]
              font-medium
              uppercase
              tracking-widest
              text-text-secondary
              block
              mb-4
            ">
              2. Task Description
            </label>


            <textarea
              required
              value={formData.desc}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  desc: e.target.value
                })
              }
              className="
                w-full
                bg-background
                border
                border-border
                rounded-lg
                px-5
                py-4
                text-sm
                font-medium
                text-text-primary
                focus:border-primary
                focus:outline-none
                transition-colors
                placeholder:text-text-secondary
                min-h-[150px]
                resize-none
              "
              placeholder="Example: Finalize the client dashboard PPT by end of day..."
            />

          </div>


          {/* ================= SCHEDULE & BUTTON ================= */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>

              <label className="
                text-[10px]
                font-medium
                uppercase
                tracking-widest
                text-text-secondary
                block
                mb-4
              ">
                3. Schedule Date & Time
              </label>


              <input
                required
                type="datetime-local"
                value={formData.due}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    due: e.target.value
                  })
                }
                className="
                  w-full
                  bg-white
                  border
                  border-border
                  rounded-lg
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-text-primary
                  focus:border-primary
                  focus:outline-none
                  transition-colors
                "
              />

            </div>


            <div className="flex items-end">

              <button
                type="submit"
                disabled={loading || !formData.phone}
                className="
                  w-full
                  bg-primary
                  hover:bg-primary-dark
                  text-white
                  rounded-lg
                  py-3.5
                  font-medium
                  text-[10px]
                  uppercase
                  tracking-widest
                  transition-all
                  active:scale-[0.98]
                  flex
                  items-center
                  justify-center
                  gap-3
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >

                <Send className="w-4 h-4" />

                {loading
                  ? 'Scheduling...'
                  : 'Send Reminder'
                }

              </button>

            </div>

          </div>

        </form>

      </div>

    </div>


    {/* ================= INFORMATION PANEL ================= */}

    <div className="lg:col-span-2">

      <div className="
        bg-white
        border
        border-border
        rounded-lg
        p-8
        shadow-card
        h-full
      ">

        <div className="
          w-12
          h-12
          rounded-lg
          bg-primary-light
          flex
          items-center
          justify-center
          mb-6
        ">

          <Clock className="w-6 h-6 text-primary" />

        </div>


        <h3 className="
          text-xl
          font-semibold
          text-text-primary
          tracking-tight
          mb-4
        ">
          Smart Recall System
        </h3>


        <p className="
          text-sm
          font-medium
          text-text-secondary
          leading-relaxed
          mb-8
        ">

          Our automated engine will notify employees exactly at the scheduled
          time via WhatsApp. Perfect for deadlines, meetings, and updates.

        </p>


        <div className="space-y-3">


          <div className="
            flex
            items-center
            gap-3
            p-4
            bg-background
            border
            border-border
            rounded-lg
          ">

            <div className="w-2 h-2 rounded-full bg-success" />

            <span className="
              text-[10px]
              font-medium
              text-text-primary
              uppercase
              tracking-widest
            ">

              Real-time Delivery

            </span>

          </div>


          <div className="
            flex
            items-center
            gap-3
            p-4
            bg-background
            border
            border-border
            rounded-lg
          ">

            <div className="w-2 h-2 rounded-full bg-primary" />

            <span className="
              text-[10px]
              font-medium
              text-text-primary
              uppercase
              tracking-widest
            ">

              Employee Tracking

            </span>

          </div>

        </div>

      </div>

    </div>

  </div>


  {/* ================= REMINDER HISTORY ================= */}

  <div className="
    bg-white
    border
    border-border
    rounded-lg
    p-8
    shadow-card
  ">


    {/* History Header */}

    <div className="
      flex
      flex-col
      lg:flex-row
      lg:items-center
      justify-between
      gap-6
      mb-8
    ">

      <div className="flex items-center gap-4">

        <div className="
          w-11
          h-11
          bg-primary-light
          rounded-lg
          flex
          items-center
          justify-center
        ">

          <History className="w-5 h-5 text-primary" />

        </div>


        <div>

          <h3 className="
            text-xl
            font-semibold
            text-text-primary
            tracking-tight
            mb-1
          ">

            Reminder History

          </h3>


          <p className="
            text-[10px]
            font-medium
            text-text-secondary
            uppercase
            tracking-widest
          ">

            All scheduled & delivered notifications

          </p>

        </div>

      </div>

    </div>


    {/* ================= HISTORY LIST ================= */}

    <div className="space-y-3">

      {history.length === 0 ? (

        <div className="
          bg-background
          border
          border-dashed
          border-border
          rounded-lg
          py-20
          text-center
        ">

          <div className="
            w-12
            h-12
            bg-primary-light
            rounded-lg
            flex
            items-center
            justify-center
            mx-auto
            mb-5
          ">

            <Timer className="w-5 h-5 text-primary" />

          </div>


          <p className="
            text-[10px]
            font-medium
            text-text-secondary
            uppercase
            tracking-widest
          ">

            No reminders yet

          </p>

        </div>

      ) : (

        history.map((item) => {

          const badge = getStatusBadge(item.status);

          return (

            <div
              key={item.id}
              className="
                bg-white
                p-5
                rounded-lg
                border
                border-border
                flex
                items-center
                justify-between
                gap-6
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


                {/* Status Icon */}

                <div className="
                  w-10
                  h-10
                  bg-background
                  rounded-lg
                  flex
                  items-center
                  justify-center
                  text-text-secondary
                  shrink-0
                ">

                  {item.status === 'sent'
                    ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    )
                    : (
                      <Clock className="w-5 h-5 text-primary" />
                    )}

                </div>


                {/* Reminder Details */}

                <div className="min-w-0 flex-1">

                  <div className="flex items-center gap-3 mb-1">

                    <span className="
                      text-sm
                      font-semibold
                      text-text-primary
                      truncate
                    ">

                      {item.name || 'Staff'}

                    </span>


                    <div
                      className={`
                        inline-flex
                        items-center
                        gap-2
                        px-3
                        py-1
                        rounded-full
                        border
                        text-[9px]
                        font-medium
                        uppercase
                        tracking-widest
                        ${badge.bg}
                        ${badge.text}
                      `}
                    >

                      <div
                        className={`
                          w-1.5
                          h-1.5
                          rounded-full
                          ${badge.dot}
                        `}
                      />

                      {badge.label}

                    </div>

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


              {/* Date & Time */}

              <div className="text-right shrink-0">

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

          );

        })

      )}

    </div>


    {/* ================= PAGINATION ================= */}

    {historyTotal > 5 && (

      <div className="
        flex
        justify-center
        items-center
        gap-6
        mt-8
      ">

        <button
          disabled={historyPage === 0}
          onClick={() =>
            setHistoryPage(historyPage - 1)
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

          {historyPage + 1}

          <span className="text-text-secondary mx-2">
            /
          </span>

          {Math.ceil(historyTotal / 5)}

        </span>


        <button
          disabled={
            (historyPage + 1) * 5 >= historyTotal
          }
          onClick={() =>
            setHistoryPage(historyPage + 1)
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

export default Reminders;

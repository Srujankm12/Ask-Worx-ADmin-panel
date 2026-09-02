import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow, isToday, parseISO, differenceInCalendarDays } from 'date-fns';
import {
  UserPlus,
  Megaphone,
  BellPlus,
  Search,
  Trash2,
  MapPin,
  Check,
  X,
  AlertCircle,
  Clock,
  Inbox,
} from 'lucide-react';

import {
  getEmployees,
  addEmployee,
  deleteEmployee,
  getAttendance,
  getLeaveRequests,
  updateLeaveStatus,
  getRemindersHistory,
  createReminder,
  sendAnnouncement,
} from '../api';

import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Tabs } from '../components/ui/tabs';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../components/ui/dialog';
import { Reveal } from '../components/motion/Reveal';
import { cn } from '../lib/utils';

/**
 * Team — the whole of team administration on one screen.
 *
 * This replaces seven nav items (Employees, Attendance, Work Plans,
 * End-of-Day Reports, Leave Requests, Scheduled Reminders, Announcements)
 * that each held one column of the same story. Answering "what is Sandeep
 * doing today, is his leave approved, and did he get the site reminder?" used
 * to mean opening four pages and matching people up by eye.
 *
 * Three areas, because an administrator arrives with one of three questions:
 *   People    — "tell me about this person"
 *   Approvals — "what is waiting on me"
 *   Messages  — "what has the bot been told to send"
 */

const AREAS = [
  { value: 'people', label: 'People' },
  { value: 'approvals', label: 'Leave' },
  { value: 'messages', label: 'Messages' },
];

/**
 * Leave used to be visible only one person at a time — to find out who was off
 * next week you opened six profiles in turn. This filter puts the whole team's
 * register on one screen, opening on the requests that need a decision.
 */
const LEAVE_FILTERS = [
  { value: 'pending', label: 'Awaiting decision' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All requests' },
];

const PERSON_TABS = [
  { value: 'today', label: 'Today' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'leave', label: 'Leave' },
  { value: 'reminders', label: 'Reminders' },
];

const LEAVE_STATUS = {
  pending: { label: 'Awaiting decision', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

// Ordered so the roster reads as a shift board: who is working, then who has
// finished, then who is not in.
const PRESENCE_ORDER = { onDuty: 0, complete: 1, leave: 2, absent: 3 };

const PRESENCE = {
  onDuty: { label: 'On duty', dot: 'bg-success', variant: 'success' },
  complete: { label: 'Day complete', dot: 'bg-titanium', variant: 'outline' },
  leave: { label: 'On leave', dot: 'bg-titanium-300', variant: 'muted' },
  absent: { label: 'Not started', dot: 'bg-line-strong', variant: 'muted' },
};

const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const Avatar = ({ name, size = 'md', active }) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex shrink-0 items-center justify-center rounded-full font-heading font-bold',
      size === 'lg' ? 'size-12 text-[15px]' : 'size-9 text-[12px]',
      active ? 'bg-ink text-champagne-100' : 'bg-paper text-titanium-700 ring-1 ring-border',
    )}
  >
    {initials(name)}
  </span>
);

const Team = () => {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leave, setLeave] = useState([]);
  const [reminders, setReminders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [area, setArea] = useState('people');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('today');

  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
  const [dialog, setDialog] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [leaveFilter, setLeaveFilter] = useState('pending');
  const [announceScope, setAnnounceScope] = useState('all');
  const [announceTo, setAnnounceTo] = useState([]);

  const notify = (title, message, type = 'success') =>
    setModal({ open: true, title, message, type });

  const loadAll = useCallback(async () => {
    setLoadError('');
    try {
      const [emp, att, lv, rem] = await Promise.all([
        getEmployees({ limit: 200, offset: 0 }),
        getAttendance({ limit: 300, offset: 0 }),
        getLeaveRequests({ limit: 200, offset: 0 }),
        getRemindersHistory({ limit: 300, offset: 0 }),
      ]);

      const list = emp.data?.data || [];
      setEmployees(list);
      setAttendance(att.data?.data || []);
      setLeave(lv.data?.data || []);
      setReminders(rem.data?.data || []);
      setSelectedId((current) => current ?? list[0]?.id ?? null);
    } catch (err) {
      console.error(err);
      setLoadError(
        'Could not load the team. The server did not respond — check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Attendance is returned keyed by employee_name rather than phone, so
  // records have to be matched by name. Every other endpoint keys on phone;
  // this one should too. Flagged in the audit.
  const presenceOf = useCallback(
    (person) => {
      const today = attendance.find(
        (a) => a.employee_name === person.name && a.date && isToday(parseISO(a.date)),
      );
      const onLeave = leave.some(
        (l) =>
          l.employee_phone === person.phone &&
          l.status === 'approved' &&
          l.leave_date === format(new Date(), 'yyyy-MM-dd'),
      );

      if (onLeave) return 'leave';
      if (today?.check_in && !today.check_out) return 'onDuty';
      if (today?.check_out) return 'complete';
      return 'absent';
    },
    [attendance, leave],
  );

  const selected = employees.find((e) => e.id === selectedId) || null;

  const detail = useMemo(() => {
    if (!selected) return { attendance: [], leave: [], reminders: [] };
    return {
      attendance: selected
        ? attendance
            .filter((a) => a.employee_name === selected.name)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
        : [],
      leave: leave.filter((l) => l.employee_phone === selected.phone),
      reminders: reminders.filter((r) => r.phone === selected.phone),
    };
  }, [selected, attendance, leave, reminders]);

  const todayRecord = detail.attendance.find((a) => a.date && isToday(parseISO(a.date)));

  const pendingLeave = useMemo(
    () => leave.filter((l) => l.status === 'pending'),
    [leave],
  );

  const visibleLeave = useMemo(() => {
    const rows = leaveFilter === 'all' ? leave : leave.filter((l) => l.status === leaveFilter);
    // Requests awaiting a decision read forwards — the soonest date is the most
    // urgent. Everything already decided reads backwards, newest first.
    return [...rows].sort((a, b) =>
      leaveFilter === 'pending'
        ? new Date(a.leave_date) - new Date(b.leave_date)
        : new Date(b.leave_date) - new Date(a.leave_date),
    );
  }, [leave, leaveFilter]);

  /**
   * An announcement is stored as one identical row per recipient in the same
   * table as reminders, with no marker to tell them apart. Rows sharing a
   * message and a timestamp were therefore one broadcast, and are shown as
   * one entry — otherwise a note to six people appears six times.
   */
  const messageFeed = useMemo(() => {
    const groups = new Map();

    reminders.forEach((row) => {
      const key = `${row.description}::${row.due_at}`;
      const existing = groups.get(key);
      if (existing) {
        existing.recipients.push(row.name || row.phone);
      } else {
        groups.set(key, {
          key,
          description: row.description,
          dueAt: row.due_at,
          status: row.status,
          recipients: [row.name || row.phone],
        });
      }
    });

    return [...groups.values()]
      .map((group) => ({ ...group, isBroadcast: group.recipients.length > 1 }))
      .sort((a, b) => new Date(b.dueAt) - new Date(a.dueAt));
  }, [reminders]);

  const summary = useMemo(() => {
    const counts = { onDuty: 0, complete: 0, leave: 0, absent: 0 };
    employees.forEach((person) => {
      counts[presenceOf(person)] += 1;
    });
    return {
      ...counts,
      pendingLeave: pendingLeave.length,
      queued: reminders.filter((r) => r.status === 'pending').length,
    };
  }, [employees, presenceOf, pendingLeave, reminders]);

  const roster = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter(
        (e) =>
          !q ||
          e.name?.toLowerCase().includes(q) ||
          e.role?.toLowerCase().includes(q) ||
          e.phone?.includes(q),
      )
      .map((e) => ({ ...e, presence: presenceOf(e) }))
      .sort(
        (a, b) =>
          PRESENCE_ORDER[a.presence] - PRESENCE_ORDER[b.presence] ||
          a.name.localeCompare(b.name),
      );
  }, [employees, search, presenceOf]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleAddEmployee = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await addEmployee({
        name: form.get('name'),
        phone: form.get('phone'),
        role: form.get('role'),
      });
      setDialog(null);
      await loadAll();
      notify('Employee added', `${form.get('name')} can now use the WhatsApp bot to check in.`);
    } catch (err) {
      console.error(err);
      notify(
        'Could not add the employee',
        'Nothing was saved. Check that the phone number is not already in use, then try again.',
        'error',
      );
    }
  };

  const handleRemoveEmployee = async () => {
    try {
      await deleteEmployee(confirmRemove.id);
      setSelectedId(null);
      await loadAll();
      notify('Employee removed', `${confirmRemove.name} no longer has access to the bot.`);
    } catch (err) {
      console.error(err);
      notify('Could not remove the employee', 'Nothing was changed. Please try again.', 'error');
    }
  };

  const handleLeaveDecision = async (request, status) => {
    try {
      await updateLeaveStatus(request.id, status);
      await loadAll();
      notify(
        status === 'approved' ? 'Leave approved' : 'Leave rejected',
        `${request.employee_name} has been notified on WhatsApp.`,
      );
    } catch (err) {
      console.error(err);
      notify('Could not update the request', 'Nothing was changed. Please try again.', 'error');
    }
  };

  const handleCreateReminder = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await createReminder({
        phone: form.get('phone'),
        description: form.get('description'),
        due_at: new Date(form.get('due_at')).toISOString(),
      });
      setDialog(null);
      await loadAll();
      notify('Reminder scheduled', 'The bot will send it on WhatsApp at the time you set.');
    } catch (err) {
      console.error(err);
      notify('Could not schedule the reminder', 'Nothing was saved. Please try again.', 'error');
    }
  };

  const handleAnnouncement = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phones = announceScope === 'all' ? [] : announceTo;
    const count = announceScope === 'all' ? employees.length : phones.length;

    try {
      await sendAnnouncement({ message: form.get('message'), phones });
      setDialog(null);
      setAnnounceScope('all');
      setAnnounceTo([]);
      await loadAll();
      notify('Announcement sent', `Delivered to ${count} ${count === 1 ? 'person' : 'people'} on WhatsApp.`);
    } catch (err) {
      console.error(err);
      notify('Could not send the announcement', 'Nothing was sent. Please try again.', 'error');
    }
  };

  const announceCount = announceScope === 'all' ? employees.length : announceTo.length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="size-7 animate-spin rounded-full border-2 border-line border-t-ink" />
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-titanium-700">
          Loading team
        </p>
      </div>
    );
  }

  return (
    <>
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      <ConfirmModal
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemoveEmployee}
        type="danger"
        title="Remove this employee?"
        message={
          confirmRemove
            ? `${confirmRemove.name} will lose access to the WhatsApp bot immediately. Their attendance and leave history stays on record. This cannot be undone.`
            : ''
        }
        confirmText="Remove employee"
      />

      <PageHeader
        eyebrow="Team management"
        title="Team"
        intro="Everyone who uses the WhatsApp bot to check in, file a day plan or request leave — with the approvals waiting on you and everything the bot has been told to send."
        action={
          <>
            <Button variant="outline" onClick={() => setDialog('announcement')}>
              <Megaphone />
              Send announcement
            </Button>
            <Button onClick={() => setDialog('employee')}>
              <UserPlus />
              Add employee
            </Button>
          </>
        }
      />

      {loadError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-light px-4 py-3.5"
        >
          <AlertCircle className="mt-1 size-4 shrink-0 text-danger" />
          <div>
            <p className="text-[13px] font-medium text-danger">{loadError}</p>
            <button
              type="button"
              onClick={loadAll}
              className="mt-1 text-[13px] font-medium text-danger underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <Reveal>
        <div className="hairline-grid mb-6 grid grid-cols-2 overflow-hidden rounded-xl xl:grid-cols-4">
          {/* Only one of these four asks anything of the reader. It is the
              only one that is tinted, striped and clickable — the other three
              stay quiet so it can be seen without reading all four. */}
          <StatCard
            label="On duty now"
            value={summary.onDuty}
            color="success"
            tone="live"
            hint={`Checked in, not yet out · of ${employees.length}`}
          />
          <StatCard
            label="Day complete"
            value={summary.complete}
            color="titanium"
            hint="Checked out today"
          />
          <StatCard
            label="Waiting on you"
            value={summary.pendingLeave}
            tone="attention"
            hint={
              summary.pendingLeave === 1
                ? '1 leave request needs a decision'
                : `${summary.pendingLeave} leave requests need a decision`
            }
            zeroHint="Every request has been decided"
            actionLabel="Review"
            onClick={() => {
              setLeaveFilter('pending');
              setArea('approvals');
            }}
          />
          <StatCard
            label="Queued to send"
            value={summary.queued}
            color="muted"
            hint="Reminders the bot has not sent yet"
          />
        </div>
      </Reveal>

      <Reveal delay={0.04}>
        <div className="mb-6">
          <Tabs
            value={area}
            onValueChange={setArea}
            layoutId="team-area"
            items={AREAS.map((a) => ({
              ...a,
              count:
                a.value === 'approvals'
                  ? summary.pendingLeave || undefined
                  : a.value === 'people'
                    ? employees.length
                    : undefined,
            }))}
          />
        </div>
      </Reveal>

      {/* ── People ───────────────────────────────────────────────────────── */}
      {area === 'people' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <Reveal delay={0.06}>
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
              <div className="border-b border-border p-3">
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-titanium-700"
                  />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name or role"
                    aria-label="Search team members"
                    className="pl-9"
                  />
                </div>
              </div>

              <ul className="max-h-[600px] overflow-y-auto">
                {roster.map((person) => {
                  const presence = PRESENCE[person.presence];
                  const active = person.id === selectedId;

                  return (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(person.id)}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors',
                          active ? 'bg-champagne-100' : 'hover:bg-paper',
                        )}
                      >
                        <Avatar name={person.name} active={active} />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink">
                            {person.name}
                          </span>
                          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-text-secondary">
                            <span aria-hidden="true" className={cn('size-1.5 rounded-full', presence.dot)} />
                            {presence.label}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}

                {roster.length === 0 && (
                  <li className="px-4 py-12 text-center">
                    <p className="text-[13px] leading-relaxed text-text-secondary">
                      {employees.length === 0
                        ? 'No employees yet. Add one so they can check in through WhatsApp.'
                        : 'Nobody matches that search.'}
                    </p>
                  </li>
                )}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {!selected ? (
              <EmptyPanel
                title="Select someone"
                body="Pick a name on the left to see their attendance, day plans, end-of-day reports, leave and reminders together."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={selected.name} size="lg" active />
                    <div>
                      <h2 className="font-heading text-lg font-bold uppercase leading-tight tracking-tight text-ink">
                        {selected.name}
                      </h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-text-secondary">
                        <span>{selected.role || 'No role recorded'}</span>
                        <span aria-hidden="true" className="text-titanium-300">·</span>
                        <span className="font-mono text-[12px]">+{selected.phone}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={PRESENCE[presenceOf(selected)].variant}>
                      {PRESENCE[presenceOf(selected)].label}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setDialog('reminder')}>
                      <BellPlus />
                      Set reminder
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="destructive-outline"
                      aria-label={`Remove ${selected.name}`}
                      title={`Remove ${selected.name}`}
                      onClick={() => setConfirmRemove(selected)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <PersonFacts detail={detail} />

                <div className="border-b border-border px-5 py-3">
                  <Tabs
                    value={tab}
                    onValueChange={setTab}
                    layoutId="team-person-tab"
                    items={PERSON_TABS.map((t) => ({
                      ...t,
                      count:
                        t.value === 'leave'
                          ? detail.leave.filter((l) => l.status === 'pending').length || undefined
                          : t.value === 'reminders'
                            ? detail.reminders.filter((r) => r.status === 'pending').length || undefined
                            : undefined,
                    }))}
                  />
                </div>

                <div className="p-5">
                  {tab === 'today' && <TodayPanel record={todayRecord} name={selected.name} />}
                  {tab === 'attendance' && <AttendancePanel records={detail.attendance} />}
                  {tab === 'leave' && (
                    <LeavePanel requests={detail.leave} onDecide={handleLeaveDecision} />
                  )}
                  {tab === 'reminders' && (
                    <RemindersPanel
                      reminders={detail.reminders}
                      onAdd={() => setDialog('reminder')}
                    />
                  )}
                </div>
              </div>
            )}
          </Reveal>
        </div>
      )}

      {/* ── Approvals ────────────────────────────────────────────────────── */}
      {area === 'approvals' && (
        <Reveal delay={0.06}>
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
            <div className="border-b border-border px-5 py-4">
              <p className="eyebrow">Whole team</p>
              <h2 className="mt-2 font-heading text-base font-bold uppercase tracking-tight text-ink">
                Leave register
              </h2>
              <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-text-secondary">
                Every leave request from everyone, in one list. Employees file
                them through the bot; whichever you choose, they are notified on
                WhatsApp straight away.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Tabs
                  value={leaveFilter}
                  onValueChange={setLeaveFilter}
                  layoutId="team-leave-filter"
                  items={LEAVE_FILTERS.map((f) => ({
                    ...f,
                    count:
                      f.value === 'all'
                        ? leave.length
                        : leave.filter((l) => l.status === f.value).length,
                  }))}
                />
                <p className="text-[13px] text-text-secondary">
                  {visibleLeave.length} {visibleLeave.length === 1 ? 'request' : 'requests'}
                </p>
              </div>
            </div>

            {visibleLeave.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Inbox aria-hidden="true" className="mx-auto size-6 text-titanium-300" />
                <p className="mt-3 font-heading text-base font-bold uppercase tracking-tight text-ink">
                  {leaveFilter === 'pending' ? 'Nothing waiting on you' : 'No requests here'}
                </p>
                <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-text-secondary">
                  {leaveFilter === 'pending'
                    ? 'Every leave request has been decided. New ones appear here the moment someone files one through the bot.'
                    : 'Nothing matches this filter. Switch to "All requests" to see the full register.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visibleLeave.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-paper"
                  >
                    <div className="flex min-w-0 gap-3">
                      <Avatar name={request.employee_name} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-[13px] font-medium text-ink">
                            {request.employee_name}
                          </p>
                          <span aria-hidden="true" className="text-titanium-300">·</span>
                          <p className="text-[13px] text-text-secondary">{request.leave_type}</p>
                        </div>

                        <p className="mt-1 text-[13px] text-text-secondary">
                          {format(parseISO(request.leave_date), 'EEEE d MMMM yyyy')}
                          {' — '}
                          <RelativeDay date={request.leave_date} />
                        </p>

                        {request.reason && (
                          <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-body-text">
                            {request.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    {request.status === 'pending' ? (
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="success" onClick={() => handleLeaveDecision(request, 'approved')}>
                          <Check />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive-outline"
                          onClick={() => handleLeaveDecision(request, 'rejected')}
                        >
                          <X />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={(LEAVE_STATUS[request.status] || LEAVE_STATUS.pending).variant}>
                        {(LEAVE_STATUS[request.status] || LEAVE_STATUS.pending).label}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      {area === 'messages' && (
        <Reveal delay={0.06}>
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <p className="eyebrow">Outbound</p>
                <h2 className="mt-2 font-heading text-base font-bold uppercase tracking-tight text-ink">
                  What the bot has been told to send
                </h2>
                <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-text-secondary">
                  Reminders go to one person at a set time. Announcements go to
                  the team at once. Both are listed here, newest first.
                </p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDialog('reminder')}>
                  <BellPlus />
                  Schedule reminder
                </Button>
                <Button size="sm" onClick={() => setDialog('announcement')}>
                  <Megaphone />
                  Send announcement
                </Button>
              </div>
            </div>

            {messageFeed.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                  Nothing sent or scheduled
                </p>
                <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-text-secondary">
                  Schedule a reminder for one person, or send an announcement to
                  the whole team. Both appear here once created.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {messageFeed.map((entry) => (
                  <li key={entry.key} className="px-5 py-4 transition-colors hover:bg-paper">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={entry.isBroadcast ? 'secondary' : 'outline'}>
                            {entry.isBroadcast ? 'Announcement' : 'Reminder'}
                          </Badge>
                          <Badge variant={entry.status === 'sent' ? 'muted' : 'warning'}>
                            {entry.status === 'sent' ? 'Sent' : 'Queued'}
                          </Badge>
                        </div>

                        <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-body-text">
                          {entry.description}
                        </p>

                        <p className="mt-2 text-[12px] text-text-secondary">
                          {entry.isBroadcast
                            ? `${entry.recipients.length} recipients`
                            : `To ${entry.recipients[0]}`}
                        </p>
                      </div>

                      <p className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-titanium-700">
                        <Clock aria-hidden="true" className="size-3.5" />
                        {formatDistanceToNow(parseISO(entry.dueAt), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}

      <Dialog open={dialog === 'employee'} onClose={() => setDialog(null)} labelledBy="add-employee">
        <DialogHeader
          id="add-employee"
          eyebrow="Team management"
          title="Add an employee"
          description="They will be able to check in, file a day plan and request leave through the WhatsApp bot using this number."
          onClose={() => setDialog(null)}
        />
        <form onSubmit={handleAddEmployee}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name">Full name</Label>
              <Input id="emp-name" name="name" required placeholder="Sandeep Kulkarni" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-phone">WhatsApp number</Label>
              <Input id="emp-phone" name="phone" required placeholder="919876543210" inputMode="numeric" />
              <p className="text-[12px] leading-relaxed text-text-secondary">
                Country code first, no plus sign or spaces. This is the number
                the bot will recognise when they message it.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-role">Role</Label>
              <Input id="emp-role" name="role" placeholder="Field Engineer" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="submit">Add employee</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={dialog === 'reminder'} onClose={() => setDialog(null)} labelledBy="add-reminder">
        <DialogHeader
          id="add-reminder"
          eyebrow="Scheduled message"
          title="Schedule a reminder"
          description="The bot sends this on WhatsApp at the time you choose. It goes to one person."
          onClose={() => setDialog(null)}
        />
        <form onSubmit={handleCreateReminder}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rem-phone">Send to</Label>
              <Select id="rem-phone" name="phone" defaultValue={selected?.phone} required>
                {employees.map((person) => (
                  <option key={person.id} value={person.phone}>
                    {person.name} — {person.role || 'No role'}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rem-desc">What to remind them about</Label>
              <Textarea
                id="rem-desc"
                name="description"
                required
                rows={3}
                placeholder="Collect the signed handover note from Northline Polymers."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rem-due">Send at</Label>
              <Input id="rem-due" name="due_at" type="datetime-local" required />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="submit">Schedule reminder</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog
        open={dialog === 'announcement'}
        onClose={() => setDialog(null)}
        labelledBy="send-announcement"
        size="lg"
      >
        <DialogHeader
          id="send-announcement"
          eyebrow="Broadcast"
          title="Send an announcement"
          description="Goes out on WhatsApp immediately. Choose who receives it."
          onClose={() => setDialog(null)}
        />
        <form onSubmit={handleAnnouncement}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-message">Message</Label>
              <Textarea
                id="ann-message"
                name="message"
                required
                rows={5}
                placeholder="The office will be closed on Friday for maintenance. Please plan site visits accordingly."
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-[13px] font-medium text-ink">Recipients</legend>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={announceScope === 'all' ? 'default' : 'outline'}
                  onClick={() => setAnnounceScope('all')}
                >
                  Everyone ({employees.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={announceScope === 'some' ? 'default' : 'outline'}
                  onClick={() => setAnnounceScope('some')}
                >
                  Choose people
                </Button>
              </div>

              {announceScope === 'some' && (
                <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-border">
                  {employees.map((person) => {
                    const checked = announceTo.includes(person.phone);
                    return (
                      <label
                        key={person.id}
                        className="flex cursor-pointer items-center gap-3 border-b border-border px-3.5 py-2.5 last:border-0 hover:bg-paper"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setAnnounceTo((current) =>
                              checked
                                ? current.filter((p) => p !== person.phone)
                                : [...current, person.phone],
                            )
                          }
                          className="size-4 accent-[#1C1A17]"
                        />
                        <span className="text-[13px] text-ink">{person.name}</span>
                        <span className="text-[12px] text-text-secondary">
                          {person.role || 'No role'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            {/* Say what the button will do before it does it. */}
            <div className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning-light px-4 py-3">
              <AlertCircle aria-hidden="true" className="mt-1 size-4 shrink-0 text-warning" />
              <p className="text-[13px] leading-relaxed text-warning">
                {announceCount === 0
                  ? 'No recipients selected yet.'
                  : `Sends immediately to ${announceCount} ${announceCount === 1 ? 'person' : 'people'}. A sent message cannot be recalled.`}
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={announceCount === 0}>
              Send to {announceCount} {announceCount === 1 ? 'person' : 'people'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
};

// ── Pieces ──────────────────────────────────────────────────────────────────

const EmptyPanel = ({ title, body }) => (
  <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-border bg-white p-10 text-center shadow-card">
    <div>
      <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed text-text-secondary">
        {body}
      </p>
    </div>
  </div>
);

const RelativeDay = ({ date }) => {
  const days = differenceInCalendarDays(parseISO(date), new Date());
  if (days === 0) return <>today</>;
  if (days === 1) return <>tomorrow</>;
  if (days === -1) return <>yesterday</>;
  return <>{days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`}</>;
};

/** Four figures about this person, all derived from their own records. */
const PersonFacts = ({ detail }) => {
  const daysPresent = detail.attendance.filter((a) => a.check_in).length;
  const reportsFiled = detail.attendance.filter((a) => a.eod_report).length;
  const leaveTaken = detail.leave.filter((l) => l.status === 'approved').length;
  const openReminders = detail.reminders.filter((r) => r.status === 'pending').length;

  const facts = [
    { label: 'Days recorded', value: daysPresent },
    { label: 'Reports filed', value: reportsFiled },
    { label: 'Leave approved', value: leaveTaken },
    { label: 'Reminders queued', value: openReminders },
  ];

  return (
    <div className="hairline-grid grid grid-cols-2 border-x-0 border-t-0 sm:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="bg-white px-5 py-3.5">
          <p className="spec-label">{fact.label}</p>
          <p className="mt-1 font-heading text-xl font-bold leading-none tabular-nums text-ink">
            {fact.value}
          </p>
        </div>
      ))}
    </div>
  );
};

const Field = ({ label, children, empty }) => (
  <div>
    <p className="spec-label">{label}</p>
    {children ? (
      <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-body-text">{children}</p>
    ) : (
      <p className="mt-2 text-[13px] italic text-muted-text">{empty}</p>
    )}
  </div>
);

const TodayPanel = ({ record, name }) => {
  if (!record) {
    return (
      <div className="py-12 text-center">
        <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
          Not started today
        </p>
        <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-text-secondary">
          {name} has not checked in. Attendance is recorded when they send their
          location to the bot — nothing needs to be entered here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="hairline-grid grid grid-cols-1 overflow-hidden rounded-lg sm:grid-cols-3">
        <div className="bg-white p-4">
          <p className="spec-label">Checked in</p>
          <p className="mt-2 font-heading text-lg font-bold text-ink">
            {record.check_in ? format(parseISO(record.check_in), 'h:mm a') : '—'}
          </p>
        </div>
        <div className="bg-white p-4">
          <p className="spec-label">Checked out</p>
          <p className="mt-2 font-heading text-lg font-bold text-ink">
            {record.check_out ? format(parseISO(record.check_out), 'h:mm a') : 'Still on duty'}
          </p>
        </div>
        <div className="bg-white p-4">
          <p className="spec-label">Check-in location</p>
          {record.check_in_lat ? (
            <a
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink underline underline-offset-4 hover:text-titanium-700"
              href={`https://www.google.com/maps?q=${record.check_in_lat},${record.check_in_lng}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin aria-hidden="true" className="size-3.5" />
              View on map
            </a>
          ) : (
            <p className="mt-2 text-[13px] italic text-muted-text">Not shared</p>
          )}
        </div>
      </div>

      <Field label="Plan for the day" empty="No day plan filed.">
        {record.work_plan}
      </Field>

      <Field
        label="End-of-day report"
        empty={
          record.check_out
            ? 'Checked out without filing a report.'
            : 'Not filed yet — still on duty.'
        }
      >
        {record.eod_report}
      </Field>
    </div>
  );
};

const AttendancePanel = ({ records }) => {
  if (records.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-text-secondary">
        No attendance recorded yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {records.map((record) => (
        <li key={record.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-heading text-[15px] font-bold uppercase tracking-tight text-ink">
              {format(parseISO(record.date), 'EEEE d MMMM')}
            </p>
            <p className="font-mono text-[11px] text-titanium-700">
              {record.check_in ? format(parseISO(record.check_in), 'h:mm a') : '—'}
              {' → '}
              {record.check_out ? format(parseISO(record.check_out), 'h:mm a') : 'still on duty'}
            </p>
          </div>

          {record.work_plan && (
            <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-body-text">
              <span className="text-titanium-700">Plan · </span>
              {record.work_plan}
            </p>
          )}
          {record.eod_report && (
            <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-body-text">
              <span className="text-titanium-700">Report · </span>
              {record.eod_report}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
};

const LeavePanel = ({ requests, onDecide }) => {
  if (requests.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] leading-relaxed text-text-secondary">
        No leave requested. Requests arrive here when this person files one
        through the bot.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {requests.map((request) => {
        const status = LEAVE_STATUS[request.status] || LEAVE_STATUS.pending;

        return (
          <li
            key={request.id}
            className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading text-[15px] font-bold uppercase tracking-tight text-ink">
                  {request.leave_type}
                </p>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              <p className="mt-1 text-[13px] text-text-secondary">
                {format(parseISO(request.leave_date), 'EEEE d MMMM yyyy')}
              </p>

              {request.reason && (
                <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-body-text">
                  {request.reason}
                </p>
              )}
            </div>

            {request.status === 'pending' && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="success" onClick={() => onDecide(request, 'approved')}>
                  <Check />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive-outline"
                  onClick={() => onDecide(request, 'rejected')}
                >
                  <X />
                  Reject
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

const RemindersPanel = ({ reminders, onAdd }) => {
  if (reminders.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-text-secondary">No reminders set for this person.</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={onAdd}>
          <BellPlus />
          Schedule a reminder
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {reminders.map((reminder) => (
        <li
          key={reminder.id}
          className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="max-w-[62ch] text-[13px] leading-relaxed text-body-text">
              {reminder.description}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-text-secondary">
              <Clock aria-hidden="true" className="size-3.5" />
              {reminder.status === 'sent' ? 'Sent ' : 'Sends '}
              {formatDistanceToNow(parseISO(reminder.due_at), { addSuffix: true })}
            </p>
          </div>

          <Badge variant={reminder.status === 'sent' ? 'muted' : 'warning'}>
            {reminder.status === 'sent' ? 'Sent' : 'Queued'}
          </Badge>
        </li>
      ))}
    </ul>
  );
};

export default Team;

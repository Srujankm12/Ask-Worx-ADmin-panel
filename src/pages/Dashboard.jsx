import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  formatDistanceToNow,
  parseISO,
  subDays,
  startOfDay,
  isSameDay,
} from 'date-fns';
import { ArrowRight, AlertCircle } from 'lucide-react';

import { getStats, getLeads, getMessages, getCallbacks, getLeaveRequests } from '../api';
import { formatSlug } from '../utils';
import { getLeadStatus } from '../lib/leadStatus';

import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import ActivityChart from '../components/charts/ActivityChart';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '../components/ui/table';
import { Reveal } from '../components/motion/Reveal';

const EMPTY_STATS = {
  total_contacts: 0,
  total_leads: 0,
  pending_callbacks: 0,
  new_leads: 0,
  total_messages: 0,
};

const REFRESH_MS = 30000;
const WINDOW_DAYS = 14;

const Dashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState(EMPTY_STATS);
  const [leads, setLeads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [leave, setLeave] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [statsRes, leadsRes, msgRes, cbRes, lvRes] = await Promise.all([
        getStats(),
        getLeads({ limit: 100, offset: 0 }),
        getMessages({ limit: 1000, offset: 0 }),
        getCallbacks(),
        getLeaveRequests({ limit: 100, offset: 0 }),
      ]);

      setStats(statsRes.data || EMPTY_STATS);
      setLeads(leadsRes.data?.data || leadsRes.data || []);
      setMessages(msgRes.data?.data || msgRes.data || []);
      setCallbacks(Array.isArray(cbRes.data) ? cbRes.data : cbRes.data?.data || []);
      setLeave(lvRes.data?.data || []);
    } catch (err) {
      console.error(err);
      setLoadError(
        'Could not load the dashboard. The server did not respond — check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  // ── Fourteen days of conversation volume ──────────────────────────────────
  // Bucketed here rather than asked of the server, because the messages
  // endpoint has no date grouping. Every day in the window gets a bucket even
  // when it is empty, so a quiet weekend reads as quiet rather than vanishing.
  const activity = useMemo(() => {
    const today = startOfDay(new Date());
    const buckets = Array.from({ length: WINDOW_DAYS }, (_, i) => {
      const date = subDays(today, WINDOW_DAYS - 1 - i);
      return {
        iso: date.toISOString(),
        date,
        label: format(date, 'EEEE d MMMM'),
        short: format(date, 'd'),
        in: 0,
        out: 0,
      };
    });

    messages.forEach((m) => {
      if (!m.sent_at) return;
      const when = parseISO(m.sent_at);
      const bucket = buckets.find((b) => isSameDay(b.date, when));
      if (!bucket) return;
      if (m.direction === 'incoming') bucket.in += 1;
      else bucket.out += 1;
    });

    return buckets;
  }, [messages]);

  // ── The queue: everything a person has to do something about ──────────────
  const queue = useMemo(
    () =>
      [
        {
          key: 'leads',
          count: leads.filter((l) => l.status === 'new').length,
          one: 'lead nobody has contacted',
          many: 'leads nobody has contacted',
          to: '/leads',
        },
        {
          key: 'callbacks',
          count: callbacks.filter((c) => c.status === 'pending').length,
          one: 'customer waiting for a call',
          many: 'customers waiting for a call',
          to: '/callbacks',
        },
        {
          key: 'leave',
          count: leave.filter((l) => l.status === 'pending').length,
          one: 'leave request to decide',
          many: 'leave requests to decide',
          to: '/team',
        },
      ].filter((item) => item.count > 0),
    [leads, callbacks, leave],
  );

  const recentLeads = leads.slice(0, 8);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="size-7 animate-spin rounded-full border-2 border-line border-t-ink" />
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-titanium-700">
          Loading overview
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="WhatsApp bot"
        title="Overview"
        intro="What the bot has handled, and what is waiting on somebody. Figures refresh on their own every 30 seconds."
      />

      {loadError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-light px-4 py-3"
        >
          <AlertCircle aria-hidden="true" className="mt-1 size-4 shrink-0 text-danger" />
          <div>
            <p className="text-[13px] font-medium text-danger">{loadError}</p>
            <button
              type="button"
              onClick={load}
              className="mt-1 text-[13px] font-medium text-danger underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <Reveal>
        <div className="hairline-grid mb-6 grid grid-cols-1 overflow-hidden rounded-xl sm:grid-cols-3">
          <StatCard
            label="New leads"
            value={stats.new_leads}
            tone="attention"
            hint={
              stats.new_leads === 1
                ? '1 lead nobody has contacted'
                : `${stats.new_leads} leads nobody has contacted`
            }
            zeroHint="Every lead has been picked up"
            actionLabel="Open leads"
            onClick={() => navigate('/leads')}
          />
          <StatCard
            label="Pending callbacks"
            value={stats.pending_callbacks}
            tone="waiting"
            hint={
              stats.pending_callbacks === 1
                ? '1 customer is waiting for a call'
                : `${stats.pending_callbacks} customers are waiting for a call`
            }
            zeroHint="No callbacks outstanding"
            actionLabel="Open callbacks"
            onClick={() => navigate('/callbacks')}
          />
          <StatCard
            label="Contacts"
            value={stats.total_contacts}
            hint="People who have messaged the bot"
          />
        </div>
      </Reveal>

      {/* The chart and the queue read together: what happened, and what to
          do about it. The table goes full width below — it is the one thing
          on this page that gains from the extra columns. */}
      {/* The chart and the queue read together: what happened, and what
          to do about it. The table goes full width beneath — it is the
          one thing on this page that gains from the extra columns. */}
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Reveal delay={0.06}>
            <Card>
              <CardHeader>
                <div>
                  <p className="eyebrow">Last {WINDOW_DAYS} days</p>
                  <CardTitle className="mt-2">Conversation volume</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ActivityChart days={activity} />
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <div>
        <Reveal delay={0.1}>
          {/* The queue. Only shows what is actually outstanding — an empty
              queue is a finished state, not a list of zeroes. */}
          <Card>
            <CardHeader>
              <div>
                <p className="eyebrow">Your queue</p>
                <CardTitle className="mt-2">Waiting on somebody</CardTitle>
              </div>
            </CardHeader>

            <CardContent>
              {queue.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                  <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                    Nothing outstanding
                  </p>
                  <p className="mt-2 max-w-[34ch] text-[13px] leading-relaxed text-text-secondary">
                    Every lead has been picked up, every callback made and every
                    leave request decided.
                  </p>
                </div>
              ) : (
                // `first:`/`last:` have to sit on the <li>. They were on
                // the button inside it, which is always both the first AND
                // the last child of its own <li> — so every row lost its top
                // padding and kept its bottom one, and none of them sat
                // evenly between the hairlines.
                <ul className="divide-y divide-border">
                  {queue.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => navigate(item.to)}
                        className="group/row flex w-full items-center gap-4 py-4 text-left"
                      >
                        {/* Fixed-width figure column, so the label starts on
                            the same vertical whether the count is 4 or 40. */}
                        <span className="w-7 shrink-0 font-heading text-xl font-extrabold leading-none tabular-nums text-ink">
                          {item.count}
                        </span>
                        <span className="flex-1 text-[13px] leading-snug text-body-text">
                          {item.count === 1 ? item.one : item.many}
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3.5 shrink-0 text-titanium-300 transition-all duration-300 group-hover/row:translate-x-0.5 group-hover/row:text-ink"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>
        </div>
      </div>

        <Reveal delay={0.14}>
          <Card>
            <CardHeader>
              <div>
                <p className="eyebrow">Latest activity</p>
                <CardTitle className="mt-2">Recent leads</CardTitle>
              </div>
              <CardAction>
                <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
                  View all
                  <ArrowRight />
                </Button>
              </CardAction>
            </CardHeader>

            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-[28%]">Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="w-40 text-center">Status</TableHead>
                  <TableHead className="w-44 text-right">Received</TableHead>
                </tr>
              </TableHeader>

              <TableBody>
                {recentLeads.map((lead, index) => {
                  const status = getLeadStatus(lead.status);

                  return (
                    <TableRow key={lead.id || index}>
                      <TableCell>
                        <p className="font-medium text-ink">
                          {lead.name ? formatSlug(lead.name) : 'Name not given'}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-titanium-700">
                          +{lead.phone}
                        </p>
                      </TableCell>

                      <TableCell className="text-text-secondary">
                        {lead.company ? formatSlug(lead.company) : 'Not given'}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant={status.badge}>
                          <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-right text-text-secondary">
                        {lead.created_at ? (
                          <span title={format(parseISO(lead.created_at), "d MMMM yyyy 'at' h:mm a")}>
                            {formatDistanceToNow(parseISO(lead.created_at), { addSuffix: true })}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {recentLeads.length === 0 && <TableEmpty colSpan={4}>No leads yet</TableEmpty>}
              </TableBody>
            </Table>
          </Card>
        </Reveal>
    </>
  );
};

export default Dashboard;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { AlertCircle, PhoneCall, RefreshCw } from 'lucide-react';

import { getCallbacks, markCallbackDone } from '../api';
import { formatSlug } from '../utils';
import { getCallbackStatus, CALLBACK_FILTERS } from '../lib/callbackStatus';

import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import PageHeader from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Tabs } from '../components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import { Reveal } from '../components/motion/Reveal';

const Callbacks = () => {
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeFilter, setActiveFilter] = useState('pending');
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
  const [pendingDone, setPendingDone] = useState(null);

  const fetchCallbacks = useCallback(async () => {
    setLoadError('');
    try {
      const resp = await getCallbacks();
      setCallbacks(Array.isArray(resp.data) ? resp.data : resp.data?.data || []);
    } catch (err) {
      // The failure has to reach the person using the page. Logged to the
      // console alone, it left them looking at an empty table that read as
      // "nothing outstanding" when in fact nothing had loaded.
      console.error(err);
      setLoadError(
        'Could not load callback requests. The server did not respond — check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCallbacks();
  }, [fetchCallbacks]);

  const markDone = async ({ id }) => {
    // 'done' is what the server writes. The optimistic update previously set
    // 'completed', which no status map knew, so the row changed wording the
    // moment it was clicked and changed back on the next load.
    setCallbacks((current) => current.map((c) => (c.id === id ? { ...c, status: 'done' } : c)));

    try {
      await markCallbackDone(id);
    } catch (err) {
      console.error(err);
      setCallbacks((current) =>
        current.map((c) => (c.id === id ? { ...c, status: 'pending' } : c)),
      );
      setModal({
        open: true,
        title: 'Could not mark it done',
        message:
          'The request is still showing as waiting, and nothing was changed. Check your connection and try again.',
        type: 'error',
      });
    }
  };

  const counts = useMemo(
    () => ({
      pending: callbacks.filter((c) => c.status === 'pending').length,
      done: callbacks.filter((c) => c.status === 'done').length,
      all: callbacks.length,
    }),
    [callbacks],
  );

  // Every callback is on screen — the endpoint returns the lot, unpaginated —
  // so these counts and this filter are the whole set, not one page of it.
  const visible = useMemo(
    () =>
      activeFilter === 'all' ? callbacks : callbacks.filter((c) => c.status === activeFilter),
    [callbacks, activeFilter],
  );

  const activeFilterMeta =
    CALLBACK_FILTERS.find((f) => f.value === activeFilter) || CALLBACK_FILTERS[0];

  return (
    <>
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      {/* There is no way back to "waiting" from this screen, so it asks first
          and names who is about to be marked off. */}
      <ConfirmModal
        isOpen={!!pendingDone}
        onClose={() => setPendingDone(null)}
        onConfirm={() => pendingDone && markDone(pendingDone)}
        type="info"
        title="Mark as called back?"
        message={
          pendingDone
            ? `${pendingDone.name} will move out of the waiting list. Only do this once somebody has actually phoned them — it cannot be undone from this screen.`
            : ''
        }
        confirmText="Mark as called back"
      />

      <PageHeader
        eyebrow="Sales"
        title="Callbacks"
        intro="Customers who asked the WhatsApp bot for a phone call, and the time each one said suited them. Mark a request off once somebody has actually called."
        action={
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              fetchCallbacks();
            }}
          >
            <RefreshCw />
            Refresh
          </Button>
        }
      />

      <Reveal>
        <div className="mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={activeFilter}
              onValueChange={setActiveFilter}
              layoutId="callbacks-filter"
              items={CALLBACK_FILTERS.map((f) => ({
                value: f.value,
                label: f.label,
                count: counts[f.value],
              }))}
            />

            <p className="text-[13px] text-text-secondary">
              Showing <span className="font-medium tabular-nums text-ink">{visible.length}</span> of{' '}
              <span className="tabular-nums">{counts.all}</span>{' '}
              {counts.all === 1 ? 'request' : 'requests'}
            </p>
          </div>

          <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-text-secondary">
            {activeFilterMeta.help}
          </p>
        </div>
      </Reveal>

      {loadError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-light px-4 py-3.5"
        >
          <AlertCircle aria-hidden="true" className="mt-1 size-4 shrink-0 text-danger" />
          <div>
            <p className="text-[13px] font-medium text-danger">{loadError}</p>
            <button
              type="button"
              onClick={fetchCallbacks}
              className="mt-1 text-[13px] font-medium text-danger underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <Reveal delay={0.06}>
        <Card>
          {/* Widths are proportional and sum to 100, so no single column
              absorbs the slack. Leaving the second column unsized gave it
              every spare pixel — roughly 320 of them — which parked a
              centred "Today, after 4 PM" some 250px from a left-aligned name
              and left a hole in the middle of every row. The first column
              reads from the start edge and the last sits on the end edge —
              the two the eye uses to find the row and to act on it — and
              everything between them is centred. Cells keep TableCell's
              align-middle: only the name cell runs to two lines here, so
              top-aligning the rest pinned the badge and the button to the top
              of a row whose height the name set, and they read as sitting
              high. Leads top-aligns because two of its columns run long and
              their first lines have to start together — this one does not. */}
          <Table className="min-w-[940px] table-fixed">
            <TableHeader>
              <tr>
                <TableHead className="w-[20%]">Name &amp; phone</TableHead>
                <TableHead className="w-[24%] text-center">When they want the call</TableHead>
                <TableHead className="w-[14%] text-center">Asked</TableHead>
                <TableHead className="w-[16%] text-center">Status</TableHead>
                <TableHead className="w-[26%] text-right">Update</TableHead>
              </tr>
            </TableHeader>

            <TableBody>
              {visible.map((callback, index) => {
                const status = getCallbackStatus(callback.status);
                const name = callback.name ? formatSlug(callback.name) : 'Name not given';

                return (
                  <TableRow key={callback.id || index}>
                    <TableCell>
                      <p className="font-medium text-ink">{name}</p>
                      <p className="mt-1 font-mono text-[11px] text-titanium-700">
                        +{callback.phone}
                      </p>
                    </TableCell>

                    {/* The one field the old page never showed, and the only
                        one that decides when somebody should pick up the
                        phone. It was sitting unused in the response. */}
                    <TableCell className="text-center">
                      {callback.preferred_time ? (
                        <p className="mx-auto max-w-[44ch] leading-relaxed text-ink">
                          {callback.preferred_time}
                        </p>
                      ) : (
                        <span className="text-text-secondary">No time given</span>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-center text-text-secondary">
                      {callback.created_at ? (
                        <span
                          title={format(parseISO(callback.created_at), "d MMMM yyyy 'at' h:mm a")}
                        >
                          {formatDistanceToNow(parseISO(callback.created_at), { addSuffix: true })}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={status.badge}>
                        <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {callback.status === 'pending' ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setPendingDone({ id: callback.id, name })}
                        >
                          <PhoneCall />
                          Mark as called back
                        </Button>
                      ) : (
                        <span className="inline-flex h-8 items-center text-[13px] text-success">
                          Called back
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {visible.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                      {activeFilter === 'pending'
                        ? 'Nobody is waiting for a call'
                        : activeFilter === 'done'
                          ? 'Nothing has been called back yet'
                          : 'No callback requests yet'}
                    </p>
                    <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-relaxed text-text-secondary">
                      {activeFilter === 'pending'
                        ? 'Every request has been dealt with. New ones appear here the moment a customer asks the bot for a call.'
                        : 'A request appears here once somebody marks it as called back.'}
                    </p>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <span className="mx-auto block size-6 animate-spin rounded-full border-2 border-line border-t-ink" />
                    <p className="mt-4 font-mono text-[10px] tracking-[0.22em] uppercase text-titanium-700">
                      Loading callbacks
                    </p>
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>
        </Card>
      </Reveal>
    </>
  );
};

export default Callbacks;

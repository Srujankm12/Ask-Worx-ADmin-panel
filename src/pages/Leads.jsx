import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { RefreshCw, AlertCircle } from 'lucide-react';

import { getLeads, updateLeadStatus } from '../api';
import { formatSlug } from '../utils';
import { LEAD_STATUS, LEAD_FILTERS, getLeadStatus } from '../lib/leadStatus';

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

const PAGE_SIZE = 10;

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
  const [pendingChange, setPendingChange] = useState(null);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const fetchLeads = useCallback(async () => {
    setLoadError('');
    try {
      const resp = await getLeads({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setLeads(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (err) {
      // A failure has to reach the person using the page. Logging it to the
      // console leaves them looking at a stale table with no idea it is stale.
      console.error(err);
      setLoadError(
        'Could not load leads. The server did not respond — check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const applyStatusChange = async ({ id, status }) => {
    try {
      await updateLeadStatus(id, status);
      setModal({
        open: true,
        title: 'Lead updated',
        message: `This lead is now marked "${getLeadStatus(status).label}".`,
        type: 'success',
      });
      fetchLeads();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Could not update the lead',
        message:
          'The change was not saved. Nothing has been altered — please check your connection and try again.',
        type: 'error',
      });
    }
  };

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        if (activeFilter === 'all') return true;

        const requirement = lead.requirement?.toLowerCase() || '';
        const isConsultation =
          requirement.includes('request:') ||
          requirement.includes('quotation:') ||
          requirement.includes('query:') ||
          requirement.includes(': ');

        if (activeFilter === 'expert') return isConsultation;
        if (activeFilter === 'quote') return !isConsultation && requirement !== '';
        return true;
      }),
    [leads, activeFilter],
  );

  const activeFilterMeta = LEAD_FILTERS.find((f) => f.value === activeFilter) || LEAD_FILTERS[0];
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  // Which moves are offered depends on where the lead already is, so the row
  // never shows an action that would be a no-op.
  const nextStatuses = (status) => {
    if (status === 'converted') return [];
    if (status === 'new') return ['called', 'in_progress', 'converted'];
    if (status === 'called') return ['in_progress', 'converted'];
    return ['converted'];
  };

  return (
    <>
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      {/* Changing a lead's status is not reversible from this screen, so it
          asks first and names both the lead and the new state. */}
      <ConfirmModal
        isOpen={!!pendingChange}
        onClose={() => setPendingChange(null)}
        onConfirm={() => pendingChange && applyStatusChange(pendingChange)}
        type="info"
        title={pendingChange ? `Mark as ${getLeadStatus(pendingChange.status).label.toLowerCase()}?` : ''}
        message={
          pendingChange
            ? `${pendingChange.name} will be moved to "${getLeadStatus(pendingChange.status).label}". ${getLeadStatus(pendingChange.status).description}`
            : ''
        }
        confirmText="Update lead"
      />

      <PageHeader
        eyebrow="Sales"
        title="Leads"
        intro="Enquiries the WhatsApp bot has captured. Update a lead's status as your team works through it — the figures on the dashboard follow from what you record here."
        action={
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              fetchLeads();
            }}
          >
            <RefreshCw />
            Refresh
          </Button>
        }
      />

      <Reveal>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={activeFilter}
            onValueChange={setActiveFilter}
            items={LEAD_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
          />

          <p className="text-[13px] text-text-secondary">
            Showing{' '}
            <span className="font-medium tabular-nums text-ink">{filteredLeads.length}</span>{' '}
            {filteredLeads.length === 1 ? 'lead' : 'leads'}
            {total > 0 && <> of {total} in total</>}
          </p>
        </div>

        {/* The filter explains itself rather than leaving the operator to work
            out what separates a consultation from a quotation request. */}
        <p className="mb-6 text-[13px] leading-relaxed text-text-secondary">
          {activeFilterMeta.help}
        </p>
      </Reveal>

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
              onClick={fetchLeads}
              className="mt-1 text-[13px] font-medium text-danger underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <Reveal delay={0.06}>
        <Card>
          <Table className="min-w-[960px]">
            <TableHeader>
              <tr>
                <TableHead>Name &amp; phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>What they asked for</TableHead>
                <TableHead className="w-40 text-center">Status</TableHead>
                <TableHead className="text-right">Update status</TableHead>
              </tr>
            </TableHeader>

            <TableBody>
              {filteredLeads.map((lead, index) => {
                const status = getLeadStatus(lead.status);
                const name = lead.name ? formatSlug(lead.name) : 'Name not given';

                return (
                  <TableRow key={lead.id || index}>
                    <TableCell>
                      <p className="font-medium text-ink">{name}</p>
                      <p className="mt-1 font-mono text-[11px] text-titanium-700">
                        {lead.contact_phone || `+${lead.phone}`}
                      </p>
                      {lead.contact_phone && (
                        <p className="mt-1 text-[11px] text-muted-text">
                          Wrote in from +{lead.phone}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="text-text-secondary">
                      {lead.company ? formatSlug(lead.company) : 'Not given'}
                    </TableCell>

                    <TableCell>
                      <p className="max-w-md leading-relaxed">
                        {lead.requirement || 'No details given'}
                      </p>
                      {lead.created_at && (
                        // Relative first, because a leads list is read by
                        // recency; the exact stamp stays available on hover.
                        <p
                          className="mt-2 text-[11px] text-muted-text"
                          title={format(new Date(lead.created_at), "d MMMM yyyy 'at' h:mm a")}
                        >
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={status.badge}>
                        <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {nextStatuses(lead.status).map((next) => (
                          <Button
                            key={next}
                            size="xs"
                            variant={next === 'converted' ? 'success' : 'outline'}
                            onClick={() => setPendingChange({ id: lead.id, status: next, name })}
                          >
                            {LEAD_STATUS[next].action}
                          </Button>
                        ))}

                        {lead.status === 'converted' && (
                          <span className="text-[13px] text-success">Closed as won</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredLeads.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    {/* An empty state is the best teaching moment in an admin
                        panel — say what belongs here and how it gets here. */}
                    <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                      {activeFilter === 'all' ? 'No leads yet' : 'Nothing under this filter'}
                    </p>
                    <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-text-secondary">
                      {activeFilter === 'all'
                        ? 'Leads appear here automatically when someone requests a consultation or a quotation through the WhatsApp bot. Nothing needs to be entered by hand.'
                        : 'No lead currently matches this filter. Switch to "All enquiries" to see everything the bot has captured.'}
                    </p>
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-4 border-t border-border bg-paper px-5 py-3.5">
              <p className="text-[13px] text-text-secondary">
                Page <span className="font-medium tabular-nums text-ink">{page + 1}</span> of{' '}
                <span className="tabular-nums">{lastPage + 1}</span>
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= lastPage}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Reveal>
    </>
  );
};

export default Leads;

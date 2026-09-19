import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Image as ImageIcon,
  Megaphone,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';

import {
  getCampaigns,
  createCampaign,
  deleteCampaign,
  uploadImage,
  getContacts,
} from '../api';
import { getBroadcastStatus } from '../lib/broadcastStatus';
import { isInWindow } from '../lib/replyWindow';

import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import WhatsAppPreview from '../components/WhatsAppPreview';
import { Reveal } from '../components/motion/Reveal';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Tabs } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';

const PAGE_SIZE = 10;

const emptyPoster = () => ({
  type: 'poster',
  image_url: '',
  title: '',
  description: '',
  scheduled_at: '',
});

const SOURCE_TABS = [
  { value: 'url', label: 'Link' },
  { value: 'local', label: 'Upload' },
];

const WHEN_TABS = [
  { value: 'now', label: 'Send now' },
  { value: 'later', label: 'Schedule' },
];

// Ready-made posters to start a broadcast from, one per AskWorX service.
// Images and copy are drawn from the live askworx.in service pages; everything
// stays editable after picking one.
const TEMPLATES = [
  {
    id: 'industrial-automation',
    label: 'Industrial Automation',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1400&q=80',
    title: 'Industrial automation built for reliable production.',
    description:
      'We design, program and commission PLC and SCADA control systems for machines and complete production lines — including safety interlocks, motion control and full commissioning from the first I/O list through to go-live.\n\nLet\'s discuss your automation requirement.',
  },
  {
    id: 'iiot-cloud',
    label: 'IIoT & Cloud',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1400&q=80',
    title: 'Connect your plant to the cloud.',
    description:
      'We connect PLCs, drives and meters over OPC-UA, MQTT and Modbus through secure industrial gateways into a cloud platform your team can use — live dashboards, alarm notifications, energy analytics and historians that keep every trend.\n\nLet\'s make your plant data useful.',
  },
  {
    id: 'software-development',
    label: 'Software Development',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1400&q=80',
    title: 'Software built around your operations.',
    description:
      'We build custom ERP, CRM and SaaS platforms, operations dashboards and system integrations — engineered by a team that understands how your plant and business actually work, and built to scale from day one.\n\nLet\'s discuss what you need to build.',
  },
  {
    id: 'whatsapp-automation',
    label: 'WhatsApp Automation',
    image: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=1400&q=80',
    title: 'Turn WhatsApp into a smarter business channel.',
    description:
      'We build AI-powered WhatsApp bots that answer sales enquiries instantly, qualify leads, book appointments and follow up automatically — and on the factory side, escalate alarms to the right engineer in seconds.\n\nLet\'s automate your WhatsApp workflow.',
  },
];

/** A broadcast's own words, for the list and for the cancel confirmation. */
const describe = (campaign) => campaign.title || campaign.caption || campaign.image_url || 'Poster';

/** A broadcast whose time has come: the bot is sending it now. */
const isDue = (c) => c.scheduled_at && new Date(c.scheduled_at) <= new Date();

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // How many people a broadcast actually reaches. DESIGN.md §5: a send button
  // states its recipient count before it is pressed, and that count has to be
  // the real one. The sender skips opted-out contacts and anyone outside the
  // 24-hour window, so only those who messaged in the last day are counted.
  const [audience, setAudience] = useState(null); // { reachable, subscribed }

  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState(emptyPoster);
  const [templateId, setTemplateId] = useState('');
  const [when, setWhen] = useState('now');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadSource, setUploadSource] = useState('url');
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState('');

  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
  const [confirmCancel, setConfirmCancel] = useState(null);

  // Absolute URL for an uploaded image, so the file the operator picked is
  // reachable from WhatsApp's servers rather than only from this browser.
  const API_BASE =
    import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.includes('localhost')
      ? import.meta.env.VITE_API_URL
      : window.location.origin;

  const load = useCallback(async () => {
    setLoadError('');
    try {
      setLoading(true);
      const { data } = await getCampaigns({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      // Anything else in the data (such as older quiz broadcasts) is not part
      // of this flow any more, so it is left out here.
      setCampaigns((data.data || []).filter((c) => c.type === 'poster'));
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      setLoadError(
        'Could not load your broadcasts. The server did not respond — check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  // While a broadcast is going out, keep the list current so it flips to
  // Sent by itself.
  const inFlight = campaigns.some(
    (c) => c.status === 'sending' || (c.status === 'scheduled' && isDue(c)),
  );
  useEffect(() => {
    if (!inFlight) return undefined;
    const interval = setInterval(() => load(), 3000);
    return () => clearInterval(interval);
  }, [inFlight, load]);

  useEffect(() => {
    getContacts()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        const subscribed = list.filter((c) => !c.opt_out);
        setAudience({
          subscribed: subscribed.length,
          reachable: subscribed.filter((c) => isInWindow(c.last_incoming_at)).length,
        });
      })
      .catch((err) => {
        // Left null, so the composer says the count is unavailable rather than
        // showing a zero that reads as "this will reach nobody".
        console.error(err);
        setAudience(null);
      });
  }, []);

  // Free the object URL behind an uploaded poster's preview.
  useEffect(() => () => localPreview && URL.revokeObjectURL(localPreview), [localPreview]);

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  const openComposer = (template) => {
    setForm(emptyPoster());
    setTemplateId('');
    setWhen('now');
    setUploadSource('url');
    setLocalPreview('');
    setErrors({});
    if (template) applyTemplate(template);
    setComposerOpen(true);
  };

  const applyTemplate = (template) => {
    setTemplateId(template.id);
    setUploadSource('url');
    setLocalPreview('');
    setForm((f) => ({
      ...f,
      image_url: template.image,
      title: template.title,
      description: template.description,
      localFile: undefined,
    }));
    setErrors({});
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const chooseFile = (file) => {
    setField('localFile', file);
    setLocalPreview(file ? URL.createObjectURL(file) : '');
  };

  const validate = () => {
    const next = {};
    if (uploadSource === 'url' && !form.image_url.trim()) {
      next.image_url = 'Paste the web address of the image.';
    }
    if (uploadSource === 'local' && !form.localFile) {
      next.localFile = 'Choose an image file to send.';
    }
    if (!form.title.trim()) next.title = 'Enter a title.';
    if (!form.description.trim()) next.description = 'Enter a description.';
    if (when === 'later' && !form.scheduled_at) {
      next.scheduled_at = 'Choose when it should go out.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const payload = { ...form, type: 'poster' };

      if (uploadSource === 'local') {
        setUploading(true);
        const { data } = await uploadImage(form.localFile);
        payload.image_url = `${API_BASE}${data.url}`;
        setUploading(false);
      }

      // "Send now" is a schedule for this minute: the broadcaster runs on a
      // poll and picks it up on its next pass.
      const at = when === 'now' ? new Date() : new Date(form.scheduled_at);
      delete payload.localFile;

      await createCampaign({ ...payload, scheduled_at: at.toISOString() });

      setComposerOpen(false);
      const sendingNow = when === 'now';
      setModal({
        open: true,
        title: sendingNow ? 'Broadcast on its way' : 'Broadcast scheduled',
        message: sendingNow
          ? 'It is going out now to everyone who messaged in the last 24 hours.'
          : 'It will go out at the time you set. You can cancel it from this page any time before then.',
        type: 'success',
      });
      load();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Could not send broadcast',
        message:
          'The broadcast was not saved, so nobody will receive it. Check that every field is filled in, then try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleCancel = async () => {
    const campaign = confirmCancel;
    if (!campaign) return;
    try {
      await deleteCampaign(campaign.id);
      load();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Could not cancel it',
        message:
          'The broadcast is still scheduled and will go out as planned. Refresh the page and try again.',
        type: 'error',
      });
    }
  };

  const audienceLine = useMemo(() => {
    if (audience === null) return 'The number of recipients could not be read just now.';
    if (audience.reachable === 0) {
      return 'Right now nobody has messaged in the last 24 hours, so this would reach nobody. The list is checked again when it goes out.';
    }
    return `Reachable now, free: ${audience.reachable} of ${audience.subscribed} subscribed ${
      audience.subscribed === 1 ? 'contact' : 'contacts'
    } — the ones who messaged in the last 24 hours. Checked again when it goes out.`;
  }, [audience]);

  const previewImage = uploadSource === 'local' ? localPreview : (form.image_url || '').trim();

  return (
    <>
      <PageHeader
        eyebrow="WhatsApp bot"
        title="Broadcasts"
        intro="An image and a message sent to every subscribed contact who has messaged in the last 24 hours — the people WhatsApp lets the bot message for free. Nothing goes out until its scheduled moment, and a broadcast can be cancelled up to that point."
        action={
          <Button onClick={() => openComposer()}>
            <Plus />
            Schedule a broadcast
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border bg-white px-4 py-3">
        <p className="text-[13px] font-medium text-ink">
          Reachable now, free:{' '}
          <span className="tabular-nums">
            {audience === null ? '—' : `${audience.reachable} of ${audience.subscribed}`}
          </span>{' '}
          subscribed contacts
        </p>
        <p className="text-[12px] leading-relaxed text-text-secondary">
          Only people who messaged in the last 24 hours can receive a broadcast. Everyone else
          would need a paid WhatsApp template.
        </p>
      </div>

      {/* ── Start from a template ─────────────────────────────────────── */}
      <Reveal>
        <section className="mb-8">
          <p className="eyebrow mb-3">Start from a template</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => openComposer(template)}
                className="group overflow-hidden rounded-xl border border-border bg-white text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-ink/30"
              >
                <img
                  src={template.image}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full bg-paper object-cover"
                />
                <p className="px-3 py-2.5 text-[13px] font-medium text-ink">{template.label}</p>
              </button>
            ))}
          </div>
        </section>
      </Reveal>

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
              onClick={() => load()}
              className="mt-1 text-[13px] font-medium text-danger underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <Reveal delay={0.04}>
        <Card>
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-[46%]">Broadcast</TableHead>
                <TableHead className="w-36 text-center">Status</TableHead>
                <TableHead className="w-56 text-center">Goes out</TableHead>
                <TableHead className="w-24 text-center">Sent to</TableHead>
                <TableHead className="w-24 text-right">Cancel</TableHead>
              </tr>
            </TableHeader>

            <TableBody>
              {campaigns.map((campaign) => {
                const status = getBroadcastStatus(
                  campaign.status === 'scheduled' && isDue(campaign) ? 'sending' : campaign.status,
                );
                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        {campaign.image_url ? (
                          <img
                            src={campaign.image_url}
                            alt=""
                            className="size-12 shrink-0 rounded-lg bg-paper object-cover"
                          />
                        ) : (
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-paper text-titanium-700">
                            <ImageIcon className="size-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{describe(campaign)}</p>
                          {campaign.buttons?.length > 0 && (
                            <p className="mt-1 text-[12px] leading-snug text-text-secondary">
                              Buttons: {campaign.buttons.map((b) => b.title).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={status.badge}>
                        <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center text-text-secondary">
                      {campaign.scheduled_at
                        ? format(parseISO(campaign.scheduled_at), "d MMMM yyyy 'at' h:mm a")
                        : '—'}
                    </TableCell>

                    <TableCell className="text-center tabular-nums text-text-secondary">
                      {campaign.status === 'sent' ? campaign.total_sent : '—'}
                    </TableCell>

                    <TableCell className="text-right">
                      {campaign.status === 'scheduled' && !isDue(campaign) && (
                        <Button
                          variant="destructive-outline"
                          size="icon-xs"
                          aria-label={`Cancel the broadcast “${describe(campaign)}”`}
                          onClick={() => setConfirmCancel(campaign)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {campaigns.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Megaphone aria-hidden="true" className="mx-auto size-6 text-titanium-300" />
                    <p className="mt-3 font-heading text-base font-bold uppercase tracking-tight text-ink">
                      No broadcasts yet
                    </p>
                    <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-text-secondary">
                      Pick a template above, or use “Schedule a broadcast” to write your own.
                    </p>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <span className="mx-auto block size-6 animate-spin rounded-full border-2 border-line border-t-ink" />
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

      {/* ── Composer ────────────────────────────────────────────────────── */}

      <Dialog open={composerOpen} onClose={() => setComposerOpen(false)} size="xl" labelledBy="composer-title">
        <DialogHeader
          id="composer-title"
          eyebrow="Broadcasts"
          title="Schedule a broadcast"
          description="Pick a template or write your own. The preview shows exactly what customers get."
          onClose={() => setComposerOpen(false)}
        />

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Template</Label>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                          templateId === template.id
                            ? 'border-ink bg-ink text-white'
                            : 'border-border bg-white text-body-text hover:border-ink/40'
                        }`}
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Photo</Label>
                  <Tabs
                    value={uploadSource}
                    onValueChange={setUploadSource}
                    items={SOURCE_TABS}
                    layoutId="broadcast-source"
                  />
                  {uploadSource === 'url' ? (
                    <Input
                      aria-label="Photo link"
                      value={form.image_url || ''}
                      onChange={(e) => setField('image_url', e.target.value)}
                      placeholder="https://example.com/poster.jpg"
                      aria-invalid={!!errors.image_url}
                      aria-describedby={errors.image_url ? 'image-url-error' : undefined}
                    />
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        aria-label="Photo file"
                        disabled={uploading}
                        onChange={(e) => chooseFile(e.target.files[0])}
                        className="w-full rounded-lg border border-dashed border-line-strong bg-paper p-4 text-[13px] text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:text-[12px] file:font-medium file:text-white"
                      />
                      {uploading && (
                        <p className="flex items-center gap-2 text-[12px] text-text-secondary">
                          <span className="size-3 animate-spin rounded-full border-2 border-line border-t-ink" />
                          Uploading — this can take a moment on a slow connection.
                        </p>
                      )}
                      {!uploading && form.localFile && (
                        <p className="flex items-center gap-1.5 text-[12px] font-medium text-success">
                          <CheckCircle2 aria-hidden="true" className="size-3.5" />
                          {form.localFile.name}
                        </p>
                      )}
                    </>
                  )}
                  {(errors.image_url || errors.localFile) && (
                    <p id="image-url-error" role="alert" className="text-[12px] text-danger">
                      {errors.image_url || errors.localFile}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title || ''}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Enter a title"
                    aria-invalid={!!errors.title}
                  />
                  {errors.title && (
                    <p role="alert" className="text-[12px] text-danger">
                      {errors.title}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={6}
                    value={form.description || ''}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Write your message here…"
                    aria-invalid={!!errors.description}
                  />
                  {errors.description && (
                    <p role="alert" className="text-[12px] text-danger">
                      {errors.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>When</Label>
                  <Tabs value={when} onValueChange={setWhen} items={WHEN_TABS} layoutId="broadcast-when" />
                  {when === 'later' && (
                    <>
                      <Input
                        type="datetime-local"
                        aria-label="Send at"
                        className="sm:max-w-[16rem]"
                        value={form.scheduled_at || ''}
                        onChange={(e) => setField('scheduled_at', e.target.value)}
                        aria-invalid={!!errors.scheduled_at}
                      />
                      {errors.scheduled_at && (
                        <p role="alert" className="text-[12px] text-danger">
                          {errors.scheduled_at}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="lg:sticky lg:top-0 lg:self-start">
                <WhatsAppPreview
                  title={form.title}
                  description={form.description}
                  image={previewImage}
                  empty="Pick a template or write a message to see it here."
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="justify-between">
            {/* DESIGN.md §5: say what a send will do before it does it. */}
            <p className="text-[12px] leading-relaxed text-text-secondary">{audienceLine}</p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setComposerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {when === 'now' ? <Send /> : <CalendarClock />}
                {submitting
                  ? when === 'now'
                    ? 'Sending…'
                    : 'Scheduling…'
                  : when === 'now'
                    ? 'Send broadcast'
                    : 'Schedule broadcast'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </Dialog>

      <ConfirmModal
        isOpen={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={handleCancel}
        type="danger"
        title="Cancel this broadcast?"
        message={
          confirmCancel
            ? `“${describe(confirmCancel)}” will not be sent, and it cannot be brought back — you would have to write it again.`
            : ''
        }
        confirmText="Cancel broadcast"
      />

      <Modal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </>
  );
}

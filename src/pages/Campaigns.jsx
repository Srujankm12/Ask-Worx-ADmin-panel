import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  BookmarkPlus,
  CalendarClock,
  Megaphone,
  Plus,
  Send,
  Trash2,
  Users,
} from 'lucide-react';

import {
  getCampaigns,
  createCampaign,
  deleteCampaign,
  getContacts,
  getTemplates,
  createTemplate,
  deleteTemplate,
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
  links: '',
  scheduled_at: '',
});

// What closes a broadcast when its links box is left empty. The server holds
// the real values in settings (poster_website / poster_email) and uses those;
// this is only what the composer shows so the preview matches what sends.
const DEFAULT_CLOSING = '🌐 www.askworx.in\n📧 contact@askworx.in';

const SOURCE_TABS = [
  { value: 'url', label: 'Link' },
  { value: 'local', label: 'Upload' },
];

// Kept in sync with the backend's own check in parseCampaignMultipart
// (admin.go) — the frontend check is a courtesy, not the real boundary.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const IMAGE_TYPE_ERROR = 'Only JPG, JPEG, PNG and WEBP images are allowed.';
const IMAGE_SIZE_ERROR = 'Image size must be less than or equal to 2 MB.';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

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
  const [localPreview, setLocalPreview] = useState('');
  const fileInputRef = useRef(null);

  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
  const [confirmCancel, setConfirmCancel] = useState(null);

  // Broadcasts saved to send again, and the one being looked at.
  const [saved, setSaved] = useState([]);
  const [detail, setDetail] = useState(null);
  const [saveName, setSaveName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState(null);

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

  const loadTemplates = useCallback(async () => {
    try {
      const { data } = await getTemplates();
      setSaved(Array.isArray(data) ? data : []);
    } catch (err) {
      // A template list that will not load is not worth an alert: the ready-made
      // ones below still work, and so does composing from scratch.
      console.error(err);
      setSaved([]);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

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

  // Takes both shapes: the ready-made ones above (image) and a saved
  // broadcast from the server (image_url, links).
  const applyTemplate = (template) => {
    setTemplateId(template.id);
    setUploadSource('url');
    setLocalPreview('');
    setForm((f) => ({
      ...f,
      image_url: template.image ?? template.image_url ?? '',
      title: template.title,
      description: template.description,
      links: template.links ?? '',
      localFile: undefined,
    }));
    setErrors({});
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // Selecting a file re-validates it immediately: type first (an unsupported
  // format is rejected outright), then size, so the composer never holds an
  // invalid file behind a preview that looks fine.
  const chooseFile = (file) => {
    if (!file) {
      setField('localFile', undefined);
      setErrors((e) => ({ ...e, localFile: undefined }));
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setField('localFile', undefined);
      setErrors((e) => ({ ...e, localFile: IMAGE_TYPE_ERROR }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setField('localFile', undefined);
      setErrors((e) => ({ ...e, localFile: IMAGE_SIZE_ERROR }));
      return;
    }

    setErrors((e) => ({ ...e, localFile: undefined }));
    setField('localFile', file);
    setLocalPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const next = {};
    if (uploadSource === 'url' && !form.image_url.trim()) {
      next.image_url = 'Paste the web address of the image.';
    }
    if (uploadSource === 'local') {
      // A rejected file already carries its own reason (wrong type / too
      // large); only fall back to the generic message when nothing was
      // picked at all.
      if (errors.localFile) next.localFile = errors.localFile;
      else if (!form.localFile) next.localFile = 'Choose an image file to send.';
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
      // "Send now" is a schedule for this minute: the broadcaster runs on a
      // poll and picks it up on its next pass.
      const at = when === 'now' ? new Date() : new Date(form.scheduled_at);

      let payload;
      if (uploadSource === 'local' && form.localFile) {
        // The image travels with the broadcast in one multipart request and
        // is stored as binary data in the database — never a separate
        // pre-upload step, and never a hosted file the server has to keep in
        // sync with the row that references it.
        payload = new FormData();
        payload.append('type', 'poster');
        payload.append('title', form.title);
        payload.append('description', form.description);
        payload.append('links', form.links.trim());
        payload.append('scheduled_at', at.toISOString());
        payload.append('image', form.localFile);
      } else {
        payload = {
          type: 'poster',
          title: form.title,
          description: form.description,
          links: form.links.trim(),
          image_url: form.image_url,
          scheduled_at: at.toISOString(),
        };
      }

      await createCampaign(payload);

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
          err.response?.data?.error ||
          'The broadcast was not saved, so nobody will receive it. Check that every field is filled in, then try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!detail) return;
    const name = saveName.trim();
    if (!name) return;

    setSavingTemplate(true);
    try {
      await createTemplate({
        name,
        title: detail.title || '',
        description: detail.description || detail.caption || '',
        image_url: detail.image_url || '',
        links: detail.links || '',
      });
      setSaveName('');
      setDetail(null);
      loadTemplates();
      setModal({
        open: true,
        title: 'Saved as a template',
        message: `“${name}” is now under Start from a template, ready to send again.`,
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Could not save that template',
        message:
          err.response?.data?.error ||
          'The template was not saved. Check the name and try again.',
        type: 'error',
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    const template = confirmDeleteTemplate;
    if (!template) return;
    try {
      await deleteTemplate(template.id);
      loadTemplates();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Could not delete that template',
        message: 'It is still saved. Refresh the page and try again.',
        type: 'error',
      });
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

  // The preview has to show what actually sends, closing lines included, or
  // the operator is approving something different from what goes out.
  const previewDescription = useMemo(() => {
    const body = (form.description || '').trim();
    // Nothing written yet means nothing to preview — showing the closing lines
    // on their own would hide the empty state behind a message nobody wrote.
    if (!body && !(form.title || '').trim()) return '';
    const closing = (form.links || '').trim() || DEFAULT_CLOSING;
    return body ? `${body}\n\n${closing}` : closing;
  }, [form.description, form.links, form.title]);

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

          {saved.length > 0 && (
            <div className="mt-5">
              <p className="eyebrow mb-3">Saved by you</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {saved.map((template) => (
                  <div
                    key={template.id}
                    className="group relative overflow-hidden rounded-xl border border-border bg-white text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-ink/30"
                  >
                    <button
                      type="button"
                      onClick={() => openComposer(template)}
                      className="block w-full text-left"
                    >
                      {template.image_url ? (
                        <img
                          src={template.image_url}
                          alt=""
                          loading="lazy"
                          className="aspect-[4/3] w-full bg-paper object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center bg-paper">
                          <Megaphone aria-hidden="true" className="size-5 text-titanium-700" />
                        </div>
                      )}
                      <p className="px-3 py-2.5 text-[13px] font-medium text-ink">
                        {template.name}
                      </p>
                    </button>
                    <Button
                      variant="destructive-outline"
                      size="icon-xs"
                      aria-label={`Delete the template “${template.name}”`}
                      onClick={() => setConfirmDeleteTemplate(template)}
                      className="absolute right-2 top-2 bg-white/90 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                      {/* The whole row opens the detail: what went out, and to
                          how many people. */}
                      <button
                        type="button"
                        onClick={() => {
                          setSaveName(describe(campaign).slice(0, 60));
                          setDetail(campaign);
                        }}
                        className="min-w-0 text-left"
                      >
                        <p className="font-medium text-ink underline-offset-4 hover:underline">
                          {describe(campaign)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-text-secondary">
                          View what was sent
                        </p>
                      </button>
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
                      {campaign.status === 'sent' ? (
                        <span title={`Delivered to ${campaign.total_sent} ${
                          campaign.total_sent === 1 ? 'person' : 'people'
                        }`}>
                          {campaign.total_sent}
                        </span>
                      ) : (
                        '—'
                      )}
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
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        aria-label="Photo file"
                        disabled={submitting}
                        onChange={(e) => chooseFile(e.target.files[0])}
                        className={
                          form.localFile
                            ? 'hidden'
                            : 'w-full rounded-lg border border-dashed border-line-strong bg-paper p-4 text-[13px] text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:text-[12px] file:font-medium file:text-white'
                        }
                      />
                      {form.localFile && (
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-paper p-3">
                          <img
                            src={localPreview}
                            alt=""
                            className="size-14 shrink-0 rounded-md bg-white object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-ink">
                              {form.localFile.name}
                            </p>
                            <p className="text-[12px] text-text-secondary">
                              {formatFileSize(form.localFile.size)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Change
                            </Button>
                            <Button
                              type="button"
                              variant="destructive-outline"
                              size="xs"
                              onClick={() => chooseFile(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                      <p className="text-[12px] text-text-secondary">
                        JPG, PNG or WEBP, up to 2 MB.
                      </p>
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
                  <Label htmlFor="links">
                    Links{' '}
                    <span className="font-normal text-text-secondary">(optional)</span>
                  </Label>
                  <Textarea
                    id="links"
                    rows={2}
                    value={form.links || ''}
                    onChange={(e) => setField('links', e.target.value)}
                    placeholder={DEFAULT_CLOSING}
                  />
                  <p className="text-[12px] leading-relaxed text-text-secondary">
                    Closes the message. Leave it empty and the website and email from Bot
                    settings are used instead — shown above in grey.
                  </p>
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
                  description={previewDescription}
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

      {/* ── What was sent, and to how many people ───────────────────── */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} size="lg" labelledBy="detail-title">
        {detail && (
          <>
            <DialogHeader
              id="detail-title"
              eyebrow="Broadcast"
              title={describe(detail)}
              description={`${
                getBroadcastStatus(
                  detail.status === 'scheduled' && isDue(detail) ? 'sending' : detail.status,
                ).label
              }${
                detail.scheduled_at
                  ? ` · ${format(parseISO(detail.scheduled_at), "d MMMM yyyy 'at' h:mm a")}`
                  : ''
              }`}
              onClose={() => setDetail(null)}
            />

            <DialogBody>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-paper px-4 py-3">
                    <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-titanium-700" />
                    <div>
                      <p className="text-[13px] font-medium text-ink">
                        {detail.status === 'sent'
                          ? `Delivered to ${detail.total_sent} ${
                              detail.total_sent === 1 ? 'person' : 'people'
                            }`
                          : detail.status === 'cancelled'
                            ? 'Cancelled — it was never sent'
                            : 'Not sent yet'}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
                        {detail.status === 'sent'
                          ? 'Everyone who was inside the 24-hour window when it went out.'
                          : 'The count is fixed when the broadcast goes out.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="eyebrow">Save for later</p>
                    <div className="flex gap-2">
                      <Input
                        aria-label="Template name"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="Name this template"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate || !saveName.trim()}
                      >
                        <BookmarkPlus />
                        {savingTemplate ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                    <p className="text-[12px] leading-relaxed text-text-secondary">
                      Keeps the words, the image and the links, so you can send the same
                      thing again without writing it out.
                    </p>
                  </div>
                </div>

                <WhatsAppPreview
                  title={detail.title}
                  description={
                    [
                      (detail.description || detail.caption || '').trim(),
                      (detail.links || '').trim() || DEFAULT_CLOSING,
                    ]
                      .filter(Boolean)
                      .join('\n\n')
                  }
                  image={detail.image_url}
                  empty="This broadcast has no content to show."
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetail(null)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      <ConfirmModal
        isOpen={!!confirmDeleteTemplate}
        onClose={() => setConfirmDeleteTemplate(null)}
        onConfirm={handleDeleteTemplate}
        type="danger"
        title="Delete this template?"
        message={
          confirmDeleteTemplate
            ? `“${confirmDeleteTemplate.name}” will no longer appear under Start from a template. Broadcasts already sent from it are not affected.`
            : ''
        }
        confirmText="Delete template"
      />

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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  BarChart2,
  CalendarClock,
  CheckCircle2,
  Image as ImageIcon,
  MessageCircleQuestion,
  Plus,
  Trash2,
} from 'lucide-react';

import {
  getCampaigns,
  createCampaign,
  deleteCampaign,
  getCampaignAnalytics,
  uploadImage,
  getContacts,
} from '../api';
import { formatSlug } from '../utils';
import { getBroadcastStatus, getBroadcastType } from '../lib/broadcastStatus';

import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import AnswerChart from '../components/charts/AnswerChart';
import { Reveal } from '../components/motion/Reveal';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Tabs } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
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
const EXPLANATION_LIMIT = 300;

const EMPTY_QUIZ = {
  type: 'quiz',
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  correct_answer: 'A',
  explanation: '',
  youtube_link: '',
  scheduled_at: '',
};

const EMPTY_POSTER = { type: 'poster', image_url: '', caption: '', scheduled_at: '' };

const TYPE_TABS = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'poster', label: 'Poster' },
];

const SOURCE_TABS = [
  { value: 'url', label: 'Link' },
  { value: 'local', label: 'Upload' },
];

/** A broadcast's own words, for the list and for the cancel confirmation. */
const describe = (campaign) =>
  campaign.type === 'quiz'
    ? campaign.question
    : campaign.caption || campaign.image_url || 'Poster';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // How many people a broadcast actually reaches. DESIGN.md §5: a send button
  // states its recipient count before it is pressed, and that count has to be
  // the real one — opted-out contacts are skipped by the sender.
  const [audience, setAudience] = useState(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [formType, setFormType] = useState('quiz');
  const [form, setForm] = useState(EMPTY_QUIZ);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadSource, setUploadSource] = useState('url');
  const [uploading, setUploading] = useState(false);

  const [results, setResults] = useState(null);
  const [analytics, setAnalytics] = useState({});
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
      setCampaigns(data.data || []);
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

  useEffect(() => {
    getContacts()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setAudience(list.filter((c) => !c.opt_out).length);
      })
      .catch((err) => {
        // Left null, so the composer says the count is unavailable rather than
        // showing a zero that reads as "this will reach nobody".
        console.error(err);
        setAudience(null);
      });
  }, []);

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  const openComposer = () => {
    setFormType('quiz');
    setForm(EMPTY_QUIZ);
    setUploadSource('url');
    setErrors({});
    setComposerOpen(true);
  };

  const switchType = (type) => {
    setFormType(type);
    setForm(type === 'quiz' ? { ...EMPTY_QUIZ } : { ...EMPTY_POSTER });
    setErrors({});
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.scheduled_at) next.scheduled_at = 'Choose the date and time it should go out.';

    if (formType === 'quiz') {
      if (!form.question.trim()) next.question = 'Write the question people will be asked.';
      if (!form.option_a.trim()) next.option_a = 'Option A cannot be empty.';
      if (!form.option_b.trim()) next.option_b = 'Option B cannot be empty.';
      if (!form.option_c.trim()) next.option_c = 'Option C cannot be empty.';
      if (!form.explanation.trim()) {
        next.explanation = 'Explain the answer — it is sent to everyone who replies.';
      } else if (form.explanation.length > EXPLANATION_LIMIT) {
        next.explanation = `Keep the explanation under ${EXPLANATION_LIMIT} characters.`;
      }
    }

    if (formType === 'poster') {
      if (uploadSource === 'url' && !form.image_url.trim()) {
        next.image_url = 'Paste the web address of the image.';
      }
      if (uploadSource === 'local' && !form.localFile) {
        next.localFile = 'Choose an image file to send.';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const payload = { ...form, type: formType };

      if (formType === 'poster' && uploadSource === 'local') {
        setUploading(true);
        const { data } = await uploadImage(form.localFile);
        payload.image_url = `${API_BASE}${data.url}`;
        setUploading(false);
      }
      delete payload.localFile;

      // datetime-local has no zone; Date reads it in this computer's zone and
      // toISOString hands the server the matching instant.
      await createCampaign({
        ...payload,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
      });

      setComposerOpen(false);
      setForm(EMPTY_QUIZ);
      setModal({
        open: true,
        title: 'Broadcast scheduled',
        message:
          'It will go out at the time you set. You can cancel it from this page any time before then.',
        type: 'success',
      });
      load();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Nothing was scheduled',
        message:
          'The broadcast was not saved, so nobody will receive it. Check that every field is filled in and that the send time is in the future, then try again.',
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

  const openResults = async (campaign) => {
    setResults(campaign);
    if (analytics[campaign.id]) return;
    try {
      const { data } = await getCampaignAnalytics(campaign.id);
      setAnalytics((prev) => ({ ...prev, [campaign.id]: data }));
    } catch (err) {
      // Without this marker the panel cannot tell a quiz nobody answered from
      // one whose figures failed to load, and shows an honest zero for both.
      console.error(err);
      setAnalytics((prev) => ({ ...prev, [campaign.id]: { failed: true } }));
    }
  };

  const audienceLine = useMemo(() => {
    if (audience === null) return 'The number of recipients could not be read just now.';
    if (audience === 0) return 'No contact is currently subscribed, so this would reach nobody.';
    return `Goes to ${audience} ${audience === 1 ? 'contact' : 'contacts'}. Anyone who has opted out is skipped.`;
  }, [audience]);

  const resultData = results ? analytics[results.id] : null;

  return (
    <>
      <PageHeader
        eyebrow="WhatsApp bot"
        title="Broadcasts"
        intro="Quizzes and posters sent to every subscribed contact at a time you choose. Nothing goes out until its scheduled moment, and a broadcast can be cancelled up to that point."
        action={
          <Button onClick={openComposer}>
            <Plus />
            Schedule a broadcast
          </Button>
        }
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
        <Card>
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-[42%]">Broadcast</TableHead>
                <TableHead className="w-36 text-center">Status</TableHead>
                <TableHead className="w-56 text-center">Goes out</TableHead>
                <TableHead className="w-24 text-center">Sent to</TableHead>
                <TableHead className="w-44 text-right">Actions</TableHead>
              </tr>
            </TableHeader>

            <TableBody>
              {campaigns.map((campaign) => {
                const status = getBroadcastStatus(campaign.status);
                const type = getBroadcastType(campaign.type);
                const Icon = campaign.type === 'quiz' ? MessageCircleQuestion : ImageIcon;

                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-paper text-titanium-700"
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{describe(campaign)}</p>
                          <p className="mt-1 text-[12px] leading-snug text-text-secondary">
                            {type.label} — {type.summary}
                          </p>
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
                      <div className="flex items-center justify-end gap-2">
                        {campaign.status === 'sent' && campaign.type === 'quiz' && (
                          <Button variant="ghost" size="xs" onClick={() => openResults(campaign)}>
                            <BarChart2 />
                            View results
                          </Button>
                        )}
                        {campaign.status === 'scheduled' && (
                          <Button
                            variant="destructive-outline"
                            size="icon-xs"
                            aria-label={`Cancel the broadcast “${describe(campaign)}”`}
                            onClick={() => setConfirmCancel(campaign)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {campaigns.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                      No broadcasts yet
                    </p>
                    <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-text-secondary">
                      A broadcast is one message sent to every subscribed contact at once — a
                      quiz they can answer, or a poster to look at. Use “Schedule a broadcast”
                      to write your first one.
                    </p>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <span className="mx-auto block size-6 animate-spin rounded-full border-2 border-line border-t-ink" />
                    <p className="mt-4 font-mono text-[10px] tracking-[0.22em] uppercase text-titanium-700">
                      Loading broadcasts
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

      {/* ── Composer ────────────────────────────────────────────────────── */}

      <Dialog
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        size="lg"
        labelledBy="composer-title"
      >
        <DialogHeader
          id="composer-title"
          eyebrow="Broadcasts"
          title="Schedule a broadcast"
          description="Write it now, and the bot sends it at the time you set. Nothing is sent while you are filling this in."
          onClose={() => setComposerOpen(false)}
        />

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-6">
            <div className="space-y-2">
              <Label>What kind of broadcast</Label>
              <Tabs
                value={formType}
                onValueChange={switchType}
                items={TYPE_TABS}
                layoutId="broadcast-type"
              />
              <p className="text-[12px] leading-relaxed text-text-secondary">
                {getBroadcastType(formType).summary}
              </p>
            </div>

            {formType === 'quiz' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="question">Question</Label>
                  <Input
                    id="question"
                    value={form.question || ''}
                    onChange={(e) => setField('question', e.target.value)}
                    placeholder="Which protocol is used for machine-to-machine communication?"
                    aria-invalid={!!errors.question}
                    aria-describedby={errors.question ? 'question-error' : undefined}
                  />
                  {errors.question && (
                    <p id="question-error" role="alert" className="text-[12px] text-danger">
                      {errors.question}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    ['option_a', 'Option A'],
                    ['option_b', 'Option B'],
                    ['option_c', 'Option C'],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key}
                        value={form[key] || ''}
                        onChange={(e) => setField(key, e.target.value)}
                        aria-invalid={!!errors[key]}
                        aria-describedby={errors[key] ? `${key}-error` : undefined}
                      />
                      {errors[key] && (
                        <p id={`${key}-error`} role="alert" className="text-[12px] text-danger">
                          {errors[key]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correct_answer">Which option is correct</Label>
                  <Select
                    id="correct_answer"
                    className="sm:max-w-[12rem]"
                    value={form.correct_answer}
                    onChange={(e) => setField('correct_answer', e.target.value)}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="explanation">Explanation</Label>
                  <Textarea
                    id="explanation"
                    rows={3}
                    maxLength={EXPLANATION_LIMIT}
                    value={form.explanation || ''}
                    onChange={(e) => setField('explanation', e.target.value)}
                    placeholder="Two or three lines saying why that answer is right."
                    aria-invalid={!!errors.explanation}
                    aria-describedby="explanation-help"
                  />
                  <p id="explanation-help" className="text-[12px] leading-relaxed text-text-secondary">
                    Sent to everyone who replies, whatever they answered.{' '}
                    <span className="font-mono tabular-nums">
                      {(form.explanation || '').length}/{EXPLANATION_LIMIT}
                    </span>
                  </p>
                  {errors.explanation && (
                    <p role="alert" className="text-[12px] text-danger">
                      {errors.explanation}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="youtube_link">Video link</Label>
                  <Input
                    id="youtube_link"
                    value={form.youtube_link || ''}
                    onChange={(e) => setField('youtube_link', e.target.value)}
                    placeholder="https://youtube.com/..."
                  />
                  <p className="text-[12px] leading-relaxed text-text-secondary">
                    Optional. Added to the end of the explanation.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Where the image comes from</Label>
                  <Tabs
                    value={uploadSource}
                    onValueChange={setUploadSource}
                    items={SOURCE_TABS}
                    layoutId="broadcast-source"
                  />
                </div>

                {uploadSource === 'url' ? (
                  <div className="space-y-2">
                    <Label htmlFor="image_url">Image address</Label>
                    <Input
                      id="image_url"
                      value={form.image_url || ''}
                      onChange={(e) => setField('image_url', e.target.value)}
                      placeholder="https://example.com/poster.jpg"
                      aria-invalid={!!errors.image_url}
                      aria-describedby={errors.image_url ? 'image-url-error' : undefined}
                    />
                    {errors.image_url && (
                      <p id="image-url-error" role="alert" className="text-[12px] text-danger">
                        {errors.image_url}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="poster-file">Image file</Label>
                    <input
                      id="poster-file"
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => setField('localFile', e.target.files[0])}
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
                        {form.localFile.name} ready to send
                      </p>
                    )}
                    {errors.localFile && (
                      <p role="alert" className="text-[12px] text-danger">
                        {errors.localFile}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="caption">Caption</Label>
                  <Textarea
                    id="caption"
                    rows={3}
                    value={form.caption || ''}
                    onChange={(e) => setField('caption', e.target.value)}
                    placeholder="A line to send with the image."
                  />
                  <p className="text-[12px] leading-relaxed text-text-secondary">
                    Optional. The image is sent on its own if you leave this empty.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Goes out at</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                className="sm:max-w-[16rem]"
                value={form.scheduled_at || ''}
                onChange={(e) => setField('scheduled_at', e.target.value)}
                aria-invalid={!!errors.scheduled_at}
                aria-describedby={errors.scheduled_at ? 'scheduled-error' : 'scheduled-help'}
              />
              <p id="scheduled-help" className="text-[12px] leading-relaxed text-text-secondary">
                Read in this computer’s time zone. It must be in the future.
              </p>
              {errors.scheduled_at && (
                <p id="scheduled-error" role="alert" className="text-[12px] text-danger">
                  {errors.scheduled_at}
                </p>
              )}
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
                <CalendarClock />
                {submitting ? 'Scheduling…' : 'Schedule broadcast'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ── Quiz results ────────────────────────────────────────────────── */}

      <Dialog open={!!results} onClose={() => setResults(null)} size="xl" labelledBy="results-title">
        {results && (
          <>
            <DialogHeader
              id="results-title"
              eyebrow="Quiz results"
              title={results.question || 'Quiz'}
              description={`Sent ${format(parseISO(results.scheduled_at), "d MMMM yyyy 'at' h:mm a")}.`}
              onClose={() => setResults(null)}
            />

            <DialogBody className="space-y-8">
              {!resultData ? (
                <div className="py-10 text-center">
                  <span className="mx-auto block size-6 animate-spin rounded-full border-2 border-line border-t-ink" />
                  <p className="mt-4 font-mono text-[10px] tracking-[0.22em] uppercase text-titanium-700">
                    Loading results
                  </p>
                </div>
              ) : resultData.failed ? (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-light px-4 py-3">
                  <AlertCircle aria-hidden="true" className="mt-1 size-4 shrink-0 text-danger" />
                  <p className="text-[13px] text-danger">
                    The results could not be read. This does not mean nobody answered — try
                    opening them again in a moment.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hairline-grid grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-4">
                    {[
                      ['Sent to', resultData.total_sent, 'contacts'],
                      ['Replied', resultData.total_answers, 'of them'],
                      ['Right', resultData.correct, 'answers'],
                      ['Wrong', resultData.incorrect, 'answers'],
                    ].map(([label, value, hint]) => (
                      <div key={label} className="bg-white px-5 py-4">
                        <p className="spec-label">{label}</p>
                        <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums text-ink">
                          {value ?? 0}
                        </p>
                        <p className="mt-1 text-[12px] text-text-secondary">{hint}</p>
                      </div>
                    ))}
                  </div>

                  {resultData.total_answers > 0 ? (
                    <>
                      <div>
                        <p className="eyebrow">What people chose</p>
                        <AnswerChart
                          className="mt-4"
                          total={resultData.total_answers}
                          correctAnswer={results.correct_answer}
                          options={[
                            { key: 'A', label: results.option_a, count: resultData.answer_a || 0 },
                            { key: 'B', label: results.option_b, count: resultData.answer_b || 0 },
                            { key: 'C', label: results.option_c, count: resultData.answer_c || 0 },
                          ]}
                        />
                        <p className="mt-4 text-[13px] text-text-secondary">
                          {Math.round((resultData.correct / resultData.total_answers) * 100)}% of
                          the people who replied got it right.
                        </p>
                      </div>

                      <div>
                        <p className="eyebrow mb-4">Who answered</p>
                        <Table>
                          <TableHeader>
                            <tr>
                              <TableHead>Contact</TableHead>
                              <TableHead className="w-24 text-center">Chose</TableHead>
                              <TableHead className="w-32 text-right">Result</TableHead>
                            </tr>
                          </TableHeader>
                          <TableBody>
                            {(resultData.responses || []).map((response, index) => (
                              <TableRow key={`${response.phone}-${index}`}>
                                <TableCell>
                                  <p className="font-medium text-ink">
                                    {response.name ? formatSlug(response.name) : 'Name not given'}
                                  </p>
                                  <p className="mt-1 font-mono text-[11px] text-titanium-700">
                                    +{response.phone}
                                  </p>
                                </TableCell>
                                <TableCell className="text-center font-mono tabular-nums text-ink">
                                  {response.answer}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={response.is_correct ? 'success' : 'danger'}>
                                    {response.is_correct ? 'Right' : 'Wrong'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                        Nobody has replied yet
                      </p>
                      <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-text-secondary">
                        The quiz reached {resultData.total_sent ?? 0}{' '}
                        {resultData.total_sent === 1 ? 'contact' : 'contacts'}. Answers appear
                        here as people reply in WhatsApp.
                      </p>
                    </div>
                  )}
                </>
              )}
            </DialogBody>

            <DialogFooter>
              <Button variant="outline" onClick={() => setResults(null)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
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

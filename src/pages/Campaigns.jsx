import React, { useState, useEffect } from 'react';
import {
  Plus, Calendar, Trash2, BarChart2, CheckCircle, Clock,
  XCircle, Radio, Image, Brain, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import {
  getCampaigns, createCampaign, deleteCampaign, getCampaignAnalytics, uploadImage
} from '../api';

// Status → badge classes, on the shared success/warning/danger tokens
// instead of ad hoc blue/emerald/red shades.
const STATUS_STYLES = {
  scheduled: 'bg-warning-light text-warning',
  sent: 'bg-success-light text-success',
  cancelled: 'bg-danger-light text-danger',
};

const STATUS_ICONS = {
  scheduled: <Clock className="w-3 h-3" />,
  sent: <CheckCircle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

const EMPTY_QUIZ = {
  type: 'quiz', question: '', option_a: '', option_b: '', option_c: '',
  correct_answer: 'A', explanation: '', youtube_link: '', scheduled_at: '',
};
const EMPTY_POSTER = {
  type: 'poster', image_url: '', caption: '', scheduled_at: '',
};

import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('quiz');
  const [form, setForm] = useState(EMPTY_QUIZ);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [uploadSource, setUploadSource] = useState('url'); // 'url' or 'local'
  const [uploading, setUploading] = useState(false);
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
  const [confirmCancel, setConfirmCancel] = useState(null);

  // Smarter base URL: use current origin if deployed
  const API_BASE = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.includes('localhost')
    ? import.meta.env.VITE_API_URL
    : window.location.origin;

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await getCampaigns({
        limit: 10,
        offset: page * 10
      });
      setCampaigns(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const switchType = (t) => {
    setFormType(t);
    setForm(t === 'quiz' ? { ...EMPTY_QUIZ } : { ...EMPTY_POSTER });
    setErrors({});
  };

  const validate = () => {
    const e = {};
    if (!form.scheduled_at) e.scheduled_at = 'Schedule date & time required';

    if (formType === 'quiz') {
      if (!form.question.trim()) e.question = 'Question is required';
      if (!form.option_a.trim()) e.option_a = 'Option A required';
      if (!form.option_b.trim()) e.option_b = 'Option B required';
      if (!form.option_c.trim()) e.option_c = 'Option C required';
      if (!form.explanation.trim()) e.explanation = 'Explanation required';
      if (form.explanation.length > 300) e.explanation = 'Max 300 characters';
    }

    if (formType === 'poster') {
      if (uploadSource === 'url' && !form.image_url.trim()) {
        e.image_url = 'Image URL required';
      }
      if (uploadSource === 'local' && !form.localFile) {
        e.local_file = 'Image file required';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      let finalForm = { ...form, type: formType };

      // Handle Local File Upload
      if (formType === 'poster' && uploadSource === 'local') {
        if (!form.localFile) {
          setModal({
            open: true,
            title: 'Choose an image first',
            message: 'A poster campaign needs an image. Pick one, or switch to Image URL if it is already online.',
            type: 'error'
          });
          setSubmitting(false);
          return;
        }
        setUploading(true);
        const { data: uploadData } = await uploadImage(form.localFile);
        finalForm.image_url = `${API_BASE}${uploadData.url}`;
        setUploading(false);
      }

      // Convert datetime-local (YYYY-MM-DDTHH:MM) to full ISO string for Go's time.Time
      const scheduledISO = new Date(form.scheduled_at).toISOString();
      await createCampaign({ ...finalForm, scheduled_at: scheduledISO });

      setModal({
        open: true,
        title: 'Campaign scheduled',
        message: 'It will go out at the time you set. You can cancel it from this page until then.',
        type: 'success'
      });
      setShowForm(false);
      setForm(EMPTY_QUIZ);
      load();
    } catch (e) {
      console.error(e);
      setModal({
        open: true,
        title: 'Could not schedule the campaign',
        message:
          'Nothing was scheduled. Check that every required field is filled in and the send time is in the future, then try again.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    const camp = confirmCancel;
    if (!camp) return;
    try {
      await deleteCampaign(camp.id);
      load();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Could not cancel the campaign',
        message: 'The campaign is still scheduled and will go out as planned. Refresh the page and try again.',
        type: 'error'
      });
    }
  };

  const toggleAnalytics = async (camp) => {
    if (expandedId === camp.id) { setExpandedId(null); return; }
    setExpandedId(camp.id);
    if (!analytics[camp.id]) {
      try {
        const { data } = await getCampaignAnalytics(camp.id);
        setAnalytics(prev => ({ ...prev, [camp.id]: data }));
      } catch (err) {
        // An empty catch left the panel spinning on nothing, with no way to
        // tell a campaign with no responses from one whose figures failed to
        // load. The marker lets the panel say which.
        console.error(err);
        setAnalytics(prev => ({ ...prev, [camp.id]: { failed: true } }));
      }
    }
  };

  // Shared field styling, matching every other form in the app.
  const field = (key, label, opts = {}) => (
    <div key={key}>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
      {opts.textarea ? (
        <textarea
          rows={3}
          maxLength={300}
          className={`w-full border rounded-lg px-3.5 py-2.5 text-sm bg-white text-text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none ${errors[key] ? 'border-danger' : 'border-border'}`}
          value={form[key] || ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={opts.placeholder || ''}
        />
      ) : (
        <input
          type={opts.type || 'text'}
          className={`w-full border rounded-lg px-3.5 py-2.5 text-sm bg-white text-text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${errors[key] ? 'border-danger' : 'border-border'}`}
          value={form[key] || ''}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={opts.placeholder || ''}
        />
      )}
      {errors[key] && <p className="text-xs text-danger mt-1.5">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="max-w-5xl">
      <ConfirmModal
        isOpen={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Cancel this campaign?"
        message={
          confirmCancel
            ? `It will not be sent, and it cannot be brought back — you would need to create it again. Anyone who has already received it keeps the message.`
            : ''
        }
        confirmText="Cancel campaign"
      />

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Campaigns</h1>
          <p className="text-sm text-text-secondary mt-1">Schedule weekly quizzes & poster broadcasts</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setForm(EMPTY_QUIZ); setErrors({}); }}
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border border-border rounded-lg shadow-card p-6 mb-8">
          <h2 className="text-base font-semibold text-text-primary mb-5">Create Campaign</h2>

          {/* Type Toggle */}
          <div className="flex gap-2 mb-6">
            {[['quiz', Brain, 'Quiz'], ['poster', Image, 'Poster']].map(([t, Icon, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => switchType(t)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${formType === t
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text-secondary border-border hover:bg-background'
                  }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {formType === 'quiz' ? (
              <>
                {field('question', 'Quiz Question', { placeholder: 'What is a PLC?' })}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {field('option_a', 'Option A', { placeholder: 'First option' })}
                  {field('option_b', 'Option B', { placeholder: 'Second option' })}
                  {field('option_c', 'Option C', { placeholder: 'Third option' })}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Correct Answer</label>
                  <select
                    className="border border-border rounded-lg px-3.5 py-2.5 text-sm bg-white text-text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    value={form.correct_answer}
                    onChange={e => setForm(f => ({ ...f, correct_answer: e.target.value }))}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
                {field('explanation', 'Explanation (max 300 chars)', { textarea: true, placeholder: 'Explain the answer in 2–3 lines...' })}
                <p className="text-xs text-text-secondary -mt-3">{(form.explanation || '').length}/300 characters</p>
                {field('youtube_link', 'YouTube Link (optional)', { placeholder: 'https://youtube.com/...' })}
              </>
            ) : (
              <>
                <div className="inline-flex gap-1 p-1 bg-background rounded-lg mb-1">
                  {[['url', 'Remote URL'], ['local', 'Local Upload']].map(([s, l]) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setUploadSource(s)}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${uploadSource === s ? 'bg-white text-text-primary shadow-card' : 'text-text-secondary'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {uploadSource === 'url' ? (
                  field('image_url', 'Image URL', { placeholder: 'https://images.unsplash.com/...' })
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Select Image File</label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => setForm(f => ({ ...f, localFile: e.target.files[0] }))}
                      className="w-full border border-dashed border-border rounded-lg p-4 bg-background text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary-light file:text-primary hover:file:bg-primary/20"
                    />
                    {uploading ? (
                      <p className="mt-2 flex items-center gap-2 text-xs font-medium text-text-secondary">
                        <span className="size-3 animate-spin rounded-full border-2 border-line border-t-ink" />
                        Uploading the image — this can take a moment on a slow connection.
                      </p>
                    ) : (
                      form.localFile && (
                        <p className="mt-2 text-xs text-success font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {form.localFile.name} selected
                        </p>
                      )
                    )}
                  </div>
                )}
                {field('caption', 'Caption (optional)', { textarea: true, placeholder: 'Add a message to accompany the image...' })}
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Schedule Date & Time (IST)</label>
              <input
                type="datetime-local"
                className={`border rounded-lg px-3.5 py-2.5 text-sm bg-white text-text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${errors.scheduled_at ? 'border-danger' : 'border-border'}`}
                value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
              />
              {errors.scheduled_at && <p className="text-xs text-danger mt-1.5">{errors.scheduled_at}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 h-10 px-5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Schedule Campaign
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-10 px-5 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-text-secondary">
          <Loader2 className="w-6 h-6 animate-spin mr-3 text-primary" /> Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-24">
          <Radio className="w-10 h-10 text-text-secondary mx-auto mb-4" />
          <p className="text-text-primary font-medium">No campaigns yet</p>
          <p className="text-sm text-text-secondary mt-1">Click "New Campaign" to schedule your first quiz or poster broadcast.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(camp => {
            const a = analytics[camp.id];
            const isExpanded = expandedId === camp.id;
            const correctPct = a && a.total_answers > 0
              ? Math.round((a.correct / a.total_answers) * 100) : 0;

            return (
              <div key={camp.id} className="bg-white border border-border rounded-lg shadow-card overflow-hidden">
                <div className="flex items-start gap-4 p-5">
                  {/* Type Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${camp.type === 'quiz' ? 'bg-primary-light' : 'bg-accent/10'}`}>
                    {camp.type === 'quiz'
                      ? <Brain className="w-5 h-5 text-primary" />
                      : <Image className="w-5 h-5 text-accent" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_STYLES[camp.status]}`}>
                        {STATUS_ICONS[camp.status]}
                        {camp.status.charAt(0).toUpperCase() + camp.status.slice(1)}
                      </span>
                      <span className="text-xs text-text-secondary capitalize">{camp.type}</span>
                    </div>
                    <p className="font-medium text-text-primary text-sm truncate">
                      {camp.type === 'quiz' ? camp.question : (camp.caption || camp.image_url)}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(camp.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {camp.status === 'sent' && ` · Sent to ${camp.total_sent} contacts`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {camp.status === 'sent' && camp.type === 'quiz' && (
                      <button
                        onClick={() => toggleAnalytics(camp)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover px-3 py-1.5 rounded-lg hover:bg-primary-light transition-colors"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        Stats
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                    {camp.status === 'scheduled' && (
                      <button
                        onClick={() => setConfirmCancel(camp)}
                        className="p-2 text-danger hover:bg-danger-light rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Analytics Panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-background px-5 py-4">
                    {!a ? (
                      <div className="flex items-center gap-2 text-text-secondary text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics...
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary mb-3">Quiz Performance</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          {[
                            ['Total Sent', a.total_sent, 'text-text-primary'],
                            ['Responses', a.total_answers, 'text-primary'],
                            ['Correct', a.correct, 'text-success'],
                            ['Incorrect', a.incorrect, 'text-danger'],
                          ].map(([label, val, textCls]) => (
                            <div key={label} className="bg-white border border-border rounded-lg p-3 text-center">
                              <p className={`text-lg font-bold ${textCls}`}>{val ?? 0}</p>
                              <p className="text-xs text-text-secondary mt-0.5">{label}</p>
                            </div>
                          ))}
                        </div>

                        {a.total_answers > 0 && (
                          <div className="space-y-6">
                            <div>
                              <p className="text-xs font-medium text-text-secondary mb-2">Answer Distribution</p>
                              <div className="space-y-2">
                                {[['A', a.answer_a], ['B', a.answer_b], ['C', a.answer_c]].map(([opt, cnt]) => {
                                  const pct = Math.round((cnt / a.total_answers) * 100);
                                  return (
                                    <div key={opt} className="flex items-center gap-3">
                                      <span className="w-5 text-xs font-semibold text-text-secondary">{opt}</span>
                                      <div className="flex-1 bg-border rounded-full h-1.5">
                                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-xs text-text-secondary w-14 text-right">{cnt} ({pct}%)</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-text-secondary mb-2">Respondent List</p>
                              <div className="bg-white border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-background border-b border-border">
                                      <th className="px-3 py-2 font-medium text-text-secondary">Name / Phone</th>
                                      <th className="px-3 py-2 font-medium text-text-secondary text-center">Choice</th>
                                      <th className="px-3 py-2 font-medium text-text-secondary text-right">Result</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {(a.responses || []).map((resp, i) => (
                                      <tr key={i} className="hover:bg-background transition-colors">
                                        <td className="px-3 py-2">
                                          <div className="font-medium text-text-primary">{resp.name || 'Unknown'}</div>
                                          <div className="text-text-secondary">+{resp.phone}</div>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <span className="inline-flex items-center justify-center w-6 h-6 bg-background rounded-md font-semibold text-text-primary">{resp.answer}</span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {resp.is_correct ? (
                                            <span className="text-success font-medium">Correct</span>
                                          ) : (
                                            <span className="text-danger font-medium">Incorrect</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <p className="text-xs text-text-secondary">
                              Overall accuracy: <strong className="text-success">{correctPct}%</strong>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {total > 10 && (
        <div className="mt-8 px-5 py-3.5 bg-white border border-border rounded-lg flex items-center justify-between shadow-card">
          <span className="text-xs text-text-secondary">
            Page <span className="font-medium text-text-primary">{page + 1}</span> of {Math.ceil(total / 10)}
          </span>
          <div className="flex gap-4 items-center">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="text-xs font-medium text-text-secondary hover:text-primary disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="w-px h-4 bg-border" />
            <button
              disabled={(page + 1) * 10 >= total}
              onClick={() => setPage(page + 1)}
              className="text-xs font-medium text-text-secondary hover:text-primary disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
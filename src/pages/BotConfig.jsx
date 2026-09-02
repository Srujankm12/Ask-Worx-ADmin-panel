import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Plus, Trash2, Pencil, X, AlertCircle, Search } from 'lucide-react';

import { getSettings, updateSettings, getFaqs, saveFaq, deleteFaq } from '../api';

import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import WhatsAppPreview, { FormattingHint } from '../components/WhatsAppPreview';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs } from '../components/ui/tabs';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../components/ui/dialog';
import { Reveal } from '../components/motion/Reveal';
import { cn } from '../lib/utils';

/**
 * Automation — everything the bot says without a person involved.
 *
 * Each field here is a message that goes to a real customer or a real
 * colleague, so every one is edited beside a preview of how WhatsApp will
 * actually render it. Previously they were bare textareas: `*bold*` looked
 * like asterisks and nobody could see the result until it had been sent.
 *
 * Fields are grouped by WHO RECEIVES the message rather than by which
 * database key holds it, because that is the question someone arrives with.
 */

const GROUPS = [
  {
    id: 'customers',
    label: 'Customers',
    blurb:
      'Messages that go to people outside the company. These are the first thing a prospective customer reads, so they set the tone for everything after.',
    fields: [
      {
        key: 'content_welcome_body',
        label: 'Welcome message',
        help: 'Sent the first time somebody messages the bot.',
        image: 'content_welcome_image',
      },
      {
        key: 'support_center',
        label: 'Support menu',
        help: 'Shown when a customer asks for help, above the category buttons.',
      },
      {
        key: 'greeting_customer',
        label: 'Morning greeting',
        help: 'Sent to every customer contact on the daily schedule.',
      },
      {
        key: 'about_company',
        label: 'About the company',
        help: 'Sent when somebody asks who you are or what you do.',
      },
    ],
  },
  {
    id: 'team',
    label: 'Your team',
    blurb:
      'Every message an employee receives, in the order they meet it through the day. Written for colleagues, so they can be shorter and more direct than the customer-facing ones.',
    fields: [
      {
        key: 'greeting_employee',
        label: 'Morning greeting',
        help: 'Sent to every employee at the start of the working day.',
        placeholders: ['name', 'company'],
      },
      {
        key: 'hub_welcome',
        label: 'Internal hub menu',
        help: 'Shown above the Start day / End day / Apply leave buttons whenever an employee messages the bot.',
        placeholders: ['name', 'company'],
      },
      {
        key: 'emp_checkin_prompt',
        label: 'Check in — asking for location',
        help: 'Sent when an employee taps Start day. Attendance is only recorded once they share a location, so this has to say how.',
      },
      {
        key: 'emp_checkin_done',
        label: 'Check in — confirmed',
        help: 'Sent once the location arrives. It also asks for the day plan, so the question has to be in here.',
      },
      {
        key: 'emp_checkin_already',
        label: 'Check in — already done',
        help: 'Sent if they tap Start day a second time.',
      },
      {
        key: 'emp_workplan_saved',
        label: 'Day plan saved',
        help: 'Sent once they reply with what they are working on.',
      },
      {
        key: 'emp_checkout_prompt',
        label: 'Check out — asking for location',
        help: 'Sent when an employee taps End day.',
      },
      {
        key: 'emp_checkout_done',
        label: 'Check out — confirmed',
        help: 'Sent once the location arrives. It also asks for the end-of-day report.',
      },
      {
        key: 'emp_checkout_already',
        label: 'Check out — already done',
        help: 'Sent if they tap End day a second time.',
      },
      {
        key: 'emp_eod_saved',
        label: 'End-of-day report filed',
        help: 'The last message of an employee’s day.',
      },
    ],
  },
  {
    id: 'leave',
    label: 'Leave & reminders',
    blurb:
      'The leave request conversation, and the two messages the system sends on its own. A reminder or a decision may arrive hours after anything else, so each one has to make sense with no conversation above it.',
    fields: [
      {
        key: 'emp_leave_type_prompt',
        label: 'Leave — which type',
        help: 'Sent when an employee taps Apply leave, above the Casual / Sick / Emergency buttons.',
      },
      {
        key: 'emp_leave_date_prompt',
        label: 'Leave — which date',
        help: 'The date is typed as free text, so give an example of the format you want.',
      },
      {
        key: 'emp_leave_reason_prompt',
        label: 'Leave — reason',
        help: 'The last question in the leave conversation.',
      },
      {
        key: 'emp_leave_submitted',
        label: 'Leave — request received',
        help: 'Confirms the request reached a manager. Say what happens next so nobody has to chase it.',
      },
      {
        key: 'emp_leave_decision',
        label: 'Leave — approved or rejected',
        help: 'Sent the moment you decide on the Team screen. {{status}} becomes the word approved or rejected.',
        placeholders: ['status', 'name', 'company'],
      },
      {
        key: 'emp_reminder',
        label: 'Scheduled reminder',
        help: 'The wrapper around every reminder you schedule. {{task}} is the reminder text you typed.',
        placeholders: ['task', 'name', 'company'],
      },
      {
        key: 'emp_announcement',
        label: 'Announcement wrapper',
        help: 'Wrapped around every announcement you send from the Team screen. {{message}} is what you typed there — everything else here goes out with it.',
        placeholders: ['message', 'company'],
      },
    ],
  },
  {
    id: 'menus',
    label: 'Menus',
    blurb:
      'The screens a customer moves through. Each ends with buttons, so the last line should be the question those buttons answer — "What are you looking for?", not a full stop.',
    fields: [
      {
        key: 'content_solutions_body',
        image: 'content_solutions_image',
        label: 'Our solutions',
        help: 'The first menu after the welcome. Leads to the three category menus below.',
      },
      {
        key: 'content_help_body',
        label: 'Help',
        help: 'Shown when somebody types help, or taps the help button.',
      },
      {
        key: 'content_explore_body',
        label: 'Explore services',
        help: 'A short list of everything you do, ending in a request for a quote or a callback.',
      },
      {
        key: 'content_expert_image',
        label: 'Talk to an expert — image',
        help: 'The picture above the support categories. Its wording is the Support menu field under Customers.',
        imageOnly: true,
      },
      {
        key: 'content_industries_body',
        label: 'Industries we serve',
        help: 'Reached from the About page.',
      },
      {
        key: 'content_faqprompt_body',
        label: 'Ask a question',
        help: 'Invites a free-text question. Give an example or two — people do not know what they may ask.',
        placeholders: ['company'],
      },
    ],
  },
  {
    id: 'industrial',
    label: 'Industrial automation',
    blurb:
      'The four service pages under Industrial automation. These are the longest messages the bot sends and the ones a prospective customer reads most closely — until now none of them could be changed without a deploy.',
    fields: [
      {
        key: 'content_industrial_body',
        image: 'content_industrial_image',
        label: 'Industrial automation menu',
        help: 'The category menu. Leads to the four pages below.',
      },
      { key: 'content_plc_body', image: 'content_plc_image', label: 'PLC & control systems' },
      { key: 'content_scada_body', image: 'content_scada_image', label: 'SCADA & HMI development' },
      { key: 'content_robotics_body', image: 'content_robotics_image', label: 'Industrial robotics & motion' },
      { key: 'content_panels_body', image: 'content_panels_image', label: 'Control panel design' },
    ],
  },
  {
    id: 'software',
    label: 'Software & digital',
    blurb:
      'The software category and the four pages beneath it.',
    fields: [
      {
        key: 'content_software_body',
        image: 'content_software_image',
        label: 'Software & digital menu',
        help: 'The category menu.',
      },
      {
        key: 'content_softwaremenu_body',
        image: 'content_softwaremenu_image',
        label: 'Software solutions submenu',
      },
      { key: 'content_whatsappbot_body', image: 'content_whatsappbot_image', label: 'WhatsApp bot' },
      { key: 'content_webapp_body', image: 'content_webapp_image', label: 'Web & mobile apps' },
      { key: 'content_indsoftware_body', image: 'content_indsoftware_image', label: 'Industrial software' },
      { key: 'content_seo_body', image: 'content_seo_image', label: 'Digital marketing & SEO' },
    ],
  },
  {
    id: 'iiot',
    label: 'IIoT & analytics',
    blurb: 'The IIoT category and the two pages beneath it.',
    fields: [
      {
        key: 'content_iiot_body',
        image: 'content_iiot_image',
        label: 'IIoT & analytics menu',
        help: 'The category menu.',
      },
      { key: 'content_gateway_body', image: 'content_gateway_image', label: 'IIoT gateways' },
      { key: 'content_analytics_body', image: 'content_analytics_image', label: 'Cloud analytics' },
    ],
  },
];

/**
 * Every button the bot can show, grouped by where a person meets it.
 *
 * A label belongs to the ACTION, not to the screen — so `main_menu` is one
 * entry here and changing it changes all sixteen places it appears. Before
 * this the labels were written inline at 85 call sites, which is how six
 * actions ended up with two or three different labels each.
 */
const BUTTON_GROUPS = [
  {
    label: 'Navigation',
    help: 'Shown on almost every screen. Changing one of these changes it everywhere it appears.',
    buttons: [
      { key: 'main_menu', label: 'Main menu', where: 'On 16 screens' },
      { key: 'menu', label: 'Main menu (alternate id)', where: 'Used by one older flow' },
      { key: 'our_solutions', label: 'Our solutions' },
      { key: 'our_industries', label: 'Our industries' },
      { key: 'back_to_solutions', label: 'Back to solutions' },
      { key: 'back_to_software', label: 'Back to software menu' },
      { key: 'opt_out', label: 'Stop messages', where: 'Lets a contact opt out of broadcasts' },
    ],
  },
  {
    label: 'Getting in touch',
    help: 'The buttons that turn a conversation into a lead. These are the ones worth testing wording on.',
    buttons: [
      { key: 'get_free_quote', label: 'Get a free quote', where: 'On 12 service pages' },
      { key: 'quotation', label: 'Request a quotation' },
      { key: 'callback', label: 'Book a callback' },
      { key: 'talk_to_expert', label: 'Talk to an expert' },
      { key: 'expert', label: 'Talk to an expert (alternate id)' },
      { key: 'flow_quotation', label: 'Quotation — support flow' },
      { key: 'flow_callback', label: 'Callback — support flow' },
      { key: 'flow_service', label: 'Service request — support flow' },
      { key: 'service', label: 'Service request' },
      { key: 'technical', label: 'Technical query' },
      { key: 'product', label: 'Product query' },
      { key: 'general', label: 'General enquiry' },
    ],
  },
  {
    label: 'Solution categories',
    help: 'The three top-level categories, plus the support-flow versions of the same choices.',
    buttons: [
      { key: 'industrial_auto', label: 'Industrial automation' },
      { key: 'digital_software', label: 'Digital & software' },
      { key: 'iiot_analytics', label: 'IIoT & analytics' },
      { key: 'cat_automation', label: 'Industrial automation — support flow' },
      { key: 'cat_app_dev', label: 'Digital & software — support flow' },
      { key: 'cat_marketing', label: 'Digital marketing — support flow' },
    ],
  },
  {
    label: 'Service pages',
    help: 'Lead to an individual service page, and step a customer from one to the next.',
    buttons: [
      { key: 'plc_control', label: 'PLC & control' },
      { key: 'scada_hmi', label: 'SCADA & HMI' },
      { key: 'robotics', label: 'Robotics' },
      { key: 'software_solutions', label: 'Software solutions' },
      { key: 'whatsapp_bot', label: 'WhatsApp bots' },
      { key: 'web_app_dev', label: 'Web & app development' },
      { key: 'industrial_sw', label: 'Industrial software' },
      { key: 'seo_marketing', label: 'SEO & marketing' },
      { key: 'iiot_gateway', label: 'IIoT gateway' },
      { key: 'cloud_analytics', label: 'Cloud analytics' },
      { key: 'next_to_scada', label: 'Next service → SCADA' },
      { key: 'next_to_robotics', label: 'Next service → Robotics' },
      { key: 'next_to_panels', label: 'Next service → Control panels' },
      { key: 'next_to_analytics', label: 'Next service → Cloud analytics' },
    ],
  },
  {
    label: 'Your team',
    help: 'The internal hub buttons an employee taps, and the three leave types.',
    buttons: [
      { key: 'start_day', label: 'Start day' },
      { key: 'end_day', label: 'End day' },
      { key: 'apply_leave', label: 'Apply leave' },
      { key: 'leave_casual', label: 'Casual leave' },
      { key: 'leave_sick', label: 'Sick leave' },
      { key: 'leave_emergency', label: 'Emergency leave' },
    ],
  },
];

// WhatsApp truncates a button title at 20 characters. An emoji counts as
// more than one, which is why several of these sit close to the edge.
const BUTTON_LIMIT = 20;

const AREAS = [
  { value: 'messages', label: 'Messages' },
  { value: 'replies', label: 'Auto-replies' },
  { value: 'buttons', label: 'Buttons' },
];

const BotConfig = () => {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState({});
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const [area, setArea] = useState('messages');
  const [group, setGroup] = useState('customers');
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });

  const [faqDialog, setFaqDialog] = useState(null); // null | {} | faq
  const [confirmDeleteFaq, setConfirmDeleteFaq] = useState(null);
  const [faqSearch, setFaqSearch] = useState('');

  const notify = (title, message, type = 'success') =>
    setModal({ open: true, title, message, type });

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [settingsRes, faqRes] = await Promise.all([getSettings(), getFaqs()]);
      setSettings(settingsRes.data || {});
      setSaved(settingsRes.data || {});
      setFaqs(faqRes.data || []);
    } catch (err) {
      console.error(err);
      setLoadError(
        'Could not load the bot configuration. The server did not respond — check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Which fields differ from what is on the server. Naming them means the save
  // bar can say what it is about to change instead of just "unsaved changes".
  const changed = useMemo(
    () => Object.keys(settings).filter((key) => settings[key] !== saved[key]),
    [settings, saved],
  );

  const setField = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  // Appended rather than inserted at the caret: a placeholder chip is a
  // reminder that the token exists, and dropping it at the end is easier to
  // undo than guessing where the cursor was.
  const insertPlaceholder = (key, token) =>
    setSettings((current) => ({ ...current, [key]: `${current[key] || ''}${token}` }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      setSaved(settings);
      notify(
        'Bot updated',
        `${changed.length} ${changed.length === 1 ? 'message is' : 'messages are'} now live. The next person who triggers ${changed.length === 1 ? 'it' : 'them'} will get the new wording.`,
      );
    } catch (err) {
      console.error(err);
      notify(
        'Could not save',
        'Nothing was changed on the bot. Your edits are still on screen — check your connection and save again.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => setSettings(saved);

  const handleFaqSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const editing = faqDialog?.id;

    try {
      await saveFaq({
        id: editing || 0,
        keywords: form.get('keywords'),
        answer: form.get('answer'),
      });
      setFaqDialog(null);
      const faqRes = await getFaqs();
      setFaqs(faqRes.data || []);
      notify(
        editing ? 'Auto-reply updated' : 'Auto-reply added',
        'The bot will use it on the next matching message.',
      );
    } catch (err) {
      console.error(err);
      notify('Could not save the auto-reply', 'Nothing was saved. Please try again.', 'error');
    }
  };

  const handleFaqDelete = async () => {
    try {
      await deleteFaq(confirmDeleteFaq.id);
      setFaqs((current) => current.filter((f) => f.id !== confirmDeleteFaq.id));
      notify('Auto-reply deleted', 'The bot will no longer reply to those keywords.');
    } catch (err) {
      console.error(err);
      notify('Could not delete the auto-reply', 'Nothing was changed. Please try again.', 'error');
    }
  };

  const visibleFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        (f.keywords || '').toLowerCase().includes(q) ||
        (f.answer || '').toLowerCase().includes(q),
    );
  }, [faqs, faqSearch]);

  const activeGroup = GROUPS.find((g) => g.id === group) || GROUPS[0];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="size-7 animate-spin rounded-full border-2 border-line border-t-ink" />
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-titanium-700">
          Loading automation
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
        isOpen={!!confirmDeleteFaq}
        onClose={() => setConfirmDeleteFaq(null)}
        onConfirm={handleFaqDelete}
        type="danger"
        title="Delete this auto-reply?"
        message={
          confirmDeleteFaq
            ? `The bot will stop replying to “${confirmDeleteFaq.keywords}”. Anyone asking about it will fall through to the support menu instead. This cannot be undone.`
            : ''
        }
        confirmText="Delete auto-reply"
      />

      <PageHeader
        eyebrow="Bot"
        title="Automation"
        intro="Everything the bot says without a person involved. Each message is shown exactly as WhatsApp will render it, so you can see what a customer receives before it goes out."
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
        <div className="mb-6">
          <Tabs
            value={area}
            onValueChange={setArea}
            layoutId="automation-area"
            items={AREAS.map((a) => ({
              ...a,
              count: a.value === 'replies' ? faqs.length : undefined,
            }))}
          />
        </div>
      </Reveal>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      {area === 'messages' && (
        <>
          <Reveal delay={0.04}>
            <div className="mb-6 flex flex-col gap-4">
              <Tabs
                value={group}
                onValueChange={setGroup}
                layoutId="automation-group"
                items={GROUPS.map((g) => ({ value: g.id, label: g.label }))}
              />
              <p className="max-w-[68ch] text-[13px] leading-relaxed text-text-secondary">
                {activeGroup.blurb}
              </p>
            </div>
          </Reveal>

          <div className="flex flex-col gap-6">
            {activeGroup.fields.map((field, index) => (
              <Reveal key={field.key} delay={0.06 + index * 0.03}>
                <MessageField
                  field={field}
                  value={settings[field.key] || ''}
                  imageValue={field.image ? settings[field.image] || '' : undefined}
                  dirty={changed.includes(field.key)}
                  onChange={setField}
                  onInsert={insertPlaceholder}
                />
              </Reveal>
            ))}
          </div>
        </>
      )}

      {area === 'buttons' && (
        <div className="flex flex-col gap-6">
          <Reveal delay={0.04}>
            <p className="max-w-[72ch] text-[13px] leading-relaxed text-text-secondary">
              A label belongs to the action, not to the screen — so changing
              “Main menu” here changes it on all sixteen screens that show it.
              WhatsApp truncates a button at {BUTTON_LIMIT} characters, and an
              emoji counts as more than one.
            </p>
          </Reveal>

          {BUTTON_GROUPS.map((group, groupIndex) => (
            <Reveal key={group.label} delay={0.06 + groupIndex * 0.03}>
              <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                    {group.label}
                  </h2>
                  <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-text-secondary">
                    {group.help}
                  </p>
                </div>

                <div className="divide-y divide-border">
                  {group.buttons.map((button) => {
                    const value = settings[`btn_${button.key}`] ?? '';
                    const tooLong = value.length > BUTTON_LIMIT;

                    return (
                      <div
                        key={button.key}
                        className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-start"
                      >
                        <div className="md:w-56">
                          <Label htmlFor={`btn_${button.key}`}>{button.label}</Label>
                          {button.where && (
                            <p className="mt-2 text-[12px] leading-snug text-text-secondary">
                              {button.where}
                            </p>
                          )}
                          {changed.includes(`btn_${button.key}`) && (
                            <Badge variant="warning" className="mt-2">
                              Unsaved
                            </Badge>
                          )}
                        </div>

                        <div className="flex-1">
                          <Input
                            id={`btn_${button.key}`}
                            value={value}
                            aria-invalid={tooLong || undefined}
                            onChange={(event) => setField(`btn_${button.key}`, event.target.value)}
                          />
                          <p
                            className={cn(
                              'mt-2 font-mono text-[11px] tabular-nums',
                              tooLong ? 'text-danger' : 'text-titanium-700',
                            )}
                          >
                            {value.length} / {BUTTON_LIMIT}
                            {tooLong && ' — WhatsApp will cut this off'}
                          </p>
                        </div>

                        {/* What it looks like on the phone. */}
                        <div className="md:w-52">
                          <span
                            className={cn(
                              'inline-flex w-full items-center justify-center truncate rounded-lg border px-3 py-2 text-[13px]',
                              tooLong
                                ? 'border-danger/30 bg-danger-light text-danger'
                                : 'border-border bg-paper text-ink',
                            )}
                          >
                            {value.slice(0, BUTTON_LIMIT) || '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {/* ── Auto-replies ─────────────────────────────────────────────────── */}
      {area === 'replies' && (
        <Reveal delay={0.04}>
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                  Keyword auto-replies
                </h2>
                <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-text-secondary">
                  When a customer’s message contains any of the keywords, the bot
                  sends that answer instead of the support menu. Keywords are
                  matched anywhere in the message and are not case sensitive.
                </p>
              </div>

              <Button onClick={() => setFaqDialog({})}>
                <Plus />
                Add auto-reply
              </Button>
            </div>

            {faqs.length > 0 && (
              <div className="border-b border-border px-5 py-3">
                <div className="relative max-w-xs">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-titanium-700"
                  />
                  <Input
                    value={faqSearch}
                    onChange={(event) => setFaqSearch(event.target.value)}
                    placeholder="Search keywords or answers"
                    aria-label="Search auto-replies"
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            {visibleFaqs.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                  {faqs.length === 0 ? 'No auto-replies yet' : 'Nothing matches that search'}
                </p>
                <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed text-text-secondary">
                  {faqs.length === 0
                    ? 'Add one for a question you answer often — pricing, location, lead times. The bot will answer it instantly instead of handing the person a menu.'
                    : 'Try a different word, or clear the search to see all of them.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visibleFaqs.map((faq) => (
                  <li key={faq.id} className="px-5 py-4 transition-colors hover:bg-paper">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5">
                          {(faq.keywords || '')
                            .split(',')
                            .map((word) => word.trim())
                            .filter(Boolean)
                            .map((word) => (
                              <Badge key={word} variant="secondary">
                                {word}
                              </Badge>
                            ))}
                        </div>

                        <p className="mt-3 max-w-[72ch] whitespace-pre-wrap text-[13px] leading-relaxed text-body-text">
                          {faq.answer}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Edit the auto-reply for ${faq.keywords}`}
                          title="Edit"
                          onClick={() => setFaqDialog(faq)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="destructive-outline"
                          aria-label={`Delete the auto-reply for ${faq.keywords}`}
                          title="Delete"
                          onClick={() => setConfirmDeleteFaq(faq)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      )}

      {/* ── Save bar ─────────────────────────────────────────────────────── */}
      {/* Only appears when something is actually different, and names how many
          messages are about to change rather than saying "unsaved changes". */}
      {changed.length > 0 && area !== 'replies' && (
        <div className="sticky bottom-0 z-20 mt-8 -mx-5 border-t border-border bg-white/95 px-5 py-4 backdrop-blur md:-mx-8 md:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">
            <p className="text-[13px] text-body-text">
              <span className="font-medium text-ink">
                {changed.length} {changed.length === 1 ? 'message' : 'messages'}
              </span>{' '}
              edited and not yet live.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDiscard} disabled={saving}>
                <X />
                Discard changes
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save />
                {saving ? 'Saving' : 'Save and go live'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ dialog ───────────────────────────────────────────────────── */}
      <Dialog open={!!faqDialog} onClose={() => setFaqDialog(null)} labelledBy="faq-dialog" size="lg">
        <DialogHeader
          id="faq-dialog"
          eyebrow="Auto-reply"
          title={faqDialog?.id ? 'Edit auto-reply' : 'Add an auto-reply'}
          description="The bot answers instantly when a customer’s message contains one of these keywords."
          onClose={() => setFaqDialog(null)}
        />
        <form onSubmit={handleFaqSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faq-keywords">Keywords</Label>
              <Input
                id="faq-keywords"
                name="keywords"
                required
                defaultValue={faqDialog?.keywords || ''}
                placeholder="price, cost, quotation, how much"
              />
              <p className="text-[12px] leading-relaxed text-text-secondary">
                Separate with commas. Matched anywhere in the message and not
                case sensitive, so “price” also catches “What is the pricing?”.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faq-answer">Answer</Label>
              <Textarea
                id="faq-answer"
                name="answer"
                required
                rows={6}
                defaultValue={faqDialog?.answer || ''}
                placeholder="Pricing depends on scope, so we quote per project. Share your requirement and an engineer will come back with a written proposal within two working days."
              />
              <FormattingHint />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFaqDialog(null)}>
              Cancel
            </Button>
            <Button type="submit">{faqDialog?.id ? 'Save changes' : 'Add auto-reply'}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
};

/** One editable message, with its rendered result beside it. */
const MessageField = ({ field, value, imageValue, dirty, onChange, onInsert }) => (
  <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-[15px] font-bold uppercase tracking-tight text-ink">
            {field.label}
          </h3>
          {dirty && <Badge variant="warning">Unsaved</Badge>}
        </div>
        {field.help && (
          <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-text-secondary">
            {field.help}
          </p>
        )}
        {field.placeholders?.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="spec-label">Accepts</span>
            {field.placeholders.map((name) => (
              <button
                key={name}
                type="button"
                title={`Insert {{${name}}}`}
                onClick={() => onInsert(field.key, `{{${name}}}`)}
                className="rounded-full border border-border bg-paper px-2.5 py-0.5 font-mono text-[11px] text-titanium-700 transition-colors hover:border-ink hover:text-ink"
              >
                {`{{${name}}}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>

    <div
      className={cn(
        'gap-6 p-5',
        field.imageOnly ? 'block' : 'grid grid-cols-1 lg:grid-cols-2',
      )}
    >
      {field.imageOnly ? (
        <div className="space-y-2">
          <Label htmlFor={field.key}>Image URL</Label>
          <Input
            id={field.key}
            value={value}
            onChange={(event) => onChange(field.key, event.target.value)}
            placeholder="https://…"
          />
        </div>
      ) : (
      <div className="space-y-2">
        <Label htmlFor={field.key}>Message</Label>
        <Textarea
          id={field.key}
          rows={10}
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          className="font-mono text-[12px] leading-relaxed"
        />
        <FormattingHint />

        {field.image && (
          <div className="space-y-2 pt-2">
            <Label htmlFor={field.image}>Image URL</Label>
            <Input
              id={field.image}
              value={imageValue}
              onChange={(event) => onChange(field.image, event.target.value)}
              placeholder="https://…"
            />
          </div>
        )}
      </div>

      )}

      {!field.imageOnly && (
        <WhatsAppPreview message={value} empty="Type a message to see it here." />
      )}
    </div>
  </div>
);

export default BotConfig;

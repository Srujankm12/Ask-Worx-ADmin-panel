import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, getFaqs, saveFaq, deleteFaq } from '../api';
import { Save, Bot, MessageSquare, LayoutGrid, Info, Search, Plus, Trash2, Edit3, X, Cpu } from 'lucide-react';
import Modal from '../components/Modal';

// Section accent colors, reusing tokens already defined in the theme
// (primary/secondary/accent/warning) instead of inventing new ones or
// building `bg-${color}-500` at runtime — that pattern never generates a
// class because Tailwind needs the literal text somewhere in source.
const SECTION_STYLES = {
  welcome: 'bg-warning',
  industrial: 'bg-primary',
  software: 'bg-accent',
  iiot: 'bg-secondary',
};

const BotConfig = () => {
  const [activeTab, setActiveTab] = useState('greetings');
  const [settings, setSettings] = useState({});
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });

  const [editingFaq, setEditingFaq] = useState(null);
  const [faqForm, setFaqForm] = useState({ keywords: '', answer: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sResp, fResp] = await Promise.all([getSettings(), getFaqs()]);
      setSettings(sResp.data);
      setFaqs(fResp.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      showModal('Settings saved', 'The bot has been updated with your new templates.', 'success');
    } catch (err) {
      showModal('Sync failed', 'Could not update settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showModal = (title, message, type) => {
    setModal({ open: true, title, message, type });
  };

  const handleFaqSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveFaq({ ...faqForm, id: editingFaq?.id || 0 });
      setEditingFaq(null);
      setFaqForm({ keywords: '', answer: '' });
      const fResp = await getFaqs();
      setFaqs(fResp.data || []);
      showModal('Knowledge base updated', 'The FAQ entry has been saved.', 'success');
    } catch (err) {
      showModal('Error', 'Failed to save FAQ entry.', 'error');
    }
  };

  const handleDeleteFaq = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await deleteFaq(id);
      setFaqs(faqs.filter((f) => f.id !== id));
    } catch (err) {
      showModal('Error', 'Failed to delete FAQ.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'greetings', label: 'Greetings', icon: MessageSquare },
    { id: 'hub', label: 'Internal Hub', icon: LayoutGrid },
    { id: 'faq', label: 'Knowledge Base', icon: Search },
    { id: 'solutions', label: 'Solutions', icon: Cpu },
    { id: 'company', label: 'Company Info', icon: Info },
  ];

  // Shared field styles so every input/textarea in this page matches —
  // one appearance for form fields across the whole CRM.
  const fieldLabel = 'text-xs font-medium text-text-secondary mb-1.5 block';
  const fieldInput =
    'w-full bg-white border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors';

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Bot Brain</h1>
          <p className="text-sm text-text-secondary mt-1 max-w-lg">
            Manage your bot's personality, knowledge, and workflow. Changes reflect instantly on
            WhatsApp.
          </p>
        </div>

        {activeTab !== 'faq' && (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-60 shrink-0"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex overflow-x-auto gap-1 mb-8 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {/* GREETINGS TAB */}
        {activeTab === 'greetings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border rounded-lg shadow-card p-6">
              <h3 className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                Employee Greetings
              </h3>
              <div>
                <label className={fieldLabel}>Morning nudge</label>
                <textarea
                  className={`${fieldInput} min-h-[150px]`}
                  value={settings.greeting_employee || ''}
                  onChange={(e) => handleChange('greeting_employee', e.target.value)}
                  placeholder="Morning message to employees..."
                />
                <p className="text-xs text-text-secondary mt-1.5">
                  Use {'{{name}}'} for the employee's name.
                </p>
              </div>
            </div>

            <div className="bg-white border border-border rounded-lg shadow-card p-6">
              <h3 className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                Customer Greetings
              </h3>
              <div>
                <label className={fieldLabel}>Morning welcome</label>
                <textarea
                  className={`${fieldInput} min-h-[150px]`}
                  value={settings.greeting_customer || ''}
                  onChange={(e) => handleChange('greeting_customer', e.target.value)}
                  placeholder="Morning message to customers..."
                />
              </div>
            </div>
          </div>
        )}

        {/* INTERNAL HUB TAB */}
        {activeTab === 'hub' && (
          <div className="bg-white border border-border rounded-lg shadow-card p-6">
            <h3 className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <LayoutGrid className="w-4 h-4" />
              </div>
              Dashboard Configuration
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <label className={fieldLabel}>Hub welcome message</label>
                <textarea
                  className={`${fieldInput} min-h-[180px]`}
                  value={settings.hub_welcome || ''}
                  onChange={(e) => handleChange('hub_welcome', e.target.value)}
                />
              </div>
              <div className="space-y-5">
                <div>
                  <label className={fieldLabel}>Button: Start day</label>
                  <input
                    type="text"
                    className={fieldInput}
                    value={settings.btn_start_day || ''}
                    onChange={(e) => handleChange('btn_start_day', e.target.value)}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Button: End day</label>
                  <input
                    type="text"
                    className={fieldInput}
                    value={settings.btn_end_day || ''}
                    onChange={(e) => handleChange('btn_end_day', e.target.value)}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Button: Leave request</label>
                  <input
                    type="text"
                    className={fieldInput}
                    value={settings.btn_apply_leave || ''}
                    onChange={(e) => handleChange('btn_apply_leave', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOLUTIONS TAB */}
        {activeTab === 'solutions' && (
          <div className="space-y-6">
            {[
              { id: 'welcome', label: 'Main Welcome (Hi/Menu)' },
              { id: 'industrial', label: 'Industrial Automation (Hardware)' },
              { id: 'software', label: 'Digital & Software' },
              { id: 'iiot', label: 'IIoT & Analytics' },
            ].map((section) => (
              <div
                key={section.id}
                className="bg-white border border-border rounded-lg shadow-card overflow-hidden relative"
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${SECTION_STYLES[section.id]}`} />
                <div className="p-6 pl-7">
                  <h3 className="text-base font-semibold text-text-primary mb-6">{section.label}</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-5">
                      <div>
                        <label className={fieldLabel}>Section description / body</label>
                        <textarea
                          className={`${fieldInput} min-h-[180px]`}
                          value={settings[`content_${section.id}_body`] || ''}
                          onChange={(e) => handleChange(`content_${section.id}_body`, e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={fieldLabel}>Featured image URL</label>
                        <input
                          type="text"
                          className={fieldInput}
                          value={settings[`content_${section.id}_image`] || ''}
                          onChange={(e) => handleChange(`content_${section.id}_image`, e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-4">
                      <label className={fieldLabel}>Live preview</label>
                      <div className="rounded-lg overflow-hidden border border-border bg-background aspect-[4/5] flex flex-col">
                        <img
                          src={
                            settings[`content_${section.id}_image`] ||
                            'https://via.placeholder.com/400x300?text=No+Image'
                          }
                          className="w-full h-1/2 object-cover"
                          alt="Preview"
                        />
                        <div className="p-4 flex-1">
                          <div className="w-full h-2 bg-border rounded-full mb-2" />
                          <div className="w-3/4 h-2 bg-border rounded-full mb-4" />
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="w-full h-8 bg-white border border-border rounded-lg flex items-center justify-center"
                              >
                                <div className="w-1/2 h-1 bg-border rounded-full" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KNOWLEDGE BASE TAB */}
        {activeTab === 'faq' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <div className="bg-white border border-border rounded-lg shadow-card p-6 sticky top-6">
                <h3 className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  {editingFaq ? 'Edit FAQ' : 'Add Knowledge'}
                </h3>
                <form onSubmit={handleFaqSubmit} className="space-y-5">
                  <div>
                    <label className={fieldLabel}>Keywords (comma separated)</label>
                    <input
                      className={fieldInput}
                      value={faqForm.keywords}
                      onChange={(e) => setFaqForm({ ...faqForm, keywords: e.target.value })}
                      placeholder="plc, scada, automation"
                      required
                    />
                  </div>
                  <div>
                    <label className={fieldLabel}>Answer / response</label>
                    <textarea
                      className={`${fieldInput} min-h-[200px]`}
                      value={faqForm.answer}
                      onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                      placeholder="When user asks about these keywords, bot replies with..."
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 h-10 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
                    >
                      {editingFaq ? 'Update entry' : 'Add to knowledge base'}
                    </button>
                    {editingFaq && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFaq(null);
                          setFaqForm({ keywords: '', answer: '' });
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-background text-text-secondary rounded-lg hover:bg-border transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
              {faqs.map((f) => (
                <div
                  key={f.id}
                  className="bg-white border border-border rounded-lg shadow-card p-5 group hover:border-primary/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-wrap gap-1.5">
                      {f.keywords.split(',').map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-background text-text-secondary text-xs font-medium rounded-md"
                        >
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingFaq(f);
                          setFaqForm({ keywords: f.keywords, answer: f.answer });
                        }}
                        className="p-2 text-primary hover:bg-primary-light rounded-md transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(f.id)}
                        className="p-2 text-danger hover:bg-danger-light rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {f.answer}
                  </p>
                </div>
              ))}

              {faqs.length === 0 && (
                <div className="text-center p-16 bg-white rounded-lg border border-dashed border-border">
                  <Search className="w-8 h-8 text-text-secondary mx-auto mb-3" />
                  <p className="text-sm font-medium text-text-secondary">Knowledge base is empty</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPANY INFO TAB */}
        {activeTab === 'company' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-border rounded-lg shadow-card p-6">
              <h3 className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2.5">
                <Info className="w-4 h-4 text-primary" />
                About Company
              </h3>
              <div>
                <label className={fieldLabel}>Company bio</label>
                <textarea
                  className={`${fieldInput} min-h-[200px]`}
                  value={settings.about_company || ''}
                  onChange={(e) => handleChange('about_company', e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white border border-border rounded-lg shadow-card p-6">
              <h3 className="text-base font-semibold text-text-primary mb-5 flex items-center gap-2.5">
                <Bot className="w-4 h-4 text-primary" />
                Support Center
              </h3>
              <div>
                <label className={fieldLabel}>Welcome message</label>
                <textarea
                  className={`${fieldInput} min-h-[200px]`}
                  value={settings.support_center || ''}
                  onChange={(e) => handleChange('support_center', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BotConfig;
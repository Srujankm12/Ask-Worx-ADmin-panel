import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, getFaqs, saveFaq, deleteFaq } from '../api';
import { Save, Bot, MessageSquare, LayoutGrid, Info, Search, Plus, Trash2, Edit3, X, Check, Cpu } from 'lucide-react';
import Modal from '../components/Modal';

const BotConfig = () => {
  const [activeTab, setActiveTab] = useState('greetings');
  const [settings, setSettings] = useState({});
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
  
  // FAQ Edit State
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
      showModal('Settings Synced! 🧠', 'The bot brain has been updated with your new templates.', 'success');
    } catch (err) {
      showModal('Sync Failed', 'Could not update settings. Please try again.', 'error');
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
      showModal('Knowledge Base Updated', 'The FAQ entry has been saved successfully.', 'success');
    } catch (err) {
      showModal('Error', 'Failed to save FAQ entry.', 'error');
    }
  };

  const handleDeleteFaq = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await deleteFaq(id);
      setFaqs(faqs.filter(f => f.id !== id));
    } catch (err) {
      showModal('Error', 'Failed to delete FAQ.', 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  const tabs = [
    { id: 'greetings', label: 'Greetings', icon: MessageSquare },
    { id: 'hub', label: 'Internal Hub', icon: LayoutGrid },
    { id: 'faq', label: 'Knowledge Base', icon: Search },
    { id: 'solutions', label: 'Solutions', icon: Cpu },
    { id: 'company', label: 'Company Info', icon: Info },
  ];

  return (
    <div className="p-10 lg:p-14 max-w-[1400px] mx-auto animate-in">
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-600">Bot Intelligence</span>
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
            Bot <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Brain</span>
          </h1>
          <p className="text-slate-500 mt-4 font-medium max-w-lg">
            Manage your bot's personality, knowledge, and workflow. Changes reflect instantly on WhatsApp.
          </p>
        </div>
        
        {activeTab !== 'faq' && (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Syncing...' : 'Sync Bot'}
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 mb-10 pb-2 no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in-slide">
        {/* GREETINGS TAB */}
        {activeTab === 'greetings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="premium-card bg-white p-8">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                Employee Greetings
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Morning Nudge</label>
                  <textarea
                    className="w-full bg-slate-50 border-none rounded-xl p-5 text-sm font-bold text-slate-700 focus:ring-2 ring-indigo-500/20 min-h-[150px] outline-none"
                    value={settings.greeting_employee || ''}
                    onChange={(e) => handleChange('greeting_employee', e.target.value)}
                    placeholder="Morning message to employees..."
                  />
                  <p className="text-[9px] font-bold text-slate-400 italic">Use {"{{name}}"} for employee name.</p>
                </div>
              </div>
            </div>

            <div className="premium-card bg-white p-8">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                Customer Greetings
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Morning Welcome</label>
                  <textarea
                    className="w-full bg-slate-50 border-none rounded-xl p-5 text-sm font-bold text-slate-700 focus:ring-2 ring-indigo-500/20 min-h-[150px] outline-none"
                    value={settings.greeting_customer || ''}
                    onChange={(e) => handleChange('greeting_customer', e.target.value)}
                    placeholder="Morning message to customers..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INTERNAL HUB TAB */}
        {activeTab === 'hub' && (
          <div className="space-y-8">
            <div className="premium-card bg-white p-8">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                Dashboard Configuration
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hub Welcome Message</label>
                  <textarea
                    className="w-full bg-slate-50 border-none rounded-xl p-5 text-sm font-bold text-slate-700 focus:ring-2 ring-indigo-500/20 min-h-[180px] outline-none"
                    value={settings.hub_welcome || ''}
                    onChange={(e) => handleChange('hub_welcome', e.target.value)}
                  />
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Button: Start Day</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none"
                      value={settings.btn_start_day || ''}
                      onChange={(e) => handleChange('btn_start_day', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Button: End Day</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none"
                      value={settings.btn_end_day || ''}
                      onChange={(e) => handleChange('btn_end_day', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Button: Leave Request</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none"
                      value={settings.btn_apply_leave || ''}
                      onChange={(e) => handleChange('btn_apply_leave', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOLUTIONS TAB */}
        {activeTab === 'solutions' && (
          <div className="space-y-10 pb-20">
            {/* Section Editor Component */}
            {[
              { id: 'welcome', label: 'Main Welcome (Hi/Menu)', color: 'amber' },
              { id: 'industrial', label: 'Industrial Automation (Hardware)', color: 'indigo' },
              { id: 'software', label: 'Digital & Software', color: 'purple' },
              { id: 'iiot', label: 'IIoT & Analytics', color: 'cyan' },
            ].map(section => (
              <div key={section.id} className="premium-card bg-white p-8 overflow-hidden relative">
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-${section.color}-500`}></div>
                <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                  {section.label}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section Description / Body</label>
                      <textarea
                        className="w-full bg-slate-50 border-none rounded-xl p-6 text-sm font-bold text-slate-700 focus:ring-2 ring-indigo-500/20 min-h-[180px] outline-none"
                        value={settings[`content_${section.id}_body`] || ''}
                        onChange={(e) => handleChange(`content_${section.id}_body`, e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Featured Image URL</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border-none rounded-xl px-6 py-4 text-xs font-bold text-slate-700 outline-none"
                        value={settings[`content_${section.id}_image`] || ''}
                        onChange={(e) => handleChange(`content_${section.id}_image`, e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Live Preview</label>
                    <div className="rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100 bg-slate-50 aspect-[4/5] flex flex-col">
                      <img 
                        src={settings[`content_${section.id}_image`] || 'https://via.placeholder.com/400x300?text=No+Image'} 
                        className="w-full h-1/2 object-cover"
                        alt="Preview"
                      />
                      <div className="p-4 flex-1">
                        <div className="w-full h-2 bg-slate-200 rounded-full mb-2"></div>
                        <div className="w-3/4 h-2 bg-slate-200 rounded-full mb-4"></div>
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-full h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                              <div className="w-1/2 h-1 bg-slate-100 rounded-full"></div>
                            </div>
                          ))}
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <div className="premium-card bg-white p-8 sticky top-10">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  {editingFaq ? 'Edit FAQ' : 'Add Knowledge'}
                </h3>
                <form onSubmit={handleFaqSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Keywords (Comma separated)</label>
                    <input
                      className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500/20"
                      value={faqForm.keywords}
                      onChange={(e) => setFaqForm({ ...faqForm, keywords: e.target.value })}
                      placeholder="plc, scada, automation"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Answer / Response</label>
                    <textarea
                      className="w-full bg-slate-50 border-none rounded-xl p-5 text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500/20 min-h-[200px]"
                      value={faqForm.answer}
                      onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                      placeholder="When user asks about these keywords, bot replies with..."
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:-translate-y-1 transition-all"
                    >
                      {editingFaq ? 'Update Entry' : 'Add to Brain'}
                    </button>
                    {editingFaq && (
                      <button
                        type="button"
                        onClick={() => { setEditingFaq(null); setFaqForm({ keywords: '', answer: '' }); }}
                        className="p-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              {faqs.map(f => (
                <div key={f.id} className="premium-card bg-white p-8 group hover:border-indigo-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-wrap gap-2">
                      {f.keywords.split(',').map((kw, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => { setEditingFaq(f); setFaqForm({ keywords: f.keywords, answer: f.answer }); }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(f.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                    {f.answer}
                  </p>
                </div>
              ))}
              {faqs.length === 0 && (
                <div className="text-center p-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Knowledge base is empty</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPANY INFO TAB */}
        {activeTab === 'company' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="premium-card bg-white p-8">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                <Info className="w-5 h-5 text-indigo-600" />
                About Company
              </h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company Bio</label>
                <textarea
                  className="w-full bg-slate-50 border-none rounded-xl p-5 text-sm font-bold text-slate-700 focus:ring-2 ring-indigo-500/20 min-h-[200px] outline-none"
                  value={settings.about_company || ''}
                  onChange={(e) => handleChange('about_company', e.target.value)}
                />
              </div>
            </div>

            <div className="premium-card bg-white p-8">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                <Bot className="w-5 h-5 text-indigo-600" />
                Support Center
              </h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Welcome Message</label>
                <textarea
                  className="w-full bg-slate-50 border-none rounded-xl p-5 text-sm font-bold text-slate-700 focus:ring-2 ring-indigo-500/20 min-h-[200px] outline-none"
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

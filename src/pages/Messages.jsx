import React, { useState, useEffect, useRef } from 'react';
import { getContacts, getChatHistory, sendMessage, saveContact } from '../api';
import { useSearchParams } from 'react-router-dom';
import { Send, Search, MessageSquare, ArrowLeft, Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { formatSlug } from '../utils';

const Messages = () => {
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (contacts.length > 0 && !selectedContact) {
       const phone = searchParams.get('phone');
       if (phone) {
          const contact = contacts.find(c => c.phone === phone);
          if (contact) setSelectedContact(contact);
       }
    }
  }, [contacts]);

  useEffect(() => {
    if (selectedContact) {
      setUserHasScrolledUp(false); // Reset on new contact
      fetchHistory(selectedContact.phone);
      const interval = setInterval(() => fetchHistory(selectedContact.phone, true), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedContact]);

  useEffect(() => {
    if (messages.length > 0 && !userHasScrolledUp) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
    
    // If user scrolls up, set flag to true. If they return to bottom, set to false.
    if (!isAtBottom) {
      setUserHasScrolledUp(true);
    } else {
      setUserHasScrolledUp(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const resp = await getContacts();
      setContacts(resp.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async (phone, background = false) => {
    if (!background) setLoadingHistory(true);
    try {
      const resp = await getChatHistory(phone);
      setMessages(resp.data || []);
    } catch (err) { console.error(err); }
    finally { if (!background) setLoadingHistory(false); }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    try {
      await sendMessage(selectedContact.phone, newMessage);
      const sentMsg = {
        direction: 'sent',
        content: newMessage,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, sentMsg]);
      setNewMessage('');
      setUserHasScrolledUp(false); // Force scroll to bottom on send
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      alert('Failed to send message');
    }
  };

  const handleSaveName = async () => {
    if (!selectedContact || !editedName.trim()) return;
    try {
      await saveContact({ phone: selectedContact.phone, name: editedName });
      setIsEditingName(false);
      fetchContacts();
      setSelectedContact(prev => ({ ...prev, name: editedName }));
    } catch (err) {
      alert('Failed to save name');
    }
  };

  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden animate-in">
      {/* Search/Contact List Sidebar */}
      <div className={`w-full lg:w-80 bg-white border-r border-slate-100 flex flex-col shrink-0 ${selectedContact ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-6 border-b border-slate-50 bg-slate-50/50">
          <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20 inline-block mb-4">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Messages</span>
          </div>
          <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input
               type="text"
               placeholder="Search..."
               className="w-full bg-white border border-slate-100 pl-11 pr-4 py-3 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`p-5 cursor-pointer transition-all flex items-center gap-4 ${
                selectedContact?.id === contact.id ? 'bg-slate-900 shadow-lg' : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                selectedContact?.id === contact.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {(contact.name || 'A')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-black text-xs truncate capitalize ${selectedContact?.id === contact.id ? 'text-white' : 'text-slate-800'}`}>
                  {contact.name ? formatSlug(contact.name) : contact.phone}
                </h4>
                <p className="text-[9px] truncate font-bold text-slate-400 mt-0.5">{contact.phone}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-50/50 relative ${selectedContact ? 'flex' : 'hidden lg:flex'}`}>
        {selectedContact ? (
          <>
            <div className="h-20 px-6 lg:px-10 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => setSelectedContact(null)}
                   className="lg:hidden p-2 hover:bg-slate-50 rounded-xl mr-2"
                 >
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                 </button>
                 <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xs">
                    {(selectedContact.name || 'A')[0].toUpperCase()}
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                          />
                          <button onClick={handleSaveName} className="p-1 hover:bg-green-50 text-green-600 rounded-md">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={() => setIsEditingName(false)} className="p-1 hover:bg-red-50 text-red-600 rounded-md">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-black text-slate-900 text-sm tracking-tight capitalize leading-none">
                            {selectedContact.name ? formatSlug(selectedContact.name) : selectedContact.phone}
                          </h3>
                          <button 
                            onClick={() => {
                              setIsEditingName(true);
                              setEditedName(selectedContact.name || '');
                            }}
                            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-primary transition-colors rounded-lg"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                       <div className="w-1 h-1 rounded-full bg-green-500"></div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Online</span>
                    </div>
                 </div>
              </div>
            </div>

            <div 
              className="flex-1 overflow-y-auto p-10 space-y-4" 
              ref={scrollRef}
              onScroll={handleScroll}
            >
              {messages.map((msg, idx) => {
                const content = msg.content || msg.message || '';
                const imageRegex = /^\[[Ii]mage:\s*(https?:\/\/[^\]]+)\]\s*([\s\S]*)$/;
                const match = content.match(imageRegex);
                const imageUrl = match ? match[1] : null;
                const textContent = match ? match[2] : content;

                return (
                  <div 
                    key={msg.id || idx}
                    className={`flex ${msg.direction === 'sent' || msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] text-[13px] font-medium p-1 rounded-[22px] shadow-sm relative group ${
                      msg.direction === 'sent' || msg.direction === 'outgoing'
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      {imageUrl && (
                        <div className="mb-1 overflow-hidden rounded-[18px] bg-slate-100">
                          <img 
                            src={imageUrl} 
                            alt="Visual" 
                            className="w-full h-auto object-cover max-h-80 hover:scale-105 transition-transform duration-700" 
                          />
                        </div>
                      )}
                      <div className={`px-5 py-3 ${imageUrl ? 'pt-1' : ''}`}>
                        {textContent.includes('_') && textContent.length < 30 ? (
                           <div className="flex items-center gap-2 py-1.5 px-3 bg-primary/5 rounded-xl border border-primary/10 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary">User Selection: {formatSlug(textContent)}</span>
                           </div>
                        ) : (
                           <p className="leading-relaxed whitespace-pre-line">{textContent}</p>
                        )}
                        <div className={`flex items-center gap-2 mt-2 transition-opacity ${msg.direction === 'sent' || msg.direction === 'outgoing' ? 'opacity-50' : 'opacity-30'}`}>
                           <span className="text-[8px] font-black uppercase tracking-widest">
                             {msg.created_at || msg.sent_at ? format(new Date(msg.created_at || msg.sent_at), 'HH:mm') : ''}
                           </span>
                           { (msg.direction === 'sent' || msg.direction === 'outgoing') && (
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-8 bg-white border-t border-slate-100">
              <div className="max-w-4xl mx-auto flex items-center gap-4 bg-slate-50 p-2 rounded-[25px] border border-slate-100">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none outline-none px-6 py-4 text-xs font-bold text-slate-600 focus:text-slate-900"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-slate-900 text-white rounded-[18px] flex items-center justify-center hover:bg-primary transition-all active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-30">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-6" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">No Chat Selected</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Pick a contact to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;

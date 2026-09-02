import React, { useState, useEffect } from 'react';
import {
UserPlus,
Send,
Search,
X,
MessageSquare,
Trash2,
Bell,
BellOff,
Users,
} from 'lucide-react';

import { getContacts, saveContact, sendMessage, deleteContact, toggleOptOut } from '../api';
import { formatSlug } from '../utils';

const Contacts = () => {
const [contacts, setContacts] = useState([]);
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');

// Add Contact Modal State
const [isAddModalOpen, setIsAddModalOpen] = useState(false);
const [newContact, setNewContact] = useState({
name: '',
phone: '',
});

// Send Message Modal State
const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
const [targetContact, setTargetContact] = useState(null);
const [message, setMessage] = useState('');

useEffect(() => {
fetchContacts();
}, []);

const fetchContacts = async () => {
try {
const resp = await getContacts();
setContacts(resp.data || []);
} catch (err) {
console.error(err);
} finally {
setLoading(false);
}
};

const handleAddContact = async (e) => {
e.preventDefault();

if (!newContact.phone.trim()) return;

try {
  await saveContact(newContact);

  setIsAddModalOpen(false);
  setNewContact({
    name: '',
    phone: '',
  });

  fetchContacts();
} catch (err) {
  alert('Failed to add contact');
}
};

const handleSendMessage = async (e) => {
e.preventDefault();

if (!targetContact || !message.trim()) return;

try {
  await sendMessage(targetContact.phone, message);

  setIsMsgModalOpen(false);
  setMessage('');

  alert('Message sent successfully');
} catch (err) {
  alert('Failed to send message');
}

};

const handleDeleteContact = async (id) => {
const confirmed = window.confirm(
'Are you sure you want to delete this contact? They will no longer receive marketing broadcasts.'
);

if (!confirmed) return;

try {
  await deleteContact(id);
  fetchContacts();
} catch (err) {
  alert('Failed to delete contact');
}

};

const handleToggleOptOut = async (id, currentStatus) => {
try {
await toggleOptOut(id, !currentStatus);
fetchContacts();
} catch (err) {
alert('Failed to update subscription status');
}
};

const filteredContacts = contacts.filter((contact) => {
const name = (contact.name || '').toLowerCase();
const phone = contact.phone || '';

return (
  name.includes(searchTerm.toLowerCase()) ||
  phone.includes(searchTerm)
);

});

return ( <div className="p-10 lg:p-14 max-w-[1800px] mx-auto animate-in h-[calc(100vh-80px)] flex flex-col overflow-hidden">

  {/* ================= HEADER ================= */}

  <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-8 mb-10 shrink-0">

    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="px-3 py-1 bg-primary-light rounded-full">
          <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
            Contacts Management
          </span>
        </div>
      </div>

      <h1 className="text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight leading-none">
        Customer Contacts
      </h1>

      <p className="text-sm text-text-secondary mt-4 max-w-xl">
        Manage your contact directory, communication preferences and direct messages.
      </p>
    </div>


    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">

      {/* Search */}

      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"
        />

        <input
          type="text"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="
            w-full sm:w-64
            bg-white
            border border-border
            pl-11 pr-4 py-3
            rounded-lg
            text-xs
            text-text-primary
            outline-none
            transition-colors
            focus:border-primary
            placeholder:text-text-secondary
          "
        />
      </div>


      {/* Add Contact */}

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="
          flex items-center justify-center gap-2
          bg-primary
          text-white
          px-5 py-3
          rounded-lg
          text-[10px]
          font-medium
          uppercase
          tracking-widest
          hover:bg-primary-hover
          active:scale-[0.98]
          transition-all
        "
      >
        <UserPlus className="w-4 h-4" />

        Add Contact
      </button>


      {/* Total */}

      <div className="sm:border-l sm:border-border sm:pl-6 text-left sm:text-right">
        <span className="text-[10px] font-medium uppercase tracking-widest text-text-secondary block mb-1">
          Total Contacts
        </span>

        <span className="text-3xl font-semibold text-text-primary tracking-tight tabular-nums">
          {filteredContacts.length}
        </span>
      </div>

    </div>

  </div>


  {/* ================= MAIN TABLE ================= */}

  <div
    className="
      flex-1
      overflow-hidden
      bg-white
      shadow-card
      border border-border
      rounded-lg
      flex
      flex-col
      min-h-0
    "
  >

    <div className="flex-1 overflow-auto">

      <table className="w-full text-left border-collapse min-w-[900px]">

        <thead className="sticky top-0 z-10">

          <tr
            className="
              text-text-secondary
              text-[10px]
              font-medium
              uppercase
              tracking-widest
              bg-background
              border-b
              border-border
            "
          >
            <th className="px-10 py-6">
              Contact
            </th>

            <th className="px-10 py-6">
              Phone Number
            </th>

            <th className="px-10 py-6">
              Subscription
            </th>

            <th className="px-10 py-6">
              Engagement
            </th>

            <th className="px-10 py-6 text-right">
              Actions
            </th>
          </tr>

        </thead>


        <tbody className="divide-y divide-border">

          {filteredContacts.map((contact, idx) => (

            <tr
              key={contact.id || idx}
              className="
                group
                hover:bg-background
                transition-colors
              "
            >

              {/* Contact */}

              <td className="px-10 py-7">

                <div className="flex items-center gap-4">

                  <div
                    className="
                      w-11 h-11
                      rounded-lg
                      bg-primary-light
                      text-primary
                      flex
                      items-center
                      justify-center
                      font-semibold
                      text-sm
                      shrink-0
                    "
                  >
                    {(contact.name || 'A')[0].toUpperCase()}
                  </div>


                  <div className="flex flex-col">

                    <span
                      className="
                        font-semibold
                        text-text-primary
                        text-sm
                        tracking-tight
                        capitalize
                      "
                    >
                      {contact.name
                        ? formatSlug(contact.name)
                        : 'Anonymous User'}
                    </span>


                    <span
                      className="
                        text-[10px]
                        text-text-secondary
                        font-medium
                        uppercase
                        tracking-widest
                        mt-1
                      "
                    >
                      Contact Record
                    </span>

                  </div>

                </div>

              </td>


              {/* Phone */}

              <td className="px-10 py-7">

                <span
                  className="
                    text-xs
                    font-medium
                    text-text-primary
                  "
                >
                  +{contact.phone}
                </span>

              </td>


              {/* Subscription */}

              <td className="px-10 py-7">

                {contact.opt_out ? (

                  <span
                    className="
                      px-3 py-1.5
                      rounded-full
                      text-[9px]
                      font-medium
                      uppercase
                      tracking-widest
                      bg-warning-light
                      text-warning
                    "
                  >
                    Opted Out
                  </span>

                ) : (

                  <span
                    className="
                      px-3 py-1.5
                      rounded-full
                      text-[9px]
                      font-medium
                      uppercase
                      tracking-widest
                      bg-success-light
                      text-success
                    "
                  >
                    Subscribed
                  </span>

                )}

              </td>


              {/* Engagement */}

              <td className="px-10 py-7">

                <div className="flex items-center gap-1.5">

                  {[1, 2, 3, 4, 5].map((step) => (

                    <div
                      key={step}
                      className={`
                        w-2 h-2 rounded-full
                        ${
                          step <= 4
                            ? 'bg-primary'
                            : 'bg-border'
                        }
                      `}
                    />

                  ))}

                </div>

              </td>


              {/* Actions */}

              <td className="px-10 py-7 text-right">

                <div className="flex justify-end gap-2">

                  {/* Toggle Subscription */}

                  <button
                    onClick={() =>
                      handleToggleOptOut(
                        contact.id,
                        contact.opt_out
                      )
                    }
                    title={
                      contact.opt_out
                        ? 'Re-subscribe'
                        : 'Disable Automated Messages'
                    }
                    className={`
                      w-9 h-9
                      flex items-center justify-center
                      rounded-lg
                      border
                      transition-colors
                      ${
                        contact.opt_out
                          ? `
                            border-success
                            text-success
                            hover:bg-success
                            hover:text-white
                          `
                          : `
                            border-warning
                            text-warning
                            hover:bg-warning
                            hover:text-white
                          `
                      }
                    `}
                  >
                    {contact.opt_out ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                  </button>


                  {/* Send Message */}

                  <button
                    onClick={() => {
                      setTargetContact(contact);
                      setIsMsgModalOpen(true);
                    }}
                    title="Send Message"
                    className="
                      w-9 h-9
                      flex items-center justify-center
                      rounded-lg
                      border border-primary
                      text-primary
                      hover:bg-primary
                      hover:text-white
                      transition-colors
                    "
                  >
                    <Send className="w-4 h-4" />
                  </button>


                  {/* Delete */}

                  <button
                    onClick={() =>
                      handleDeleteContact(contact.id)
                    }
                    title="Delete Contact"
                    className="
                      w-9 h-9
                      flex items-center justify-center
                      rounded-lg
                      border border-red-500
                      text-red-500
                      hover:bg-red-500
                      hover:text-white
                      transition-colors
                    "
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>

              </td>

            </tr>

          ))}


          {/* Loading */}

          {loading && (

            <tr>

              <td
                colSpan="5"
                className="px-10 py-20 text-center"
              >

                <div className="flex justify-center">

                  <div
                    className="
                      w-6 h-6
                      border-2
                      border-primary
                      border-t-transparent
                      rounded-full
                      animate-spin
                    "
                  />

                </div>

              </td>

            </tr>

          )}


          {/* Empty State */}

          {!loading &&
            filteredContacts.length === 0 && (

              <tr>

                <td
                  colSpan="5"
                  className="px-10 py-24 text-center"
                >

                  <div className="flex flex-col items-center">

                    <div
                      className="
                        w-14 h-14
                        bg-primary-light
                        text-primary
                        rounded-lg
                        flex
                        items-center
                        justify-center
                        mb-5
                      "
                    >
                      <Users className="w-6 h-6" />
                    </div>


                    <p
                      className="
                        text-sm
                        font-medium
                        text-text-primary
                      "
                    >
                      No contacts found
                    </p>


                    <p
                      className="
                        text-xs
                        text-text-secondary
                        mt-2
                      "
                    >
                      Try changing your search or add a new contact.
                    </p>

                  </div>

                </td>

              </tr>

            )}

        </tbody>

      </table>

    </div>

  </div>


  {/* ================= ADD CONTACT MODAL ================= */}

  {isAddModalOpen && (

    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        p-6
        bg-black/40
        backdrop-blur-sm
        animate-in fade-in duration-200
      "
    >

      <div
        className="
          relative
          w-full
          max-w-md
          bg-white
          border border-border
          rounded-xl
          shadow-2xl
          animate-in
          zoom-in-95
          duration-200
        "
      >

        <button
          onClick={() =>
            setIsAddModalOpen(false)
          }
          className="
            absolute
            top-5 right-5
            w-9 h-9
            flex items-center justify-center
            rounded-lg
            text-text-secondary
            hover:bg-background
            hover:text-text-primary
            transition-colors
          "
        >
          <X className="w-5 h-5" />
        </button>


        <div className="p-8 border-b border-border">

          <div
            className="
              w-12 h-12
              bg-primary-light
              text-primary
              rounded-lg
              flex items-center justify-center
              mb-5
            "
          >
            <UserPlus className="w-6 h-6" />
          </div>


          <h2 className="text-xl font-semibold text-text-primary">
            Add New Contact
          </h2>


          <p className="text-sm text-text-secondary mt-2">
            Add a contact to your communication directory.
          </p>

        </div>


        <form
          onSubmit={handleAddContact}
          className="p-8 space-y-5"
        >

          <div>

            <label
              className="
                text-[10px]
                font-medium
                uppercase
                tracking-widest
                text-text-secondary
                block
                mb-2
              "
            >
              Full Name
            </label>


            <input
              type="text"
              placeholder="e.g. John Doe"
              value={newContact.name}
              onChange={(e) =>
                setNewContact({
                  ...newContact,
                  name: e.target.value,
                })
              }
              className="
                w-full
                bg-white
                border border-border
                px-4 py-3
                rounded-lg
                text-sm
                text-text-primary
                outline-none
                focus:border-primary
                transition-colors
              "
            />

          </div>


          <div>

            <label
              className="
                text-[10px]
                font-medium
                uppercase
                tracking-widest
                text-text-secondary
                block
                mb-2
              "
            >
              Phone Number
            </label>


            <input
              type="text"
              placeholder="e.g. 919876543210"
              value={newContact.phone}
              onChange={(e) =>
                setNewContact({
                  ...newContact,
                  phone: e.target.value,
                })
              }
              required
              className="
                w-full
                bg-white
                border border-border
                px-4 py-3
                rounded-lg
                text-sm
                text-text-primary
                outline-none
                focus:border-primary
                transition-colors
              "
            />

          </div>


          <div className="flex justify-end gap-3 pt-3">

            <button
              type="button"
              onClick={() =>
                setIsAddModalOpen(false)
              }
              className="
                px-5 py-3
                rounded-lg
                text-[10px]
                font-medium
                uppercase
                tracking-widest
                text-text-secondary
                border border-border
                hover:bg-background
                transition-colors
              "
            >
              Cancel
            </button>


            <button
              type="submit"
              className="
                px-5 py-3
                rounded-lg
                text-[10px]
                font-medium
                uppercase
                tracking-widest
                bg-primary
                text-white
                hover:bg-primary-hover
                transition-colors
              "
            >
              Save Contact
            </button>

          </div>

        </form>

      </div>

    </div>

  )}


  {/* ================= QUICK MESSAGE MODAL ================= */}

  {isMsgModalOpen && (

    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        p-6
        bg-black/40
        backdrop-blur-sm
        animate-in fade-in duration-200
      "
    >

      <div
        className="
          relative
          w-full
          max-w-md
          bg-white
          border border-border
          rounded-xl
          shadow-2xl
          animate-in
          zoom-in-95
          duration-200
        "
      >

        <button
          onClick={() =>
            setIsMsgModalOpen(false)
          }
          className="
            absolute
            top-5 right-5
            w-9 h-9
            flex items-center justify-center
            rounded-lg
            text-text-secondary
            hover:bg-background
            hover:text-text-primary
            transition-colors
          "
        >
          <X className="w-5 h-5" />
        </button>


        <div className="p-8 border-b border-border">

          <div
            className="
              w-12 h-12
              bg-primary-light
              text-primary
              rounded-lg
              flex items-center justify-center
              mb-5
            "
          >
            <MessageSquare className="w-6 h-6" />
          </div>


          <h2 className="text-xl font-semibold text-text-primary">
            Quick Message
          </h2>


          <p className="text-sm text-text-secondary mt-2">
            Send a message to{' '}
            {targetContact?.name ||
              targetContact?.phone}
          </p>

        </div>


        <form
          onSubmit={handleSendMessage}
          className="p-8 space-y-5"
        >

          <div>

            <label
              className="
                text-[10px]
                font-medium
                uppercase
                tracking-widest
                text-text-secondary
                block
                mb-2
              "
            >
              Message Content
            </label>


            <textarea
              rows="5"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              required
              className="
                w-full
                bg-white
                border border-border
                px-4 py-3
                rounded-lg
                text-sm
                text-text-primary
                outline-none
                resize-none
                focus:border-primary
                transition-colors
              "
            />

          </div>


          <div className="flex justify-end gap-3 pt-3">

            <button
              type="button"
              onClick={() =>
                setIsMsgModalOpen(false)
              }
              className="
                px-5 py-3
                rounded-lg
                text-[10px]
                font-medium
                uppercase
                tracking-widest
                text-text-secondary
                border border-border
                hover:bg-background
                transition-colors
              "
            >
              Cancel
            </button>


            <button
              type="submit"
              className="
                flex items-center gap-2
                px-5 py-3
                rounded-lg
                text-[10px]
                font-medium
                uppercase
                tracking-widest
                bg-primary
                text-white
                hover:bg-primary-hover
                transition-colors
              "
            >
              <Send className="w-4 h-4" />

              Send Message
            </button>

          </div>

        </form>

      </div>

    </div>

  )}

</div>

);
};

export default Contacts;

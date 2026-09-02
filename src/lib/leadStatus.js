/**
 * Lead status vocabulary — the single definition for the whole app.
 *
 * It previously lived duplicated in Dashboard.jsx and Leads.jsx, which is how
 * "In progress" and "Deal Closed" ended up meaning the same state under two
 * names. Anything that renders a lead status reads it from here.
 *
 * `action` is the sentence shown on the button that moves a lead INTO this
 * state, written as an instruction rather than a noun — "Mark as called", not
 * "Called" — so the operator can tell a label apart from a control.
 */
export const LEAD_STATUS = {
  new: {
    label: 'New',
    badge: 'default',
    // Champagne, not ink. The `default` badge is an INK pill, so an ink dot is
    // invisible on it — it still took its 6px plus the 6px flex gap, which
    // pushed "NEW" ~6px right and made the pill look badly centred. A status
    // dot has to contrast with the badge it sits on, not with the page.
    dot: 'bg-champagne',
    description: 'Received from the bot. Nobody has contacted them yet.',
  },
  called: {
    label: 'Called',
    badge: 'warning',
    dot: 'bg-warning',
    action: 'Mark as called',
    description: 'Someone has phoned them. Awaiting a reply.',
  },
  in_progress: {
    label: 'In discussion',
    badge: 'secondary',
    dot: 'bg-titanium',
    action: 'Move to discussion',
    description: 'An active conversation is underway.',
  },
  converted: {
    label: 'Won',
    badge: 'success',
    dot: 'bg-success',
    action: 'Mark as won',
    description: 'Became a customer.',
  },
};

export const getLeadStatus = (status) => LEAD_STATUS[status] || LEAD_STATUS.new;

/**
 * Enquiry type filters.
 *
 * The tabs used to render the raw keys — "all", "expert", "quote" — which told
 * the operator nothing about what separated one from another. The `help` line
 * is shown beneath the table so the distinction is stated, not inferred.
 */
export const LEAD_FILTERS = [
  {
    value: 'all',
    label: 'All enquiries',
    help: 'Every lead the bot has captured.',
  },
  {
    value: 'expert',
    label: 'Consultation requests',
    help: 'Leads who asked to speak to an engineer about a specific requirement.',
  },
  {
    value: 'quote',
    label: 'Quotation requests',
    help: 'Leads who described a requirement and are waiting on a price.',
  },
];

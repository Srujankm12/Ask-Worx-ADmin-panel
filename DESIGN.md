# ASKworX Admin — Design System

The reference for every screen in the WhatsApp business console. It inherits
the marketing site's system wholesale (`Ask-Worx-Website/DESIGN.md`) and
records only what an operations tool needs on top of it.

Source of truth for tokens is `src/index.css`. This document explains *why*
each token exists and *when* to reach for it. The two must agree — if you
change a token, change the entry here in the same commit.

**Where this document is silent, the site's DESIGN.md governs.** Do not invent
a local answer to a question it already answers.

---

## 1. What is inherited unchanged

Colour (graphite / titanium / champagne and the ink→champagne ramp), the
Roboto Condensed / Roboto / Roboto Mono type system, the 34px drawing grid,
`.titanium-sheen`, `.hairline-grid`, the `[0.22, 1, 0.36, 1]` easing curve,
the 2px ink focus ring, and the reduced-motion contract. All of it is ported
verbatim into `src/index.css`.

The four principles carry over without amendment, and one of them does most of
the work here:

> **Nothing decorative may pretend to be real.** No invented metrics, no
> sample data that could be mistaken for content, no security claim the system
> does not honour.

An admin panel breaks this rule more easily than a website, because a
placeholder percentage in a dashboard looks exactly like a real one. Two were
found and removed on the first pass (a hardcoded "Bot efficiency 94%" and a
"AES-256 Encrypted Protocol" badge on a sign-in form that did not
authenticate). Assume there are more.

---

## 2. What the admin adds

### Status

The site states there is no brand green or amber and asks you to resist adding
one. A console that tracks leads, leave and attendance cannot honour that — a
lead being *won* and a leave request being *rejected* are different in kind,
not in emphasis, and colour is the fastest way to say so.

The ramp is therefore deliberately warm and desaturated, so it reads as part of
the metallic system rather than a traffic light borrowed from another product.

| Token | Hex | Contrast on white | Use |
|---|---|---|---|
| `success` | `#4A6A4E` | 6.1:1 | Won, approved, present, delivered. |
| `success-light` | `#EDF1EC` | — | Badge and tile grounds only. |
| `warning` | `#8A6A2F` | 5.0:1 | Awaiting action — called, pending, scheduled. |
| `warning-light` | `#F5F0E4` | — | Badge and tile grounds only. |
| `danger` | `#A8322A` | 6.7:1 | The site's `destructive`. Failure, rejection, deletion. |
| `danger-light` | `#F7EBE9` | — | Badge and tile grounds only. |

**Rules**
- Status colour never carries meaning alone. Every badge pairs it with a word.
- The `-light` values are grounds, never text or borders that must read.
- Three status colours is the whole set. There is no "info" blue — an
  informational state is `ink` or `titanium-700`.

### Semantic aliases

The app is written against `primary`, `text-secondary`, `border`,
`background`, `shadow-card` and friends. Every one of them resolves to a value
in the site's table — never to a new hue. `primary` is `ink`: on this system
the emphatic colour is darkness, not a brand colour.

### Two registers of small text

This is the distinction most easily got wrong, and it was got wrong on the
first pass.

| Register | Treatment | Where |
|---|---|---|
| **Scanned** | `.spec-label` / `.eyebrow` — mono, 10–11px, `tracking-[0.16em]`, uppercase | Table column heads, stat tile labels, section eyebrows, chips |
| **Read** | 13px, sentence case, medium weight | Form labels, help text, empty-state copy, error messages, button text |

A tracked 10px capital is measurably slower to read. It is right above a column
of figures, where the eye is locating rather than reading, and wrong on a form
label, where someone is reading in order to act. `<Label>` is the read
register; `.spec-label` is the scanned one.

### Heading colour

Headings are ink, all the way down: the page `h1`, every `CardTitle`, and every
table column head. Two of those did not start that way.

`.titanium-sheen` clips the brushed-metal gradient to the page title, and its
lightest stop is `#8F887C`. On the marketing site, where the h1 is the only
thing on screen, that reads as finish. In a console, where the same screen also
carries ink card titles and a table of ink figures, it reads as a heading that
has been greyed out. `<PageHeader>` therefore renders solid ink by default; the
gradient is still there behind the `sheen` prop for a page that wants it.

Table column heads were `titanium-700`. They keep the scanned register below —
mono, 10px, `tracking-[0.16em]`, uppercase — but in ink. At that size, under
that much tracking, the grey read as disabled rather than recessive. Contrast
comes from size and weight against the body text, not from lightening it.

### Density

The site breathes at `py-16 md:py-24 lg:py-32`. A console cannot — an operator
works down a table all day and every wasted row is a scroll.

| Class | Definition |
|---|---|
| `.container-admin` | `max-w-[1440px]`, `px-5 md:px-8`, `py-8 md:py-10` |

Table rows are `py-3.5`, cards `px-5 py-4`, the shell header 64px. Display
sizes step down one notch from the site's: `.display-2` caps at 2.25rem.

---

## 3. Motion

Same curve, shorter distances, shorter durations. The site's reveal is 0.7s
over 32px; the admin's is 0.45s over 24px, because this is a screen someone
opens forty times a day and motion that reads as considered on a first visit
reads as latency on the fortieth.

| Component | Purpose |
|---|---|
| `<Reveal>` | Fade + slide a block in once. The default. |
| `<Stagger>` / `<StaggerItem>` | Sequence a group. 0.06s between children. |
| `<RevealText>` | Word-by-word reveal. The page title only, via `<PageHeader>`. |
| `<PageTransition>` | Route change. 0.28s, opacity and 10px. |
| `<CountUp>` | A metric counts up once, the first time its tile is seen. |

Two shared-layout elements carry state rather than decorate it: the sidebar's
active rail (`layoutId="sidebar-rail"`) slides between items, and the segmented
control's pill slides between tabs. Both say *where you came from*, which a
cut cannot.

**Reduced motion is not optional.** `prefers-reduced-motion` is handled
globally in `index.css`, and every component with motion-driven state also
checks `useReducedMotion()` and renders its **final** state. `<CountUp>`
renders the number, `<PageTransition>` renders a plain div, `<RevealText>`
renders the string. A reduced-motion operator must never see a half-built page.

---

## 4. Components

`src/components/ui/` holds the shadcn primitives: `button`, `card`, `input`,
`label`, `textarea`, `badge`, `select`, `separator`, `switch`, `table`, `tabs`,
`dialog`, `skeleton`. Prefer these over new markup.

**Buttons.** `rounded-lg`, not the site's `rounded-full` — a dense toolbar of
pills reads as a row of lozenges. Primary is ink on white. `destructive` is
reserved for actions that delete or send.

**Tables.** Always `<Table>`, never a hand-rolled `<table>`. It carries the
hairline rules, the mono heads on paper, tabular figures, and its own
`overflow-x-auto` container — the page body must never scroll horizontally.

**Dialogs.** Always `<Dialog>`, never `window.confirm()`. The browser dialog
looks nothing like the app, cannot say what it is about to do, and is clicked
through on reflex.

**Page headings.** Never hand-roll one. `<PageHeader>` enforces eyebrow →
title → intro and wires the reveal. The title is solid ink; pass `sheen` for
the titanium gradient.

---

## 5. Voice

The site's rule — *"Write as an engineer briefing another engineer: no
superlatives, no 'cutting edge', no 'seamless synergy'"* — applies here with
one amendment: **the reader is not an engineer.**

The person using this console is a sales coordinator or an HR administrator.
Every label is written for them.

| Do | Don't |
|---|---|
| Bot Settings | Bot Brain |
| Leads | Business Pipeline |
| Sign out | Exit Session |
| End-of-Day Reports | EOD Reports |
| Close | Acknowledged |
| Mark as called | Called |
| Name & phone | Identity & Contact |
| What they asked for | Requirement |

**Rules**
- **Buttons are instructions, not nouns.** "Mark as won", never "Convert".
- **Never render a raw key.** `in_progress` is "In discussion". A tab whose
  label is the value it filters on (`all`, `expert`, `quote`) tells the reader
  nothing — the Leads filters now carry a `help` line that states the
  distinction rather than leaving it to be inferred.
- **Status vocabulary lives in one file** (`src/lib/leadStatus.js`). It was
  duplicated per page, which is how the same state ended up labelled both
  "In progress" and "Deal Closed".
- **An empty state teaches.** Say what belongs there and how it gets there —
  *"Leads appear here automatically when someone requests a quotation through
  the WhatsApp bot. Nothing needs to be entered by hand."* — not "No leads".
- **An error is a sentence, not a status code.** Say what failed, whether
  anything changed, and what to do. Distinguish "wrong password" from "server
  unreachable"; they need different things from the reader.
- **Say what a send will do before it does it.** This tool messages real
  customers. A send button states the recipient count and that it cannot be
  recalled.

---

## 6. Accessibility

Non-negotiable, and inherited from the site:

- **Focus.** 2px `ink` outline, 2px offset, on every interactive element.
- **Contrast.** Body 7.4:1, headings 17.4:1, `titanium-700` 5.8:1, every
  status colour above 5:1. Nothing below `titanium-700` carries meaning alone.
- **Decorative layers** — grids, glows, status dots — always `aria-hidden`.
- **Every input has a `<Label>`.** A placeholder is not a label; it disappears
  the moment someone types.
- **Every icon-only control has an `aria-label`.**
- **Errors** are `role="alert"` and referenced by `aria-describedby`.
- **Motion** respects `prefers-reduced-motion`, per §3.
- Wide content scrolls inside its own container.

---

## 7. Adding a screen

1. Open with `<PageHeader>` — eyebrow, title, and an intro that says in one
   plain sentence what the screen is for.
2. Lay content out in `<Card>`; tabular data goes in `<Table>`.
3. Wrap blocks in `<Reveal>`, groups in `<Stagger>`.
4. Every destructive or outbound action goes through `<ConfirmModal>` and
   names its consequence.
5. Every request has three visible states: loading, empty (with guidance), and
   failed (with a retry).
6. Run `npm run lint && npm run build`.
7. Check it at 1440, 768 and 390 — and once with reduced motion on.

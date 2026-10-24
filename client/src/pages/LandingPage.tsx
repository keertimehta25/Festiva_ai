import { CalendarCheck, Handshake, Lightbulb, MessageCircle, Sparkles, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { defaultAllocations } from '@shared/calc/budget';
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_LABELS, EVENT_TYPE_LABELS, type EventType } from '@shared/constants';
import { formatRupees } from '../lib/format';

const FEATURES = [
  { icon: Sparkles, title: 'AI event plan', text: 'A personalised concept, budget split, timeline, vendor checklist and day-of schedule from one short form.' },
  { icon: Wallet, title: 'Budget manager', text: 'Track estimated against actual spending, see what is left and get a warning before a category overshoots.' },
  { icon: CalendarCheck, title: 'Timeline and tasks', text: 'Due dates worked back from your event date, with longer lead times for weddings than for birthdays.' },
  { icon: Handshake, title: 'Vendor tracker', text: 'Record quotes, advances, payments and follow-ups for the vendors you contact. You enter the details; we keep them organised.' },
  { icon: Lightbulb, title: 'Personal ideas', text: 'Decor, menu, activity and entertainment ideas that reflect your theme, food preference and priorities.' },
  { icon: MessageCircle, title: 'Event copilot', text: 'Ask what to do next. The copilot knows your budget, tasks and vendors, and proposes changes only you can approve.' },
] as const;

const PREVIEW_BUDGET = 800_000;
const PREVIEW_TYPES: EventType[] = ['wedding', 'birthday', 'community'];

export function LandingPage() {
  const [type, setType] = useState<EventType>('wedding');
  const allocations = defaultAllocations(type, PREVIEW_BUDGET);
  const rows = BUDGET_CATEGORIES.filter((category) => allocations[category] > 0).sort((a, b) => allocations[b] - allocations[a]);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <p className="eyebrow">Celebration &amp; event planner</p>
            <h1>Big celebrations. Thoughtful plans. Zero chaos.</h1>
            <p className="lead">
              Festiva AI turns a few details about your wedding, birthday or community event into a budget, a dated checklist and a vendor tracker, built for how Indian celebrations really work.
            </p>
            <div className="hero-actions">
              <Link to="/events/new" className="btn btn-primary">Plan My Event</Link>
              <a href="#features" className="btn btn-secondary">Explore Features</a>
            </div>
            <p className="small muted">Free to try. Sign in to save your events. Prices shown are estimates, never quotes.</p>
          </div>

          <aside className="card preview" aria-labelledby="preview-heading">
            <h2 id="preview-heading" className="preview-title">Example starting budget</h2>
            <p className="small muted">
              A typical split for ₹8,00,000, calculated by the app. You can edit every category, and the AI tailors it to your event.
            </p>
            <div role="tablist" aria-label="Example event type" className="tabs tabs-compact">
              {PREVIEW_TYPES.map((candidate) => (
                <button key={candidate} role="tab" type="button" aria-selected={type === candidate} onClick={() => setType(candidate)}>
                  {EVENT_TYPE_LABELS[candidate]}
                </button>
              ))}
            </div>
            <div className="table-wrap">
              <table>
                <caption className="visually-hidden">Example budget split for a {EVENT_TYPE_LABELS[type].toLowerCase()} with a ₹8,00,000 budget</caption>
                <thead><tr><th scope="col">Category</th><th scope="col" className="num">Share</th><th scope="col" className="num">Amount</th></tr></thead>
                <tbody>
                  {rows.map((category) => (
                    <tr key={category}>
                      <th scope="row">{BUDGET_CATEGORY_LABELS[category]}</th>
                      <td className="num">{Math.round((allocations[category] / PREVIEW_BUDGET) * 100)}%</td>
                      <td className="num">{formatRupees(allocations[category])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </aside>
        </div>
      </section>

      <section id="features" className="container section" aria-labelledby="features-heading">
        <h2 id="features-heading">Everything in one calm workspace</h2>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="card">
              <Icon size={28} aria-hidden="true" className="feature-icon" />
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container section" aria-labelledby="honest-heading">
        <div className="card callout">
          <h2 id="honest-heading">Honest by design</h2>
          <p>
            Festiva AI never invents vendors, phone numbers, availability or confirmed prices. Every amount from the AI is labelled as an estimate with its assumptions. Totals, percentages and balances are calculated by the app, not guessed by the model.
          </p>
          <Link to="/events/new" className="btn btn-primary">Plan My Event</Link>
        </div>
      </section>
    </>
  );
}

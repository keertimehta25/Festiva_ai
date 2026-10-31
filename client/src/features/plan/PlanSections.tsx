import {
  BUDGET_CATEGORY_LABELS,
  TASK_CATEGORY_LABELS,
  VENDOR_CATEGORY_LABELS,
  PRIORITY_LABELS,
} from '@shared/constants';
import type { StoredPlan } from '@shared/types';
import { formatRupees } from '../../lib/format';

const List = ({ items }: { items: string[] }) =>
  items.length === 0 ? (
    <p className="muted">Nothing suggested.</p>
  ) : (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );

export function ConceptSection({ plan }: { plan: StoredPlan }) {
  return (
    <section className="card" aria-labelledby="concept-h">
      <h2 id="concept-h">{plan.concept.title}</h2>
      <p>{plan.concept.summary}</p>
      <h3>Theme ideas</h3>
      <List items={plan.concept.themeIdeas} />
      {plan.assumptions.length > 0 && (
        <>
          <h3>Assumptions behind the estimates</h3>
          <List items={plan.assumptions} />
        </>
      )}
    </section>
  );
}

export function BudgetSection({ plan, totalBudget }: { plan: StoredPlan; totalBudget: number }) {
  const rows = plan.budgetAllocation.filter((row) => row.percent > 0);
  return (
    <section className="card" aria-labelledby="budget-h">
      <h2 id="budget-h">Suggested budget split</h2>
      <p className="muted small">
        Percentages come from the AI. The rupee amounts are calculated by the app from your total of{' '}
        {formatRupees(totalBudget)}.
      </p>
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Suggested budget allocation by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="num">
                Share
              </th>
              <th scope="col" className="num">
                Amount
              </th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category}>
                <th scope="row">{BUDGET_CATEGORY_LABELS[row.category]}</th>
                <td className="num">{Math.round((plan.allocationAmounts[row.category] / totalBudget) * 100)}%</td>
                <td className="num">{formatRupees(plan.allocationAmounts[row.category])}</td>
                <td>{row.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="mt-lg">Estimated expenses</h3>
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Itemised estimated expenses</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Category</th>
              <th scope="col" className="num">
                Estimate
              </th>
            </tr>
          </thead>
          <tbody>
            {plan.expenseEstimates.map((item) => (
              <tr key={`${item.category}-${item.item}`}>
                <th scope="row">{item.item}</th>
                <td>{BUDGET_CATEGORY_LABELS[item.category]}</td>
                <td className="num">{formatRupees(item.estimatedAmount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Total of estimates
              </th>
              <td className="num">{formatRupees(plan.estimatedTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export function TimelineSection({ plan }: { plan: StoredPlan }) {
  const ordered = [...plan.timeline].sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);
  return (
    <section className="card" aria-labelledby="timeline-h">
      <h2 id="timeline-h">Preparation timeline</h2>
      <ol className="timeline">
        {ordered.map((item) => (
          <li key={item.title}>
            <strong>{item.daysBeforeEvent === 0 ? 'On the day' : `${item.daysBeforeEvent} days before`}</strong>
            <div>
              {item.title} <span className="badge badge-neutral">{TASK_CATEGORY_LABELS[item.category]}</span>{' '}
              <span className="badge">{PRIORITY_LABELS[item.priority]}</span>
            </div>
            <div className="small muted">{item.description}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ChecklistsSection({ plan }: { plan: StoredPlan }) {
  return (
    <div className="two-col">
      <section className="card" aria-labelledby="vendor-check-h">
        <h2 id="vendor-check-h">Vendor checklist</h2>
        <p className="muted small">
          Types of vendors to look for and what to ask them. These are not recommendations of specific businesses.
        </p>
        {plan.vendorChecklist.map((entry) => (
          <div key={entry.category}>
            <h3>{VENDOR_CATEGORY_LABELS[entry.category]}</h3>
            <List items={entry.questionsToAsk} />
          </div>
        ))}
      </section>
      <section className="card" aria-labelledby="guest-check-h">
        <h2 id="guest-check-h">Guest management checklist</h2>
        <List items={plan.guestChecklist} />
      </section>
    </div>
  );
}

export function IdeasSection({ plan }: { plan: StoredPlan }) {
  return (
    <section className="card" aria-labelledby="ideas-h">
      <h2 id="ideas-h">Ideas for your event</h2>
      <div className="two-col">
        <div>
          <h3>Decoration</h3>
          <List items={plan.ideas.decoration} />
        </div>
        <div>
          <h3>Food</h3>
          <List items={plan.ideas.food} />
        </div>
        <div>
          <h3>Activities</h3>
          <List items={plan.ideas.activities} />
        </div>
        <div>
          <h3>Entertainment</h3>
          <List items={plan.ideas.entertainment} />
        </div>
      </div>
    </section>
  );
}

export function ScheduleAndRisksSection({ plan }: { plan: StoredPlan }) {
  return (
    <div className="two-col">
      <section className="card" aria-labelledby="schedule-h">
        <h2 id="schedule-h">Day-of schedule</h2>
        <ol className="timeline">
          {plan.daySchedule.map((slot) => (
            <li key={`${slot.time}-${slot.activity}`}>
              <strong>{slot.time}</strong>
              <div>{slot.activity}</div>
              {slot.notes && <div className="small muted">{slot.notes}</div>}
            </li>
          ))}
        </ol>
      </section>
      <section className="card" aria-labelledby="risk-h">
        <h2 id="risk-h">Risks and backup plans</h2>
        <ul className="list-plain">
          {plan.risks.map((risk) => (
            <li key={risk.risk}>
              <strong>{risk.risk}</strong>
              <div>{risk.contingency}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function TipsSection({ plan }: { plan: StoredPlan }) {
  return (
    <div className="two-col">
      <section className="card" aria-labelledby="save-h">
        <h2 id="save-h">Ways to save</h2>
        <List items={plan.costSavingTips} />
      </section>
      <section className="card" aria-labelledby="personal-h">
        <h2 id="personal-h">Recommendations for you</h2>
        <List items={plan.personalRecommendations} />
      </section>
    </div>
  );
}

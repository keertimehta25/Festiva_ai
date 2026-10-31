import type { TaskFilter } from '@shared/calc/tasks';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from '@shared/constants';

export type TaskView = 'list' | 'timeline';

interface FilterSelectProps<T extends string> {
  id: string;
  label: string;
  value: T | undefined;
  values: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T | undefined) => void;
}

function FilterSelect<T extends string>({ id, label, value, values, labels, onChange }: FilterSelectProps<T>) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="select"
        value={value ?? ''}
        onChange={(e) => {
          // The "All" option has an empty value; every other value comes from `values`.
          onChange(values.find((candidate) => candidate === e.target.value));
        }}
      >
        <option value="">All</option>
        {values.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TaskToolbarProps {
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  view: TaskView;
  onViewChange: (view: TaskView) => void;
}

/** Status / category / priority filters and the list-or-timeline switch. */
export function TaskToolbar({ filter, onFilterChange, view, onViewChange }: TaskToolbarProps) {
  return (
    <div className="toolbar">
      <FilterSelect
        id="f-status"
        label="Status"
        value={filter.status}
        values={TASK_STATUSES}
        labels={TASK_STATUS_LABELS}
        onChange={(status) => {
          onFilterChange({ ...filter, status });
        }}
      />
      <FilterSelect
        id="f-category"
        label="Category"
        value={filter.category}
        values={TASK_CATEGORIES}
        labels={TASK_CATEGORY_LABELS}
        onChange={(category) => {
          onFilterChange({ ...filter, category });
        }}
      />
      <FilterSelect
        id="f-priority"
        label="Priority"
        value={filter.priority}
        values={PRIORITIES}
        labels={PRIORITY_LABELS}
        onChange={(priority) => {
          onFilterChange({ ...filter, priority });
        }}
      />
      <div role="group" aria-label="View" className="view-switch">
        {(['list', 'timeline'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`btn btn-sm ${view === option ? 'btn-primary' : 'btn-secondary'}`}
            aria-pressed={view === option}
            onClick={() => {
              onViewChange(option);
            }}
          >
            {option === 'list' ? 'List' : 'Timeline'}
          </button>
        ))}
      </div>
    </div>
  );
}

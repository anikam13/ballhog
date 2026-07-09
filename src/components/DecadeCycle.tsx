import type { DecadeMode } from "../../shared/protocol";

export const DECADE_OPTIONS: { value: DecadeMode; label: string }[] = [
  { value: "all", label: "ALL ERAS" },
  { value: "pre-2000s", label: "PRE-2000S" },
  { value: "post-2000s", label: "POST-2000S" },
];

export function decadeLabel(mode: DecadeMode) {
  return DECADE_OPTIONS.find((o) => o.value === mode)?.label ?? "ALL ERAS";
}

/** Render era labels with a smaller trailing S (PRE-/POST-2000S). */
export function DecadeLabel({ mode }: { mode: DecadeMode }) {
  const label = decadeLabel(mode);
  if (label.endsWith("S") && label.includes("2000")) {
    return (
      <>
        {label.slice(0, -1)}
        <span className="decade-plural-s">S</span>
      </>
    );
  }
  return <>{label}</>;
}

function cycle(current: DecadeMode, dir: -1 | 1): DecadeMode {
  const i = DECADE_OPTIONS.findIndex((o) => o.value === current);
  const next = (i + dir + DECADE_OPTIONS.length) % DECADE_OPTIONS.length;
  return DECADE_OPTIONS[next].value;
}

interface Props {
  value: DecadeMode;
  onChange: (mode: DecadeMode) => void;
  label?: string;
  disabled?: boolean;
}

export default function DecadeCycle({ value, onChange, label, disabled }: Props) {
  return (
    <div className="decade-cycle" role="group" aria-label={label ?? "Select decade filter"}>
      {label && <span className="lobby-target-label">{label}</span>}
      <div className="decade-cycle-stepper">
        <button
          type="button"
          className="decade-cycle-btn"
          disabled={disabled}
          onClick={() => onChange(cycle(value, -1))}
          aria-label="Previous era"
        >
          ‹
        </button>
        <span className="decade-cycle-value" aria-live="polite">
          <DecadeLabel mode={value} />
        </span>
        <button
          type="button"
          className="decade-cycle-btn"
          disabled={disabled}
          onClick={() => onChange(cycle(value, 1))}
          aria-label="Next era"
        >
          ›
        </button>
      </div>
    </div>
  );
}

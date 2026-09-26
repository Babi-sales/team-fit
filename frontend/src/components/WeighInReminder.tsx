import { Card } from "@/components/ui";
import { status } from "@/lib/colors";
import { BodyMeasurement, WeightLog } from "@/lib/types";

const INTERVAL_DAYS = 14;

function daysSince(dateStr: string): number {
  const then = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  const diffMs = now.setHours(0, 0, 0, 0) - then.setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function statusFor(lastDate: string | undefined, label: string) {
  if (!lastDate) {
    return { text: `${label}: nenhum registro ainda`, tone: "due" as const };
  }
  const elapsed = daysSince(lastDate);
  const daysUntil = INTERVAL_DAYS - elapsed;
  if (daysUntil <= 0) {
    return { text: `${label}: atrasado há ${elapsed - INTERVAL_DAYS} dia(s) — última vez em ${lastDate.slice(5)}`, tone: "due" as const };
  }
  return { text: `${label}: próxima em ${daysUntil} dia(s) (última vez em ${lastDate.slice(5)})`, tone: "ok" as const };
}

export default function WeighInReminder({
  weightHistory,
  measurementHistory,
}: {
  weightHistory: WeightLog[];
  measurementHistory: BodyMeasurement[];
}) {
  const lastWeight = weightHistory.at(-1)?.date;
  const lastMeasurement = measurementHistory.at(-1)?.date;

  const weightStatus = statusFor(lastWeight, "Peso");
  const measurementStatus = statusFor(lastMeasurement, "Medidas");
  const anyDue = weightStatus.tone === "due" || measurementStatus.tone === "due";

  return (
    <Card className={anyDue ? "border-l-4" : ""} style={anyDue ? { borderLeftColor: status.warning } : undefined}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-semibold">Acompanhamento quinzenal</span>
        {anyDue && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
            style={{ backgroundColor: status.warning }}
          >
            hora de medir
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--ink-secondary)]">{weightStatus.text}</p>
      <p className="text-xs text-[var(--ink-secondary)]">{measurementStatus.text}</p>
    </Card>
  );
}

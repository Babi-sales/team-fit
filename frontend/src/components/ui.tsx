import { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Card({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 ${className}`}
      style={{ boxShadow: "var(--shadow-card)", ...style }}
    >
      {children}
    </div>
  );
}

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";
  const styles = {
    primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] focus-visible:ring-[var(--accent)]",
    secondary:
      "bg-transparent border border-[var(--border)] text-[var(--ink-primary)] hover:bg-[var(--page)] focus-visible:ring-[var(--accent)]",
    danger: "bg-[#d03b3b] text-white hover:bg-[#b93232] focus-visible:ring-[#d03b3b]",
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

const fieldBase =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink-primary)] outline-none transition-colors duration-150 placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`mb-1.5 block text-xs font-medium text-[var(--ink-secondary)] ${props.className ?? ""}`} />;
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4 sm:p-4">
      <div className="text-xs font-medium tracking-wide text-[var(--ink-muted)] uppercase">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold text-[var(--ink-primary)]" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-[var(--ink-secondary)]">{sub}</div>}
    </Card>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink-primary)]">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-[var(--ink-secondary)]">{subtitle}</p>}
    </div>
  );
}

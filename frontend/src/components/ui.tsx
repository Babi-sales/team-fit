import { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const base = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-[#2a78d6] text-white hover:bg-[#2266bd]",
    secondary: "bg-transparent border border-[var(--border)] text-[var(--ink-primary)] hover:bg-[var(--page)]",
    danger: "bg-[#d03b3b] text-white hover:bg-[#b93232]",
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink-primary)] outline-none focus:border-[#2a78d6] ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink-primary)] outline-none focus:border-[#2a78d6] ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink-primary)] outline-none focus:border-[#2a78d6] ${props.className ?? ""}`}
    />
  );
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`mb-1 block text-xs font-medium text-[var(--ink-secondary)] ${props.className ?? ""}`} />;
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-xs font-medium text-[var(--ink-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[var(--ink-primary)]">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--ink-secondary)]">{sub}</div>}
    </Card>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold text-[var(--ink-primary)]">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-[var(--ink-secondary)]">{subtitle}</p>}
    </div>
  );
}

import { Priority } from "@/lib/types";

const STYLES: Record<Priority, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: "bg-red/15", text: "text-red", label: "Critical" },
  HIGH: { bg: "bg-amber/15", text: "text-amber", label: "High" },
  MEDIUM: { bg: "bg-violet/15", text: "text-violet", label: "Medium" },
  LOW: { bg: "bg-teal/15", text: "text-teal", label: "Low" },
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const s = STYLES[priority] ?? STYLES.MEDIUM;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-mono-display font-medium tracking-wide uppercase ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

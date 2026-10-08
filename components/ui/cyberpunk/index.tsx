import React from "react";
import { LucideIcon } from "lucide-react";

export interface PageHeaderProps {
  moduleCode?: string;
  category?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  badge?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}

/**
 * Editorial PageHeader
 * Sits directly on the dark workspace with generous whitespace,
 * clean Space Grotesk headline (weight 300), and technical metadata.
 */
export function PageHeader({
  moduleCode = "SYS // 01",
  category = "OPERATIONS",
  title,
  description,
  icon: Icon,
  badge,
  action,
  eyebrow,
}: PageHeaderProps) {
  return (
    <header className="relative pb-8 sm:pb-10 border-b border-[#292D33] space-y-4">
      {/* Subtle top red signal line indicator */}
      <div className="absolute -top-3 left-0 w-16 h-[2px] bg-[#FF2A1A]" />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2">
        <div className="space-y-3 max-w-3xl">
          {/* Eyebrow / Technical Metadata */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {Icon && <Icon className="size-3.5 text-[#FF2A1A]" />}
            <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-[#FF2A1A] uppercase">
              {moduleCode}
            </span>
            <span className="text-[#3A3E45] font-mono">/</span>
            <span className="font-mono text-[11px] font-medium tracking-[0.16em] text-[#9B9EA6] uppercase">
              {eyebrow || category}
            </span>
            {badge && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#FF2A1A]/10 text-[#FF2A1A] border border-[#FF2A1A]/30 ml-1">
                <span className="size-1.5 rounded-full bg-[#FF2A1A] animate-pulse" />
                {badge}
              </span>
            )}
          </div>

          {/* Large Editorial Headline */}
          <h1 className="font-display-title text-[#F3F1EC] tracking-tight">
            {title}
          </h1>

          {/* Restrained Description */}
          <p className="text-sm sm:text-base text-[#9B9EA6] max-w-2xl font-sans font-normal leading-relaxed pt-1">
            {description}
          </p>
        </div>

        {/* Action Panel / Right Slot */}
        {action && (
          <div className="shrink-0 flex items-center gap-3 pb-1">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Editorial Data Strip
 * Horizontal metric band with subtle separators instead of rounded cards.
 */
export function DataStrip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-y border-[#292D33] py-6 my-6 grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#292D33] ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Large Numeric Block
 * Typography-as-hero metric display with minimal chrome.
 */
export function LargeNumericBlock({
  label,
  value,
  subtext,
  trend,
  className = "",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1 px-4 first:pl-0 last:pr-0 ${className}`}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B9EA6]">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="font-numeric-stat text-[#F3F1EC] tracking-tight">
          {value}
        </span>
        {trend && (
          <span className="font-mono text-xs text-[#32C979] font-medium">{trend}</span>
        )}
      </div>
      {subtext && (
        <p className="font-mono text-[11px] text-[#686C74]">{subtext}</p>
      )}
    </div>
  );
}

/**
 * Editorial Section Header
 */
export function EditorialSection({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#292D33] pb-3">
        <div>
          {eyebrow && (
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FF2A1A] mb-1">
              {eyebrow}
            </p>
          )}
          <h2 className="font-display text-xl sm:text-2xl font-light tracking-tight text-[#F3F1EC]">
            {title}
          </h2>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * Editorial List Row
 */
export function EditorialRow({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-3 border-b border-[#292D33] transition-colors hover:bg-[#111318]/70 hover:border-[#3A3E45] ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FF2A1A] opacity-0 group-hover:opacity-100 transition-opacity" />
      {children}
    </div>
  );
}

export type TechnicalStatus =
  | "active"
  | "pending"
  | "processing"
  | "completed"
  | "expired"
  | "revoked"
  | "offline";

export function StatusIndicator({
  status,
  label,
}: {
  status: TechnicalStatus;
  label?: string;
}) {
  const configs: Record<
    TechnicalStatus,
    { dot: string; text: string; bg: string; border: string }
  > = {
    active: {
      dot: "bg-[#32C979] shadow-[0_0_8px_#32C979]",
      text: "text-[#32C979]",
      bg: "bg-[#32C979]/10",
      border: "border-[#32C979]/30",
    },
    completed: {
      dot: "bg-[#7FA7FF] shadow-[0_0_8px_#7FA7FF]",
      text: "text-[#7FA7FF]",
      bg: "bg-[#7FA7FF]/10",
      border: "border-[#7FA7FF]/30",
    },
    pending: {
      dot: "bg-[#F2B84B] shadow-[0_0_8px_#F2B84B]",
      text: "text-[#F2B84B]",
      bg: "bg-[#F2B84B]/10",
      border: "border-[#F2B84B]/30",
    },
    processing: {
      dot: "bg-[#FF2A1A] animate-ping",
      text: "text-[#FF2A1A]",
      bg: "bg-[#FF2A1A]/10",
      border: "border-[#FF2A1A]/30",
    },
    expired: {
      dot: "bg-[#686C74]",
      text: "text-[#9B9EA6]",
      bg: "bg-[#171A20]",
      border: "border-[#292D33]",
    },
    revoked: {
      dot: "bg-[#FF2A1A] shadow-[0_0_8px_#FF2A1A]",
      text: "text-[#FF2A1A]",
      bg: "bg-[#FF2A1A]/10",
      border: "border-[#FF2A1A]/30",
    },
    offline: {
      dot: "bg-[#686C74]",
      text: "text-[#686C74]",
      bg: "bg-[#111318]",
      border: "border-[#292D33]",
    },
  };

  const c = configs[status] || configs.offline;
  const displayLabel = label || status.toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider ${c.bg} ${c.text} border ${c.border}`}
    >
      <span className={`size-1.5 rounded-full ${c.dot}`} />
      <span>{displayLabel}</span>
    </span>
  );
}

export function CyberCard({
  children,
  className = "",
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`relative rounded border border-[#292D33] bg-[#111318] p-5 sm:p-6 transition-all duration-200 hover:border-[#3A3E45] ${
        glow ? "hover:shadow-[0_0_20px_-5px_rgba(255,42,26,0.12)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
}) {
  return (
    <div className="group relative border border-[#292D33] bg-[#111318] p-5 sm:p-6 transition-all hover:border-[#3A3E45]">
      <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#FF2A1A] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B9EA6]">
          {title}
        </p>
        {Icon && (
          <div className="flex size-7 items-center justify-center rounded border border-[#292D33] bg-[#0D0F12] text-[#9B9EA6] transition-colors group-hover:border-[#FF2A1A]/40 group-hover:text-[#FF2A1A]">
            <Icon className="size-3.5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-3xl sm:text-4xl font-light tracking-tight text-[#F3F1EC]">
          {value}
        </span>
        {trend && (
          <span className="font-mono text-xs text-[#32C979] font-medium">{trend}</span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-[#686C74] font-mono">{subtitle}</p>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const FONT_STACK =
  'var(--font-sans, "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif)';

const TYPE = {
  title: 15,
  body: 13.5,
  sub: 13,
  dense: 12.5,
  meta: 11.5,
  chip: 11,
  micro: 10.5,
  figure: 27,
} as const;

const SQUIRCLE = "[corner-shape:squircle]";

const TRAY =
  "rounded-[26px] p-1.5 [corner-shape:squircle] bg-[var(--tray,#f0f0f0)] dark:bg-[var(--tray,#0e0e10)]";

const TRAY_CARD =
  "rounded-[20px] [corner-shape:squircle] bg-card ring-1 ring-border shadow-[0_1px_2px_rgb(0_0_0/0.05),0_4px_12px_-6px_rgb(0_0_0/0.08)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.5),0_4px_12px_-6px_rgb(0_0_0/0.5)]";

const FLAT_CARD =
  "overflow-hidden rounded-[22px] [corner-shape:squircle] bg-card ring-1 ring-border shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.4)]";

const STRIP = {
  layered: "flex min-h-11 items-center justify-between gap-3 px-3 pt-1.5 pb-0.5",
  flat: "flex min-h-11 items-center justify-between gap-3 border-t border-border/70 bg-foreground/[0.02] px-4 py-2",
} as const;

type Look = "layered" | "flat";

const EDGE = "ring-1 ring-inset ring-border";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const SOFT = { type: "spring", stiffness: 300, damping: 30 } as const;

const DANGER = {
  text: "text-destructive",
  bg: "bg-destructive-soft",
  edge: "ring-1 ring-inset ring-destructive/20",
  solid: "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive/60 dark:hover:bg-destructive/70",
} as const;

const HELD = {
  text: "text-warning",
  bg: "bg-warning-soft",
  edge: "ring-1 ring-inset ring-warning/20",
  solid: "bg-warning-fill text-warning-foreground hover:bg-warning-fill/90",
  fill: "bg-warning-fill",
} as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["figure", "title", "body", "sub", "dense", "meta", "chip", "micro"] }],
      shadow: [{ shadow: ["float", "overlay"] }],
    },
  },
});

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Cents = number;

const MINOR_DIGITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  CLP: 0,
  ISK: 0,
  BHD: 3,
  KWD: 3,
  OMR: 3,
  JOD: 3,
  TND: 3,
};

function digitsFor(currency: string) {
  return MINOR_DIGITS[currency.toUpperCase()] ?? 2;
}

const cache = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, locale: string, compact: boolean) {
  const key = `${locale}|${currency}|${compact ? 1 : 0}`;
  let f = cache.get(key);
  if (!f) {
    const digits = digitsFor(currency);
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: compact ? 0 : digits,
      maximumFractionDigits: digits,
    });
    cache.set(key, f);
  }
  return f;
}

interface FormatMoneyOptions {
  /** ISO 4217. Default `USD`. Take it from the invoice, never from the viewer's locale. */
  currency?: string;
  /** BCP 47. Default `en-US`. Controls separators and symbol placement only. */
  locale?: string;
  /**
   * Drop a zero fractional part: `$89` rather than `$89.00`.
   *
   * For prices on a plan picker, where the round number is the point. Never on
   * an invoice or a receipt, where the cents are the evidence.
   */
  compact?: boolean;
}

function formatMoney(
  cents: Cents,
  { currency = "USD", locale = "en-US", compact = false }: FormatMoneyOptions = {},
) {
  const units = cents / 10 ** digitsFor(currency);
  const whole = Number.isInteger(units);
  return formatter(currency, locale, compact && whole).format(units);
}

function prorate(
  fromPrice: Cents,
  toPrice: Cents,
  daysRemaining: number,
  daysInPeriod: number,
): Cents {
  if (daysInPeriod <= 0) return 0;
  return Math.round(((toPrice - fromPrice) * daysRemaining) / daysInPeriod);
}

function taxOn(cents: Cents, rate: number): Cents {
  return Math.round(cents * rate);
}

export interface UsageMeterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** What is being counted, plural: "API calls", "build minutes", "GB stored". */
  unit: string;
  included: number;
  used: number;
  /** Where today is in the period, for the run rate. */
  day: number;
  daysInPeriod: number;
  /** Display strings. The component formats no dates. */
  periodLabel?: string;
  periodEnd: string;
  /**
   * The day the allowance runs out at the current rate, if it will — computed
   * by the buyer's app, which owns the calendar. Drawn on the meter.
   */
  crossesOn?: string;
  /** The overage rate: `{ per: 1000, price: 20 }` is $0.20 per 1,000. */
  overage?: { per: number; price: Cents };
  currency?: string;
  locale?: string;
  title?: string;
  /** Optional quiet action, e.g. "Compare plans". */
  action?: { label: string; onClick: () => void };
  /** Layered sets it in a tray, the heading above the card and the status in the strip below. Flat is one card. */
  look?: Look;
}

export const UsageMeter = React.forwardRef<HTMLDivElement, UsageMeterProps>(function UsageMeter(
  {
    unit,
    included,
    used,
    day,
    daysInPeriod,
    periodLabel,
    periodEnd,
    crossesOn,
    overage,
    currency = "USD",
    locale = "en-US",
    title = "Usage",
    action,
    look = "layered",
    className,
    style,
    ...rest
  },
  ref,
) {
  const reduce = useReducedMotion();

  const perDay = day > 0 ? used / day : 0;
  const projected = Math.round(perDay * daysInPeriod);
  const overNow = Math.max(0, used - included);
  const overProjected = Math.max(0, projected - included);
  const cost = overage ? Math.round((overProjected / overage.per) * overage.price) : 0;

  const scale = Math.max(included, projected, used) * 1.04;
  const pct = (n: number) => `${(n / scale) * 100}%`;

  const compact = React.useMemo(
    () => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }),
    [locale],
  );
  const full = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const m = (c: Cents) => formatMoney(c, { currency, locale });

  const state: "over" | "heading" | "fine" = overNow > 0 ? "over" : overProjected > 0 ? "heading" : "fine";

  const tray = look === "layered";

  return (
    <div
      ref={ref}
      {...rest}
      data-look={look}
      style={{ fontFamily: FONT_STACK, ...style }}
      className={cn("flex w-full max-w-[440px] flex-col text-foreground antialiased", tray ? TRAY : FLAT_CARD, className)}
    >
      <div className={cn("flex items-center justify-between gap-3", tray ? "px-3 pt-2 pb-3" : "px-4 pt-4")}>
        <span className="font-medium tracking-[-0.01em] text-foreground" style={{ fontSize: TYPE.title }}>
          {title}
        </span>
      </div>

      <div className={cn("flex flex-col gap-3 p-4", tray && TRAY_CARD)}>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "font-semibold tracking-[-0.02em] tabular-nums",
              state === "over" ? DANGER.text : "text-foreground",
            )}
            style={{ fontSize: TYPE.figure }}
          >
            {compact.format(used)}
          </span>
          <span className="text-muted-foreground"style={{ fontSize: TYPE.sub }}>
            of {compact.format(included)} {unit}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="relative h-[10px]">
            <div className="absolute inset-0 rounded-full bg-muted" />

            <motion.div
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                state === "fine" ? "text-muted-foreground" : state === "heading" ? "text-warning-fill/70" : "text-destructive/60",
              )}
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-45deg, currentColor 0 3px, transparent 3px 6px)",
              }}
              initial={false}
              animate={{ width: pct(Math.max(projected, used)) }}
              transition={reduce ? { duration: 0 } : SOFT}
            />

            <motion.div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              initial={false}
              animate={{ width: pct(Math.min(used, included)) }}
              transition={reduce ? { duration: 0 } : SOFT}
            />
            {overNow > 0 && (
              <motion.div
                aria-hidden="true"
                className="absolute inset-y-0 rounded-r-full bg-destructive"
                style={{ left: pct(included) }}
                initial={false}
                animate={{ width: pct(overNow) }}
                transition={reduce ? { duration: 0 } : SOFT}
              />
            )}

            <span
              aria-hidden="true"
              className="absolute -top-[4px] h-[18px] w-[2px] -translate-x-1/2 rounded-full bg-primary"
              style={{ left: pct(included) }}
            />
          </div>

          <div className="relative h-4" style={{ fontSize: TYPE.micro }}>
            <span className="absolute left-0 text-muted-foreground tabular-nums">Used</span>
            <span
              className="absolute whitespace-nowrap text-foreground/90 tabular-nums"
              style={{
                left: pct(included),
                transform: `translateX(-${50 + 50 * Math.min(1, Math.max(0, (included / scale - 0.7) / 0.26))}%)`,
              }}
            >
              {compact.format(included)} included
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/50 pt-3">
          {[
            { k: "Daily average", v: compact.format(Math.round(perDay)) },
            { k: `Projected by ${periodEnd}`, v: compact.format(projected), tone: state !== "fine" },
            overage
              ? {
                  k: "Overage rate",
                  v: `${m(overage.price)} per ${full.format(overage.per)}`,
                }
              : null,
            overage
              ? {
                  k: "Projected overage",
                  v: cost > 0 ? m(cost) : "None",
                  tone: cost > 0,
                }
              : null,
          ]
            .filter(Boolean)
            .map((row) => (
              <div key={row!.k} className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground"style={{ fontSize: TYPE.meta }}>
                  {row!.k}
                </dt>
                <dd
                  className={cn(
                    "font-medium tabular-nums",
                    row!.tone
                      ? state === "over"
                        ? DANGER.text
                        : HELD.text
                      : "text-foreground",
                  )}
                  style={{ fontSize: TYPE.body }}
                >
                  {row!.v}
                </dd>
              </div>
            ))}
        </dl>

        <div
          className={cn(
            "flex items-start gap-2 rounded-[12px] px-3 py-2.5 transition-colors",
            state === "over" ? cn(DANGER.bg, DANGER.edge) : state === "heading" ? cn(HELD.bg, HELD.edge) : "bg-muted",
            SQUIRCLE,
          )}
        >
          <Clock
            aria-hidden="true"
            className={cn(
              "mt-[1px] size-[14px] shrink-0",
              state === "over" ? DANGER.text : state === "heading" ? HELD.text : "text-foreground/70",
            )}
          />
          <p
            className={cn("min-h-[2lh]", state === "over" ? DANGER.text : state === "heading" ? HELD.text : "text-foreground/70")}
            style={{ fontSize: TYPE.meta }}
          >
            {state === "over" ? (
              <>
                Over the allowance by {full.format(overNow)} {unit}
                {overage ? `, ${m(Math.round((overNow / overage.per) * overage.price))} so far` : ""}. At
                this rate the period ends at {compact.format(projected)}
                {overage ? `, about ${m(cost)} over` : ""}.
              </>
            ) : state === "heading" ? (
              <>
                At this rate you reach {compact.format(projected)} by {periodEnd}
                {crossesOn ? `, crossing the allowance on ${crossesOn}` : ""}
                {overage ? `, about ${m(cost)} over` : ""}.
              </>
            ) : (
              <>
                At this rate you reach {compact.format(projected)} by {periodEnd}, inside the{" "}
                {compact.format(included)} allowance.
              </>
            )}
          </p>
        </div>

      </div>

      <div className={STRIP[look]}>
        <span className="min-w-0 truncate tabular-nums text-muted-foreground" style={{ fontSize: TYPE.dense }}>
          {periodLabel ? `${periodLabel} · ` : ""}day {day} of {daysInPeriod}
        </span>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={cn(FOCUS,
              "h-8 shrink-0 rounded-[9px] px-2.5 font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.05] hover:text-foreground",
              SQUIRCLE,
            )}
            style={{ fontSize: TYPE.dense }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
});

export default UsageMeter;

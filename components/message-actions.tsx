"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  RotateCw,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button, IconButton } from "./button";

/* ==========================================================================
   Local utilities
   ========================================================================== */

const DURATION = {
  fast: 0.15,
  base: 0.2,
} as const;

const SOFT = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.8,
} as const;

const SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
} as const;

const SQUIRCLE = "[corner-shape:squircle]";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ==========================================================================
   Lightweight local tooltip

   Keeps MessageActions standalone without exposing Liro's private tooltip
   implementation.
   ========================================================================== */

interface TooltipProps {
  label: string;
  children: React.ReactElement<{ title?: string }>;
}

function Tooltip({ label, children }: TooltipProps) {
  return React.cloneElement(children, {
    title: label,
  });
}

function TooltipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

/* ==========================================================================
   Message Actions

   The row under an answer: copy it, ask again, say whether it was any good.

     <MessageActions text={answer} onRegenerate={regenerate} onFeedbackChange={save} />

   Every button resolves where it was pressed, so the row is its own receipt:

   Copy         the icon becomes a tick for a moment — no toast to chase
   Regenerate   the arrow turns, and keeps turning while `regenerating`
   Thumbs       the chosen one fills and stays filled; pressing it again
                takes the rating back
   Thumbs down  asks why, with one tap per reason. A rating nobody can
                explain is not something a team can act on.

   After a regenerate there is more than one answer to the same question.
   `version` adds the pager that moves between them.
   ========================================================================== */

export type MessageFeedback = "up" | "down" | null;

export interface MessageVersion {
  /** Zero-based index of the answer on screen. */
  index: number;

  total: number;

  onChange: (index: number) => void;
}

export interface MessageActionsProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "onCopy"
  > {
  /** What Copy puts on the clipboard. Leave it out to hide Copy. */
  text?: string;

  /** Called after the text is copied. */
  onCopy?: (text: string) => void;

  /** Leave it out to hide Regenerate. */
  onRegenerate?: () => void;

  /** Keeps the arrow turning and the button busy. */
  regenerating?: boolean;

  feedback?: MessageFeedback;

  defaultFeedback?: MessageFeedback;

  /** Leave it out, with no `feedback`, to hide the thumbs. */
  onFeedbackChange?: (value: MessageFeedback) => void;

  /** Asked after a thumbs down. Pass an empty array to skip the question. */
  reasons?: string[];

  onReason?: (reason: string) => void;

  /** Adds the pager between regenerated answers. */
  version?: MessageVersion;

  /** Extra buttons, placed after the built-in ones. */
  children?: React.ReactNode;
}

const DEFAULT_REASONS = [
  "Not accurate",
  "Missed the question",
  "Too long",
  "Out of date",
];

/* Liro's ghost IconButton, one step smaller and quieter than in a toolbar. */
const ACTION =
  "size-7 rounded-[8px] text-muted-foreground hover:text-foreground disabled:opacity-40 aria-pressed:text-foreground [&_svg]:size-3.5";

export const MessageActions = React.forwardRef<
  HTMLDivElement,
  MessageActionsProps
>(function MessageActions(
  {
    text,
    onCopy,
    onRegenerate,
    regenerating = false,
    feedback: feedbackProp,
    defaultFeedback = null,
    onFeedbackChange,
    reasons = DEFAULT_REASONS,
    onReason,
    version,
    children,
    className,
    ...props
  },
  ref,
) {
  const reduce = useReducedMotion();

  /* ---- copy ---- */

  const [copied, setCopied] = React.useState(false);

  const copyTimer =
    React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async () => {
    if (text === undefined) return;

    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      /* Blocked clipboard: still confirm, and let `onCopy` handle it. */
    }

    onCopy?.(text);

    setCopied(true);

    if (copyTimer.current) {
      clearTimeout(copyTimer.current);
    }

    copyTimer.current = setTimeout(
      () => setCopied(false),
      1600,
    );
  };

  /* ---- regenerate ---- */

  const [turns, setTurns] = React.useState(0);

  /* ---- feedback ---- */

  const [inner, setInner] =
    React.useState<MessageFeedback>(defaultFeedback);

  const feedback =
    feedbackProp !== undefined ? feedbackProp : inner;

  const [asking, setAsking] = React.useState(false);

  const [thanked, setThanked] = React.useState(false);

  const thanksTimer =
    React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const rate = (value: "up" | "down") => {
    const next = feedback === value ? null : value;

    setInner(next);

    onFeedbackChange?.(next);

    setThanked(false);

    setAsking(next === "down" && reasons.length > 0);
  };

  const giveReason = (reason: string) => {
    onReason?.(reason);

    setThanked(true);

    if (thanksTimer.current) {
      clearTimeout(thanksTimer.current);
    }

    thanksTimer.current = setTimeout(() => {
      setAsking(false);
      setThanked(false);
    }, 2200);
  };

  React.useEffect(
    () => () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
      }

      if (thanksTimer.current) {
        clearTimeout(thanksTimer.current);
      }
    },
    [],
  );

  const showThumbs =
    onFeedbackChange !== undefined ||
    feedbackProp !== undefined;

  const pop = reduce
    ? undefined
    : {
        scale: [1, 1.28, 1],
      };

  return (
    <div
      ref={ref}
      className={cn(
        "flex w-full flex-col",
        className,
      )}
      {...props}
    >
      <TooltipProvider>
        <div
          role="toolbar"
          aria-label="Message actions"
          className="flex items-center gap-0.5"
        >
          {text !== undefined && (
            <Tooltip label={copied ? "Copied" : "Copy"}>
              <IconButton
                label="Copy"
                onClick={copy}
                className={ACTION}
              >
                <AnimatePresence
                  initial={false}
                  mode="popLayout"
                >
                  <motion.span
                    key={copied ? "done" : "copy"}
                    initial={{
                      opacity: 0,
                      scale: 0.5,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.5,
                    }}
                    transition={SPRING}
                    className="absolute inset-0 grid place-items-center"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-success" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </IconButton>
            </Tooltip>
          )}

          {onRegenerate && (
            <Tooltip label="Regenerate">
              <IconButton
                label="Regenerate"
                aria-busy={
                  regenerating || undefined
                }
                disabled={regenerating}
                onClick={() => {
                  setTurns((t) => t + 1);
                  onRegenerate();
                }}
                className={cn(
                  ACTION,
                  "disabled:opacity-100",
                )}
              >
                <motion.span
                  animate={
                    reduce
                      ? undefined
                      : {
                          rotate: regenerating
                            ? 360
                            : turns * 360,
                        }
                  }
                  transition={
                    regenerating
                      ? {
                          duration: 0.9,
                          repeat: Infinity,
                          ease: "linear",
                        }
                      : SOFT
                  }
                  className="grid place-items-center"
                >
                  <RotateCw className="size-3.5" />
                </motion.span>
              </IconButton>
            </Tooltip>
          )}

          {showThumbs && (
            <>
              <Tooltip label="Good answer">
                <IconButton
                  label="Good answer"
                  aria-pressed={
                    feedback === "up"
                  }
                  onClick={() => rate("up")}
                  className={ACTION}
                >
                  <motion.span
                    key={String(
                      feedback === "up",
                    )}
                    animate={
                      feedback === "up"
                        ? pop
                        : undefined
                    }
                    transition={{
                      duration: 0.32,
                    }}
                    className="grid place-items-center"
                  >
                    <ThumbsUp
                      className={cn(
                        "size-3.5",
                        feedback === "up" &&
                          "fill-current",
                      )}
                    />
                  </motion.span>
                </IconButton>
              </Tooltip>

              <Tooltip label="Bad answer">
                <IconButton
                  label="Bad answer"
                  aria-pressed={
                    feedback === "down"
                  }
                  aria-expanded={asking}
                  onClick={() => rate("down")}
                  className={ACTION}
                >
                  <motion.span
                    key={String(
                      feedback === "down",
                    )}
                    animate={
                      feedback === "down"
                        ? pop
                        : undefined
                    }
                    transition={{
                      duration: 0.32,
                    }}
                    className="grid place-items-center"
                  >
                    <ThumbsDown
                      className={cn(
                        "size-3.5",
                        feedback === "down" &&
                          "fill-current",
                      )}
                    />
                  </motion.span>
                </IconButton>
              </Tooltip>
            </>
          )}

          {children}

          {version && version.total > 1 && (
            <div className="ml-1 flex items-center text-[11.5px] text-muted-foreground">
              <IconButton
                label="Previous answer"
                disabled={version.index === 0}
                onClick={() =>
                  version.onChange(
                    version.index - 1,
                  )
                }
                className={cn(
                  ACTION,
                  "size-6",
                )}
              >
                <ChevronLeft />
              </IconButton>

              <span
                aria-live="polite"
                className="relative inline-flex h-4 min-w-7 items-center justify-center overflow-hidden tabular-nums"
              >
                <AnimatePresence
                  initial={false}
                  mode="popLayout"
                >
                  <motion.span
                    key={version.index}
                    initial={
                      reduce
                        ? false
                        : {
                            opacity: 0,
                            y: 6,
                          }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={
                      reduce
                        ? {
                            opacity: 0,
                          }
                        : {
                            opacity: 0,
                            y: -6,
                          }
                    }
                    transition={{
                      duration: DURATION.base,
                    }}
                  >
                    {version.index + 1}/
                    {version.total}
                  </motion.span>
                </AnimatePresence>
              </span>

              <IconButton
                label="Next answer"
                disabled={
                  version.index >=
                  version.total - 1
                }
                onClick={() =>
                  version.onChange(
                    version.index + 1,
                  )
                }
                className={cn(
                  ACTION,
                  "size-6",
                )}
              >
                <ChevronRight />
              </IconButton>
            </div>
          )}
        </div>
      </TooltipProvider>

      <span
        role="status"
        className="sr-only"
      >
        {copied
          ? "Copied to clipboard"
          : ""}
      </span>

      <AnimatePresence initial={false}>
        {asking && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={
              reduce
                ? {
                    duration: 0,
                  }
                : SOFT
            }
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-1.5 ml-1.5 flex max-w-[460px] flex-wrap items-center gap-1.5 rounded-[12px] bg-card p-2 pl-3 text-[12.5px] ring-1 ring-inset ring-border",
                SQUIRCLE,
              )}
            >
              {thanked ? (
                <motion.p
                  role="status"
                  initial={
                    reduce
                      ? false
                      : {
                          opacity: 0,
                          y: 4,
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="flex items-center gap-1.5 py-1 text-muted-foreground"
                >
                  <Check
                    aria-hidden
                    className="size-3.5 text-success"
                  />
                  Thanks. That helps us fix it.
                </motion.p>
              ) : (
                <>
                  <span className="mr-1 text-muted-foreground">
                    What was wrong?
                  </span>

                  {reasons.map((r, i) => (
                    <motion.span
                      key={r}
                      initial={
                        reduce
                          ? false
                          : {
                              opacity: 0,
                              y: 4,
                            }
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        ...SPRING,
                        delay: reduce
                          ? 0
                          : 0.03 * i,
                      }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          giveReason(r)
                        }
                        className="h-7 rounded-[8px] px-2 text-[12.5px]"
                      >
                        {r}
                      </Button>
                    </motion.span>
                  ))}

                  <IconButton
                    label="Skip"
                    onClick={() =>
                      setAsking(false)
                    }
                    className={cn(
                      ACTION,
                      "ml-auto",
                    )}
                  >
                    <X />
                  </IconButton>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

MessageActions.displayName = "MessageActions";

export default MessageActions;

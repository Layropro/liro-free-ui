"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Square } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "./button";

/* ==========================================================================
   Local utilities
   ========================================================================== */

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
   Prompt Input

   The box you type a question into.

     <PromptInput onSubmit={send} onStop={stop} status={status} />

   It behaves the way people already expect a chat box to:

     Enter         sends
     Shift+Enter   starts a new line, and the box grows with the text
     Escape        stops an answer that is being written
     the button    is Send when there is something to send and Stop while an
                   answer is arriving — one button, never two side by side

   Enter does not send while an input method is composing, so typing Japanese,
   Chinese or Korean never fires a half-finished message.

   On its own it is one row. Give it `tools` or `header` and it becomes the
   two-row box that Prompt Composer is built from. Send, Stop and the tool
   buttons are Liro's Button, so they follow your theme and sizes.
   ========================================================================== */

export type PromptStatus = "idle" | "submitting" | "streaming";

export interface PromptInputProps
  extends Omit<
    React.FormHTMLAttributes<HTMLFormElement>,
    "onSubmit" | "onChange"
  > {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;

  /** Called with the trimmed text. The box clears itself unless `value` is controlled. */
  onSubmit?: (text: string) => void;

  /** Called by Stop and by Escape while `status` is not `idle`. */
  onStop?: () => void;

  /** `submitting` and `streaming` both turn Send into Stop. Default `idle`. */
  status?: PromptStatus;

  placeholder?: string;
  disabled?: boolean;

  /** Lines before the text scrolls. Default 8. */
  maxRows?: number;

  /** A counter appears once the text is within 20% of it. */
  maxLength?: number;

  /** The line under the box. Pass `false` to hide it. */
  hint?: React.ReactNode | false;

  /** Above the text: attachment chips, a quoted message. */
  header?: React.ReactNode;

  /** Bottom-left of the box: attach, model, tools. */
  tools?: React.ReactNode;

  /** Allow sending with no text — when attachments alone are a message. */
  allowEmpty?: boolean;

  /** Reach the textarea: to focus it, or to read the caret position. */
  textareaRef?: React.Ref<HTMLTextAreaElement>;

  /** Runs before the built-in key handling. Call `preventDefault` to take the key. */
  onTextareaKeyDown?: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => void;

  autoFocus?: boolean;
}

export const PromptInput = React.forwardRef<
  HTMLFormElement,
  PromptInputProps
>(function PromptInput(
  {
    value,
    defaultValue = "",
    onValueChange,
    onSubmit,
    onStop,
    status = "idle",
    placeholder = "Ask anything",
    disabled = false,
    maxRows = 8,
    maxLength,
    hint = "Enter to send · Shift+Enter for a new line",
    header,
    tools,
    allowEmpty = false,
    textareaRef,
    onTextareaKeyDown,
    autoFocus,
    className,
    ...props
  },
  ref,
) {
  const reduce = useReducedMotion();

  const el = React.useRef<HTMLTextAreaElement>(null);

  React.useImperativeHandle(
    textareaRef,
    () => el.current as HTMLTextAreaElement,
  );

  const [inner, setInner] =
    React.useState(defaultValue);

  const text = value ?? inner;

  const hintId = React.useId();

  const busy = status !== "idle";

  const canSend =
    !disabled &&
    !busy &&
    (allowEmpty || text.trim().length > 0);

  const tall = Boolean(tools || header);

  const fit = React.useCallback(() => {
    const t = el.current;

    if (!t) return;

    const cs = getComputedStyle(t);

    const line = parseFloat(cs.lineHeight) || 21;

    const pad =
      parseFloat(cs.paddingTop) +
      parseFloat(cs.paddingBottom);

    t.style.height = "auto";

    t.style.height = `${Math.min(
      t.scrollHeight,
      line * maxRows + pad,
    )}px`;
  }, [maxRows]);

  React.useLayoutEffect(
    fit,
    [fit, text],
  );

  const change = (v: string) => {
    setInner(v);
    onValueChange?.(v);
  };

  const submit = () => {
    if (!canSend) return;

    onSubmit?.(text.trim());

    if (value === undefined) {
      setInner("");
    }

    el.current?.focus();
  };

  const near =
    maxLength !== undefined &&
    text.length >= maxLength * 0.8;

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn(
        "w-full text-foreground",
        className,
      )}
      {...props}
    >
      <div
        data-status={status}
        className={cn(
          "bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-inset ring-input transition-shadow duration-150",
          "hover:ring-foreground/25 focus-within:ring-2 focus-within:ring-ring focus-within:hover:ring-ring",
          tall
            ? "rounded-[18px]"
            : "flex items-end gap-1 rounded-[16px] py-1.5 pr-1.5",
          disabled &&
            "pointer-events-none opacity-60",
          SQUIRCLE,
        )}
      >
        {header && (
          <div className="px-2.5 pt-2.5">
            {header}
          </div>
        )}

        <textarea
          ref={el}
          rows={1}
          value={text}
          autoFocus={autoFocus}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-describedby={
            hint ? hintId : undefined
          }
          onChange={(e) =>
            change(e.target.value)
          }
          onKeyDown={(e) => {
            onTextareaKeyDown?.(e);

            if (e.defaultPrevented) return;

            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            } else if (
              e.key === "Escape" &&
              busy
            ) {
              e.preventDefault();
              onStop?.();
            }
          }}
          className={cn(
            "block w-full min-w-0 resize-none bg-transparent text-[13.5px] leading-[1.55] outline-none placeholder:text-muted-foreground",
            tall
              ? "px-3.5 pt-3 pb-1"
              : "flex-1 py-[5px] pl-3.5",
          )}
        />

        <div
          className={cn(
            "flex items-center gap-1",
            tall
              ? "p-2 pt-1"
              : "shrink-0",
          )}
        >
          {tall && (
            <div className="flex min-w-0 flex-1 items-center gap-0.5">
              {tools}
            </div>
          )}

          {near && (
            <span
              aria-live="polite"
              className={cn(
                "px-1 text-[11px] tabular-nums",
                text.length >= maxLength!
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {text.length}/{maxLength}
            </span>
          )}

          <Button
            icon
            size="sm"
            type={
              busy ? "button" : "submit"
            }
            aria-label={
              busy ? "Stop" : "Send"
            }
            disabled={
              !busy && !canSend
            }
            onClick={
              busy
                ? () => onStop?.()
                : undefined
            }
            className="rounded-[10px] transition-[background-color,opacity,scale] active:scale-[0.92] disabled:cursor-default disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 motion-reduce:active:scale-100"
          >
            <AnimatePresence
              initial={false}
              mode="popLayout"
            >
              <motion.span
                key={
                  busy ? "stop" : "send"
                }
                initial={
                  reduce
                    ? false
                    : {
                        opacity: 0,
                        scale: 0.4,
                        rotate: busy
                          ? -90
                          : 90,
                      }
                }
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                }}
                exit={
                  reduce
                    ? {
                        opacity: 0,
                      }
                    : {
                        opacity: 0,
                        scale: 0.4,
                      }
                }
                transition={SPRING}
                className="absolute inset-0 grid place-items-center"
              >
                {busy ? (
                  <Square className="size-3 fill-current" />
                ) : (
                  <ArrowUp
                    className="size-4"
                    strokeWidth={2.25}
                  />
                )}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </div>

      {hint && (
        <p
          id={hintId}
          className="mt-1.5 px-1 text-center text-[11.5px] text-muted-foreground"
        >
          {busy
            ? "Esc to stop"
            : hint}
        </p>
      )}
    </form>
  );
});

/* ------------------------------------------------------------------ tools -- */

export interface PromptToolProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Lit, for a tool that is switched on. */
  active?: boolean;
}

/** A ghost Button for the `tools` row: an icon, or an icon and a word. */
export const PromptTool = React.forwardRef<
  HTMLButtonElement,
  PromptToolProps
>(function PromptTool(
  {
    active,
    className,
    type,
    ...props
  },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      type={type ?? "button"}
      aria-pressed={active}
      className={cn(
        "min-w-8 px-2 text-[12.5px] text-muted-foreground hover:text-foreground",
        active &&
          "bg-accent text-foreground",
        className,
      )}
      {...props}
    />
  );
});

PromptInput.displayName = "PromptInput";
PromptTool.displayName = "PromptTool";

export default PromptInput;

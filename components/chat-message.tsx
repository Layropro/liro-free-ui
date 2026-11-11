"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  RotateCw,
  Sparkles,
  Square,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "./button";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
   Chat Message

   One turn in a conversation. `role` decides everything a designer would
   otherwise draw twice: the person's message sits right, in a bubble, because
   it is short and theirs; the assistant's sits left with no box, because it is
   long, has tables and code in it, and a bubble around a table is a box in a
   box.

      <ChatMessageList>
        <ChatMessage role="user" time="10:42">
          Which invoices are overdue?
        </ChatMessage>

        <ChatMessage
          role="assistant"
          name="Liro Assistant"
          sources={sources}
        >
          <StreamingResponse text={answer} />
        </ChatMessage>
      </ChatMessageList>

   Four endings, and each one is visible rather than implied:

     complete    nothing extra
     streaming   the mark breathes; the content brings its own caret
     cancelled   "Stopped" under whatever had arrived — the partial answer stays
     failed      the reason, in words, and Retry if you pass `onRetry`

   A failed message keeps its place in the thread. Removing it would make the
   conversation read as if the question was never asked.
   ========================================================================== */

export type ChatRole = "user" | "assistant" | "system";
export type ChatMessageStatus =
  | "complete"
  | "streaming"
  | "cancelled"
  | "failed";

export interface ChatSource {
  /** What was read: a document title, a page name. */
  title: string;
  /** Where in it: "p. 4", "Clause 7", "3 rows". */
  meta?: string;
  href?: string;
}

export interface ChatAttachment {
  name: string;
  /** Already formatted: "240 KB". */
  size?: string;
  kind?: "file" | "image";
  href?: string;
}

export interface ChatMessageProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "role" | "children"
  > {
  /** Who is speaking. `system` is a centred line for events: "Context cleared". */
  role: ChatRole;
  /** The message. Plain text, or a React component for an assistant's answer. */
  children?: React.ReactNode;
  /** Shown above an assistant message. Also read out before it. */
  name?: string;
  /** Replaces the default mark (assistant) or adds a face (user). */
  avatar?: React.ReactNode;
  /** Already formatted: "10:42". */
  time?: string;
  /** How the message ended, or that it has not yet. Default `complete`. */
  status?: ChatMessageStatus;
  /** Why it failed, in plain words. Shown when `status` is `failed`. */
  error?: string;
  /** Shows Retry beside the error. Leave it out when retrying cannot help. */
  onRetry?: () => void;
  /** Files sent with the message. */
  attachments?: ChatAttachment[];
  /** What the answer was drawn from, numbered in the order given. */
  sources?: ChatSource[];
  /** The row under an assistant message — usually `<MessageActions>`. */
  actions?: React.ReactNode;
  /** Rise and fade in when mounted. Default true; reduced motion turns it off. */
  animate?: boolean;
}

const SPOKEN: Record<ChatRole, string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
};

export const ChatMessage = React.forwardRef<
  HTMLDivElement,
  ChatMessageProps
>(function ChatMessage(
  {
    role,
    children,
    name,
    avatar,
    time,
    status = "complete",
    error,
    onRetry,
    attachments,
    sources,
    actions,
    animate = true,
    className,
    ...rest
  },
  ref,
) {
  const reduce = useReducedMotion();
  const move = animate && !reduce;

  const enter = move
    ? {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: SPRING,
      }
    : { initial: false as const };

  if (role === "system") {
    return (
      <motion.div
        ref={ref}
        data-role="system"
        {...enter}
        className={cn(
          "flex items-center gap-3 py-1 text-[11.5px] text-muted-foreground",
          className,
        )}
        {...(rest as object)}
      >
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span>{children}</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </motion.div>
    );
  }

  const mine = role === "user";

  return (
    <motion.div
      ref={ref}
      data-role={role}
      data-status={status}
      {...enter}
      className={cn(
        "group/message flex w-full gap-3 text-foreground",
        mine && "flex-row-reverse",
        className,
      )}
      {...(rest as object)}
    >
      {mine ? (
        avatar ? (
          <div className="mt-0.5 shrink-0">{avatar}</div>
        ) : null
      ) : (
        <motion.div
          aria-hidden
          animate={
            status === "streaming" && !reduce
              ? { scale: [1, 1.08, 1] }
              : { scale: 1 }
          }
          transition={
            status === "streaming"
              ? {
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : SPRING
          }
          className="mt-0.5 shrink-0"
        >
          {avatar ?? (
            <span
              className={cn(
                "grid size-7 place-items-center rounded-[9px] bg-primary text-primary-foreground",
                SQUIRCLE,
              )}
            >
              <Sparkles className="size-3.5" />
            </span>
          )}
        </motion.div>
      )}

      <div
        className={cn(
          "flex min-w-0 flex-col",
          mine ? "max-w-[85%] items-end" : "flex-1 items-start",
        )}
      >
        <span className="sr-only">
          {mine ? SPOKEN.user : (name ?? SPOKEN.assistant)} said:
        </span>

        {!mine && (name || time) && (
          <p className="mb-1 flex items-baseline gap-2 text-[12.5px] leading-none">
            {name && <span className="font-medium">{name}</span>}
            {time && (
              <span className="text-[11.5px] text-muted-foreground tabular-nums">
                {time}
              </span>
            )}
          </p>
        )}

        {attachments && attachments.length > 0 && (
          <ul
            className={cn(
              "mb-1.5 flex flex-wrap gap-1.5",
              mine && "justify-end",
            )}
          >
            {attachments.map((attachment) => (
              <li key={attachment.name}>
                <AttachmentChip attachment={attachment} />
              </li>
            ))}
          </ul>
        )}

        {children !== undefined &&
          children !== null &&
          children !== "" && (
            <div
              className={cn(
                "min-w-0 max-w-full text-[13.5px] leading-[1.6] break-words",
                mine
                  ? cn(
                      "rounded-[18px] rounded-br-[6px] bg-secondary px-3.5 py-2 text-secondary-foreground whitespace-pre-wrap",
                      SQUIRCLE,
                    )
                  : "w-full",
              )}
            >
              {children}
            </div>
          )}

        {status === "cancelled" && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Square aria-hidden className="size-2.5 fill-current" />
            Stopped
          </p>
        )}

        {status === "failed" && (
          <motion.div
            role="alert"
            initial={move ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className={cn(
              "mt-1.5 flex w-full items-center gap-2.5 rounded-[12px] bg-destructive/10 py-1.5 pr-1.5 pl-3 text-[12.5px] text-destructive ring-1 ring-inset ring-destructive/20",
              SQUIRCLE,
            )}
          >
            <AlertTriangle aria-hidden className="size-4 shrink-0" />

            <span className="min-w-0 flex-1 py-1">
              {error ?? "Something went wrong before the answer finished."}
            </span>

            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="text-foreground"
              >
                <RotateCw />
                Retry
              </Button>
            )}
          </motion.div>
        )}

        {sources && sources.length > 0 && status !== "streaming" && (
          <ol
            aria-label="Sources"
            className="mt-2.5 flex flex-wrap gap-1.5"
          >
            {sources.map((source, index) => (
              <motion.li
                key={source.title + index}
                initial={move ? { opacity: 0, y: 4 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ...SPRING,
                  delay: move ? 0.05 * index : 0,
                }}
              >
                <SourceChip source={source} index={index + 1} />
              </motion.li>
            ))}
          </ol>
        )}

        {mine && time && (
          <p className="mt-1 text-[11.5px] text-muted-foreground tabular-nums">
            {time}
          </p>
        )}

        {actions && status !== "streaming" && (
          <div className="mt-1.5 -ml-1.5">{actions}</div>
        )}
      </div>
    </motion.div>
  );
});

/* ------------------------------------------------------------------ parts -- */

function AttachmentChip({
  attachment,
}: {
  attachment: ChatAttachment;
}) {
  const Icon =
    attachment.kind === "image" ? ImageIcon : FileText;

  const body = (
    <>
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-[7px] bg-muted text-muted-foreground",
          SQUIRCLE,
        )}
      >
        <Icon aria-hidden className="size-3.5" />
      </span>

      <span className="min-w-0 truncate font-medium">
        {attachment.name}
      </span>

      {attachment.size && (
        <span className="shrink-0 text-muted-foreground">
          {attachment.size}
        </span>
      )}
    </>
  );

  const cls = cn(
    "inline-flex max-w-[240px] items-center gap-2 rounded-[10px] bg-card py-1 pr-2.5 pl-1 text-[12px] ring-1 ring-inset ring-border",
    SQUIRCLE,
  );

  return attachment.href ? (
    <a
      href={attachment.href}
      className={cn(
        cls,
        "transition-colors hover:bg-accent",
        FOCUS,
      )}
    >
      {body}
    </a>
  ) : (
    <span className={cls}>{body}</span>
  );
}

function SourceChip({
  source,
  index,
}: {
  source: ChatSource;
  index: number;
}) {
  const body = (
    <>
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-foreground/10 text-[10.5px] font-medium tabular-nums">
        {index}
      </span>

      <span className="min-w-0 truncate">{source.title}</span>

      {source.meta && (
        <span className="shrink-0 text-foreground/70">
          {source.meta}
        </span>
      )}
    </>
  );

  const cls = cn(
    "inline-flex max-w-[260px] items-center gap-1.5 rounded-[8px] bg-muted py-1 pr-2 pl-1 text-[11.5px] text-foreground",
    SQUIRCLE,
  );

  return source.href ? (
    <a
      href={source.href}
      className={cn(
        cls,
        "transition-colors hover:bg-accent",
        FOCUS,
      )}
    >
      {body}
    </a>
  ) : (
    <span className={cls}>{body}</span>
  );
}

/* ------------------------------------------------------------------- list -- */

export interface ChatMessageListProps
  extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * The thread. A `log` region, so a screen reader announces new messages as
 * they arrive without re-reading the ones already heard.
 */
export const ChatMessageList = React.forwardRef<
  HTMLDivElement,
  ChatMessageListProps
>(function ChatMessageList({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className={cn("flex w-full flex-col gap-5", className)}
      {...props}
    />
  );
});

export default ChatMessage;

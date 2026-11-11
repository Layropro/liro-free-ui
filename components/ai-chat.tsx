"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Sparkles, SquarePen } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button, IconButton } from "./button";
import {
  type ChatAttachment,
  ChatMessage,
  ChatMessageList,
  type ChatSource,
} from "./chat-message";
import { MessageActions, type MessageFeedback } from "./message-actions";
import { PromptInput } from "./prompt-input";
import { StreamingResponse, simulateStream } from "./streaming-response";
import { ThinkingState } from "./thinking-state";

/* ==========================================================================
   Local utilities
   ========================================================================== */

const SQUIRCLE = "[corner-shape:squircle]";

const SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
} as const;

const SOFT = { type: "spring", stiffness: 300, damping: 30 } as const;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ==========================================================================
   Building blocks used by the chat
   ========================================================================== */

/* ------------------------------------------------------------------ tooltip -- */

/* ==========================================================================
   Tooltip

   A label for a control that only shows an icon.

   Three things it has to get right, all of which the hand-rolled `title`
   attribute gets wrong: it must appear fast enough to answer a hesitation but
   not so fast that sweeping the cursor across a toolbar sets off a chain of
   them; it must appear on keyboard focus, not only on hover, or the icon
   buttons are unlabelled for anyone using Tab; and it must not be clipped by
   the toolbar it lives in. Radix handles all three: the delay is paid once per
   group (wrap a toolbar in <TooltipProvider>), focus opens it, and it renders
   in a portal that flips to stay on screen.

     <Tooltip label="Zoom in" keys="⌘+">
       <IconButton label="Zoom in"><ZoomIn /></IconButton>
     </Tooltip>

   Without a provider above it, each Tooltip brings its own — it still works,
   it just pays the delay every time.
   ========================================================================== */

const ProviderPresent = React.createContext(false);

function TooltipProvider({
  delayDuration = 400,
  skipDelayDuration = 500,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <ProviderPresent.Provider value={true}>
      <TooltipPrimitive.Provider
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
        {...props}
      />
    </ProviderPresent.Provider>
  );
}

const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(function TooltipContent({ className, sideOffset = 6, style, ...props }, ref) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={12}
        style={{ zIndex: 90, ...style }}
        className={cn(
          "pointer-events-none rounded-[7px] bg-primary px-2 py-1 text-[11.5px] leading-snug font-medium whitespace-nowrap text-primary-foreground",
          "shadow-[0_8px_20px_-8px_rgb(0_0_0/0.4)]",
          "motion-safe:data-[state=delayed-open]:animate-pop-in motion-safe:data-[state=instant-open]:animate-fade-in motion-safe:data-[state=closed]:animate-fade-out",
          "data-[side=bottom]:[--pop-y:-3px] data-[side=top]:[--pop-y:3px]",
          SQUIRCLE,
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});

interface TooltipProps {
  /** The label. Keep it to a few words — it is a name, not documentation. */
  label: React.ReactNode;
  /** The shortcut, shown dimmed after the label: "Zoom in ⌘+". */
  keys?: string;
  side?: "top" | "bottom" | "left" | "right";
  /** Delay before the first tooltip in a group, in ms. Used when no provider is present. */
  delay?: number;
  children: React.ReactElement;
}

function Tooltip({
  label,
  keys,
  side = "top",
  delay = 400,
  children,
}: TooltipProps) {
  const hasProvider = React.useContext(ProviderPresent);
  const tip = (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipContent side={side}>
        {label}
        {keys && <span className="ml-1.5 opacity-70">{keys}</span>}
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
  return hasProvider ? (
    tip
  ) : (
    <TooltipProvider delayDuration={delay}>{tip}</TooltipProvider>
  );
}

/* ------------------------------------------------------------------ chat empty state -- */

/* ==========================================================================
   Chat Empty State

   The screen before the first message.

     <ChatEmptyState
       title="How can I help, Michael?"
       description="Ask about invoices, contracts or anyone in Northwind Studio."
       starters={[
         { label: "Which invoices are overdue?", description: "The list, oldest first", icon: <Receipt /> },
         { label: "Who still has to sign?", description: "Signer by signer", icon: <FileSignature /> },
       ]}
       onStarter={send}
     />

   A blank chat has one job: get the first question asked. So it says, in this
   order, who is listening, what it knows about, and a few things worth asking
   — each of which sends on one click.

     mark           your logo, on a soft glow that turns slowly behind it
     capabilities   what the assistant can reach, as small labels, so nobody
                    asks it for something it has no access to
     starters       one-click questions. Give each an icon or a description
                    and they become cards, with a `tone` to colour the icon;
                    plain strings stay small chips
     children       anything richer in their place, such as <SuggestedPrompts>
     footer         the caveat every assistant needs, said once, quietly

   The cards sit side by side when the component itself is wide enough,
   whatever the screen is: it measures its own box, so it lays out the same in
   a narrow side panel as on a phone.

   It arrives in sequence — mark, greeting, the rest — so the eye lands on the
   greeting first and the questions second. The buttons are Liro's Button.
   ========================================================================== */

export interface ChatCapability {
  icon?: React.ReactNode;
  title: string;
  /** Read out with the title, and shown on hover. */
  description?: string;
}

export interface ChatStarter {
  /** What is shown. */
  label: string;
  /** One line under the label: what the answer will contain. */
  description?: string;
  icon?: React.ReactNode;
  /** The colour of the icon tile. Default `neutral`. */
  tone?: "neutral" | "info" | "success" | "warning";
  /** What is sent, when it should be longer than the label. */
  prompt?: string;
}

const TONE = {
  neutral: "bg-muted text-foreground/70",
  info: "bg-info/10 text-info",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
} as const;

interface ChatEmptyStateProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  /** Replaces the default mark: your product's logo, about 48px. */
  mark?: React.ReactNode;
  /** The soft glow behind the mark. Default true. */
  glow?: boolean;
  /** The greeting. A string is revealed word by word. */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Up to four things the assistant can do or reach. */
  capabilities?: ChatCapability[];
  /** One-click questions: strings for chips, objects for cards. */
  starters?: Array<string | ChatStarter>;
  /** Called with the starter's `prompt`, or its label. */
  onStarter?: (text: string) => void;
  /** Shown in place of `starters`. */
  children?: React.ReactNode;
  /** A quiet last line: "Answers can be wrong. Check the sources." */
  footer?: React.ReactNode;
  /** Default `center`. */
  align?: "center" | "start";
}

const ChatEmptyState = React.forwardRef<HTMLDivElement, ChatEmptyStateProps>(
  function ChatEmptyState(
    {
      mark,
      glow = true,
      title,
      description,
      capabilities,
      starters,
      onStarter,
      children,
      footer,
      align = "center",
      className,
      ...props
    },
    ref,
  ) {
    const reduce = useReducedMotion();
    const centred = align === "center";

    /* One clock for the whole entrance, so the order holds whatever is present. */
    let step = 0;
    const rise = (extra = 0) => {
      const delay = reduce ? 0 : 0.06 * step++ + extra;
      return {
        initial: reduce ? (false as const) : { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { ...SOFT, delay },
      };
    };

    const words = typeof title === "string" ? title.split(" ") : null;
    const list = (starters ?? []).map((s) =>
      typeof s === "string" ? { label: s } : s,
    );
    const cards = list.some((s) => s.description || s.icon);

    return (
      <div
        ref={ref}
        className={cn(
          "@container flex w-full flex-col gap-4 text-foreground",
          centred ? "items-center text-center" : "items-start text-left",
          className,
        )}
        {...props}
      >
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          className="relative mb-1 grid place-items-center"
        >
          {glow && (
            /* Three theme colours in a ring, blurred until only the light is left. */
            <motion.span
              aria-hidden
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              className="pointer-events-none absolute -inset-9 rounded-full bg-[conic-gradient(from_0deg,var(--color-info),var(--color-success),var(--color-warning),var(--color-info))] opacity-45 blur-[28px] dark:opacity-50"
            />
          )}
          <span className="relative grid place-items-center">
            {mark ?? (
              <span
                className={cn(
                  "grid size-12 place-items-center rounded-[16px] bg-primary text-primary-foreground",
                  SQUIRCLE,
                )}
              >
                <Sparkles aria-hidden className="size-[22px]" />
              </span>
            )}
          </span>
        </motion.div>

        <div
          className={cn(
            "flex max-w-[46ch] flex-col gap-2",
            centred && "items-center",
          )}
        >
          <h2 className="text-[24px] leading-[1.15] font-semibold tracking-[-0.025em] text-balance @min-[480px]:text-[26px]">
            {words
              ? words.map((w, i) => (
                  /* The space sits between the words, not inside them: a space at
                   the end of an inline-block is dropped. */
                  <React.Fragment key={i}>
                    <motion.span
                      initial={
                        reduce
                          ? false
                          : { opacity: 0, y: 6, filter: "blur(4px)" }
                      }
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{
                        ...SOFT,
                        delay: reduce ? 0 : 0.12 + 0.045 * i,
                      }}
                      className="inline-block"
                    >
                      {w}
                    </motion.span>
                    {i < words.length - 1 ? " " : ""}
                  </React.Fragment>
                ))
              : title}
          </h2>
          {description && (
            <motion.p
              {...rise(0.25)}
              className="text-[13.5px] leading-relaxed text-pretty text-muted-foreground"
            >
              {description}
            </motion.p>
          )}
        </div>

        {capabilities && capabilities.length > 0 && (
          <motion.ul
            {...rise(0.25)}
            aria-label="What it can reach"
            className={cn(
              "flex flex-wrap gap-1.5",
              centred && "justify-center",
            )}
          >
            {capabilities.slice(0, 4).map((c) => (
              <li
                key={c.title}
                title={c.description}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5 text-[12px] font-medium text-foreground/80 [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
              >
                {c.icon}
                {c.title}
                {c.description && (
                  <span className="sr-only">: {c.description}</span>
                )}
              </li>
            ))}
          </motion.ul>
        )}

        {children ? (
          <motion.div
            {...rise(0.25)}
            className="w-full max-w-[640px] text-left"
          >
            {children}
          </motion.div>
        ) : (
          list.length > 0 &&
          (cards ? (
            <ul
              aria-label="Suggested questions"
              className="mt-1 grid w-full max-w-[640px] gap-2 @min-[440px]:grid-cols-2"
            >
              {list.map((s) => (
                <motion.li key={s.label} {...rise(0.25)} className="flex">
                  <Button
                    variant="outline"
                    onClick={() => onStarter?.(s.prompt ?? s.label)}
                    className={cn(
                      "group/starter h-auto w-full items-center justify-start gap-3 rounded-[14px] p-2.5 pr-3 text-left whitespace-normal",
                      "transition-[background-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-float hover:ring-foreground/20 motion-reduce:hover:translate-y-0",
                    )}
                  >
                    {s.icon && (
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-[10px] [&_svg]:size-4",
                          TONE[s.tone ?? "neutral"],
                          SQUIRCLE,
                        )}
                      >
                        {s.icon}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-snug font-medium">
                        {s.label}
                      </span>
                      {s.description && (
                        <span className="mt-0.5 block text-[12px] leading-snug font-normal text-muted-foreground">
                          {s.description}
                        </span>
                      )}
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      className="size-3.5! text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover/starter:translate-x-0.5 group-hover/starter:-translate-y-0.5 group-hover/starter:opacity-100 group-focus-visible/starter:opacity-100"
                    />
                  </Button>
                </motion.li>
              ))}
            </ul>
          ) : (
            <ul
              aria-label="Suggested questions"
              className={cn(
                "mt-1 flex w-full max-w-[640px] flex-wrap gap-1.5",
                centred && "justify-center",
              )}
            >
              {list.map((s) => (
                <motion.li key={s.label} {...rise(0.25)} className="max-w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStarter?.(s.prompt ?? s.label)}
                    className="max-w-full rounded-full px-3"
                  >
                    <span className="truncate">{s.label}</span>
                  </Button>
                </motion.li>
              ))}
            </ul>
          ))
        )}

        {footer && (
          <motion.p
            {...rise(0.3)}
            className="text-[11.5px] text-muted-foreground"
          >
            {footer}
          </motion.p>
        )}
      </div>
    );
  },
);

/* ==========================================================================
   AI Chat

   A whole chat window: greeting, thread, streaming answers, and the box to
   type in. It is the seven smaller Liro chat components working together.

     <AIChat
       assistant={{ name: "Liro Assistant" }}
       welcome={{ title: "How can I help?", starters: ["Which invoices are overdue?"] }}
       onSend={async function* ({ text, messages, signal }) {
         const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ messages }), signal });
         for await (const chunk of res.body!.pipeThrough(new TextDecoderStream())) yield chunk;
       }}
     />

   You give it one function. `onSend` receives the conversation and an abort
   signal and returns the answer as a stream of strings; the component does
   the rest, and every state an answer can be in is drawn:

     thinking     before the first word, with what it is doing if you say
     generating   words arriving, a caret, Send turned into Stop
     completed    copy, regenerate, rate — and a pager once there is more
                  than one answer to the same question
     cancelled    Stop keeps what had arrived and marks it "Stopped"
     failed       the reason, and Retry, in the place the answer would be

   The thread follows new text while you are at the bottom and leaves you
   alone once you scroll up to read, with a button to jump back.

   Besides strings, the stream may yield `{ type: "status", detail }` to say
   what it is doing while thinking, and `{ type: "sources", sources }`.
   Without `onSend` it runs on a built-in simulator, so it works before there
   is a backend.
   ========================================================================== */

export type AIChatEvent =
  | { type: "text"; text: string }
  | { type: "status"; detail: string }
  | { type: "sources"; sources: ChatSource[] };

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Already formatted: "10:42". */
  time?: string;
  status?: "thinking" | "streaming" | "complete" | "cancelled" | "failed";
  error?: string;
  sources?: ChatSource[];
  attachments?: ChatAttachment[];
  feedback?: MessageFeedback;
}

export interface AIChatRequest {
  /** The message just sent. */
  text: string;
  /** Everything before it, oldest first, ending with that message. */
  messages: AIChatMessage[];
  /** Aborted by Stop. Pass it to `fetch`. */
  signal: AbortSignal;
}

export interface AIChatWelcome {
  title: React.ReactNode;
  description?: React.ReactNode;
  capabilities?: ChatCapability[];
  /** Strings for chips; objects with an icon or description for cards. */
  starters?: Array<string | ChatStarter>;
  /** Your logo above the greeting, about 48px. */
  mark?: React.ReactNode;
  footer?: React.ReactNode;
}

export interface AIChatProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  /** Sends the conversation to your model; returns the answer as a stream, or a promise of the whole text. */
  onSend?: (
    request: AIChatRequest,
  ) => AsyncIterable<string | AIChatEvent> | Promise<string>;
  /** A conversation to start from. */
  defaultMessages?: AIChatMessage[];
  /** Called whenever the thread changes — to save it. */
  onMessagesChange?: (messages: AIChatMessage[]) => void;
  /** Shown in the header and above each answer. */
  assistant?: { name: string; avatar?: React.ReactNode };
  /** A face beside the person's messages. */
  userAvatar?: React.ReactNode;
  /** The empty screen. */
  welcome?: AIChatWelcome;
  placeholder?: string;
  /** Called when an answer is rated, and again with the reason for a thumbs down. */
  onFeedback?: (
    message: AIChatMessage,
    value: MessageFeedback,
    reason?: string,
  ) => void;
  /** Show the header with the assistant's name and New chat. Default true. */
  header?: boolean;
}

type Turn = {
  text: string;
  status: NonNullable<AIChatMessage["status"]>;
  error?: string;
  sources?: ChatSource[];
  detail?: string;
};
type Row = {
  id: string;
  role: "user" | "assistant";
  time?: string;
  attachments?: ChatAttachment[];
  feedback?: MessageFeedback;
  turns: Turn[];
  at: number;
};

const flat = (r: Row): AIChatMessage => {
  const t = r.turns[r.at];
  return {
    id: r.id,
    role: r.role,
    text: t.text,
    time: r.time,
    status: t.status,
    error: t.error,
    sources: t.sources,
    attachments: r.attachments,
    feedback: r.feedback,
  };
};
const toRow = (m: AIChatMessage): Row => ({
  id: m.id,
  role: m.role,
  time: m.time,
  attachments: m.attachments,
  feedback: m.feedback,
  turns: [
    {
      text: m.text,
      status: m.status ?? "complete",
      error: m.error,
      sources: m.sources,
    },
  ],
  at: 0,
});

const clock = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

async function* demoReply({ signal }: AIChatRequest): AsyncGenerator<string> {
  yield* simulateStream(
    "This is a simulated reply, so the window works before it is connected to anything.\n\nPass an `onSend` function to send the conversation to your own model and stream its answer back.",
    { signal, startDelay: 700 },
  );
}

export const AIChat = React.forwardRef<HTMLDivElement, AIChatProps>(
  function AIChat(
    {
      onSend = demoReply,
      defaultMessages,
      onMessagesChange,
      assistant = { name: "Assistant" },
      userAvatar,
      welcome,
      placeholder,
      onFeedback,
      header = true,
      className,
      ...props
    },
    ref,
  ) {
    const reduce = useReducedMotion();
    const [rows, setRows] = React.useState<Row[]>(() =>
      (defaultMessages ?? []).map(toRow),
    );
    const [busy, setBusy] = React.useState<"submitting" | "streaming" | null>(
      null,
    );
    const control = React.useRef<AbortController | null>(null);
    const seq = React.useRef(0);
    const nextId = () => `m${Date.now().toString(36)}${seq.current++}`;

    const changed = React.useRef(onMessagesChange);
    changed.current = onMessagesChange;
    React.useEffect(() => {
      changed.current?.(rows.map(flat));
    }, [rows]);
    React.useEffect(() => () => control.current?.abort(), []);

    const patch = (id: string, at: number, change: (t: Turn) => Turn) =>
      setRows((rs) =>
        rs.map((r) =>
          r.id === id
            ? { ...r, turns: r.turns.map((t, i) => (i === at ? change(t) : t)) }
            : r,
        ),
      );

    /* Ask the model for one answer and stream it into a turn. */
    const run = async (
      answerId: string,
      at: number,
      text: string,
      history: AIChatMessage[],
    ) => {
      const ctl = new AbortController();
      control.current = ctl;
      setBusy("submitting");
      let started = false;
      const add = (chunk: string) => {
        if (!chunk) return;
        if (!started) {
          started = true;
          setBusy("streaming");
        }
        patch(answerId, at, (t) => ({
          ...t,
          status: "streaming",
          text: t.text + chunk,
        }));
      };
      try {
        const out = onSend({ text, messages: history, signal: ctl.signal });
        if (out instanceof Promise) add(await out);
        else {
          for await (const part of out) {
            if (ctl.signal.aborted) break;
            if (typeof part === "string") add(part);
            else if (part.type === "text") add(part.text);
            else if (part.type === "status")
              patch(answerId, at, (t) => ({ ...t, detail: part.detail }));
            else if (part.type === "sources")
              patch(answerId, at, (t) => ({ ...t, sources: part.sources }));
          }
        }
        patch(answerId, at, (t) => ({
          ...t,
          status: ctl.signal.aborted ? "cancelled" : "complete",
        }));
      } catch (e) {
        const stopped =
          ctl.signal.aborted || (e as Error)?.name === "AbortError";
        patch(answerId, at, (t) =>
          stopped
            ? { ...t, status: "cancelled" }
            : {
                ...t,
                status: "failed",
                error:
                  (e as Error)?.message ||
                  "Something went wrong before the answer finished.",
              },
        );
      } finally {
        if (control.current === ctl) control.current = null;
        setBusy(null);
      }
    };

    const send = (text: string) => {
      if (busy) return;
      const user: Row = {
        id: nextId(),
        role: "user",
        time: clock(),
        turns: [{ text, status: "complete" }],
        at: 0,
      };
      const answer: Row = {
        id: nextId(),
        role: "assistant",
        time: clock(),
        turns: [{ text: "", status: "thinking" }],
        at: 0,
      };
      const history = [...rows.map(flat), flat(user)];
      setRows((rs) => [...rs, user, answer]);
      stick.current = true;
      void run(answer.id, 0, text, history);
    };

    /* Answer the same question again: as a new version, or over a failed one. */
    const again = (row: Row, fresh: boolean) => {
      if (busy) return;
      const i = rows.findIndex((r) => r.id === row.id);
      const question = rows[i - 1];
      if (!question) return;
      const at = fresh ? row.turns.length : row.at;
      setRows((rs) =>
        rs.map((r) =>
          r.id === row.id
            ? {
                ...r,
                feedback: null,
                at,
                turns: fresh
                  ? [...r.turns, { text: "", status: "thinking" }]
                  : r.turns.map((t, k) =>
                      k === at ? { text: "", status: "thinking" } : t,
                    ),
              }
            : r,
        ),
      );
      void run(
        row.id,
        at,
        question.turns[question.at].text,
        rows.slice(0, i).map(flat),
      );
    };

    const reset = () => {
      control.current?.abort();
      setRows([]);
    };

    /* ---- follow the newest text, unless the reader has scrolled away ---- */
    const scroller = React.useRef<HTMLDivElement>(null);
    const content = React.useRef<HTMLDivElement>(null);
    const stick = React.useRef(true);
    const [away, setAway] = React.useState(false);

    React.useEffect(() => {
      const box = scroller.current;
      const inner = content.current;
      if (!box || !inner) return;
      /* A greeting is read from the top. Only a thread is followed down. */
      const none = rows.length === 0;
      const follow = () => {
        if (none) box.scrollTop = 0;
        else if (stick.current) box.scrollTop = box.scrollHeight;
      };
      const ro = new ResizeObserver(follow);
      ro.observe(inner);
      follow();
      return () => ro.disconnect();
    }, [rows.length === 0]);

    /* Leaving is something the reader does, so it is read from what they do:
     the wheel, a finger, the keyboard or the scrollbar moving up. The scroll
     position alone cannot tell — new text moves it down, and text that gets
     shorter (an answer regenerated, a card folding) moves it up, and neither
     of those is the reader. */
    const leave = () => {
      const box = scroller.current;
      if (!box || box.scrollHeight - box.clientHeight <= 0) return;
      stick.current = false;
      setAway(true);
    };
    const touchY = React.useRef(0);
    const dragging = React.useRef(false);
    const top = React.useRef(0);
    const onScroll = () => {
      const box = scroller.current;
      if (!box) return;
      const near = box.scrollHeight - box.scrollTop - box.clientHeight < 48;
      if (near) {
        stick.current = true;
        setAway(false);
      } else if (dragging.current && box.scrollTop < top.current - 1) leave();
      top.current = box.scrollTop;
    };
    const intent = {
      onWheel: (e: React.WheelEvent) => e.deltaY < 0 && leave(),
      onTouchStart: (e: React.TouchEvent) =>
        (touchY.current = e.touches[0]?.clientY ?? 0),
      onTouchMove: (e: React.TouchEvent) =>
        (e.touches[0]?.clientY ?? 0) > touchY.current + 6 && leave(),
      onKeyDown: (e: React.KeyboardEvent) =>
        ["ArrowUp", "PageUp", "Home"].includes(e.key) &&
        e.target === e.currentTarget &&
        leave(),
      /* A press on the scroller itself, not on anything in it, is the scrollbar. */
      onPointerDown: (e: React.PointerEvent) =>
        (dragging.current = e.target === e.currentTarget),
      onPointerUp: () => (dragging.current = false),
    };
    const toLatest = () => {
      const box = scroller.current;
      if (!box) return;
      stick.current = true;
      setAway(false);
      box.scrollTo({
        top: box.scrollHeight,
        behavior: reduce ? "auto" : "smooth",
      });
    };

    const empty = rows.length === 0;
    const last = rows[rows.length - 1];

    return (
      <div
        ref={ref}
        data-state={busy ?? "idle"}
        className={cn(
          "flex h-[560px] w-full flex-col overflow-hidden rounded-[18px] bg-card text-foreground ring-1 ring-border",
          SQUIRCLE,
          className,
        )}
        {...props}
      >
        {header && (
          <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border pr-2 pl-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] leading-tight font-semibold">
                {assistant.name}
              </p>
              <p className="flex items-center gap-1.5 text-[11.5px] leading-tight text-muted-foreground">
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    busy
                      ? "bg-warning-fill motion-safe:animate-pulse"
                      : "bg-success",
                  )}
                />
                <span aria-live="polite">
                  {busy === "submitting"
                    ? "Thinking"
                    : busy === "streaming"
                      ? "Writing"
                      : "Ready"}
                </span>
              </p>
            </div>
            <Tooltip label="New chat">
              <IconButton
                label="New chat"
                size="sm"
                disabled={empty}
                onClick={reset}
              >
                <SquarePen />
              </IconButton>
            </Tooltip>
          </div>
        )}

        <div className="relative min-h-0 flex-1">
          <div
            ref={scroller}
            onScroll={onScroll}
            {...intent}
            className="h-full overflow-y-auto overscroll-contain"
          >
            <div
              ref={content}
              className={cn(
                "mx-auto w-full max-w-[720px] px-4",
                empty ? "grid min-h-full place-items-center py-6" : "py-5",
              )}
            >
              {empty ? (
                <ChatEmptyState
                  title={welcome?.title ?? `Ask ${assistant.name} anything`}
                  description={welcome?.description}
                  capabilities={welcome?.capabilities}
                  starters={welcome?.starters}
                  mark={welcome?.mark}
                  footer={welcome?.footer}
                  onStarter={send}
                />
              ) : (
                <ChatMessageList>
                  {rows.map((r) => {
                    const t = r.turns[r.at];
                    if (r.role === "user") {
                      return (
                        <ChatMessage
                          key={r.id}
                          role="user"
                          time={r.time}
                          avatar={userAvatar}
                          attachments={r.attachments}
                        >
                          {t.text}
                        </ChatMessage>
                      );
                    }
                    const thinking = t.status === "thinking";
                    const writing = t.status === "streaming";
                    return (
                      <ChatMessage
                        key={r.id}
                        role="assistant"
                        name={assistant.name}
                        avatar={assistant.avatar}
                        time={r.time}
                        status={
                          thinking || writing
                            ? "streaming"
                            : (t.status as "complete" | "cancelled" | "failed")
                        }
                        error={t.error}
                        onRetry={() => again(r, false)}
                        sources={t.sources}
                        actions={
                          t.status === "complete" ||
                          (t.status === "cancelled" && t.text) ? (
                            <MessageActions
                              text={t.text}
                              onRegenerate={
                                r.id === last?.id
                                  ? () => again(r, true)
                                  : undefined
                              }
                              feedback={r.feedback ?? null}
                              onFeedbackChange={(v) => {
                                setRows((rs) =>
                                  rs.map((x) =>
                                    x.id === r.id ? { ...x, feedback: v } : x,
                                  ),
                                );
                                onFeedback?.(flat(r), v);
                              }}
                              onReason={(reason) =>
                                onFeedback?.(flat(r), "down", reason)
                              }
                              version={
                                r.turns.length > 1
                                  ? {
                                      index: r.at,
                                      total: r.turns.length,
                                      onChange: (at) =>
                                        setRows((rs) =>
                                          rs.map((x) =>
                                            x.id === r.id ? { ...x, at } : x,
                                          ),
                                        ),
                                    }
                                  : undefined
                              }
                            />
                          ) : undefined
                        }
                      >
                        {thinking ? (
                          <ThinkingState detail={t.detail} />
                        ) : t.text ? (
                          <StreamingResponse
                            key={r.at}
                            text={t.text}
                            streaming={writing}
                          />
                        ) : null}
                      </ChatMessage>
                    );
                  })}
                </ChatMessageList>
              )}
            </div>
          </div>

          <AnimatePresence>
            {away && !empty && (
              <motion.div
                initial={
                  reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }
                }
                transition={SPRING}
                className="absolute bottom-3 left-1/2 -translate-x-1/2"
              >
                <IconButton
                  label="Jump to latest"
                  variant="outline"
                  size="sm"
                  onClick={toLatest}
                  className="rounded-full shadow-float"
                >
                  <ArrowDown />
                </IconButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="shrink-0 px-3 pt-1 pb-2.5">
          <div className="mx-auto w-full max-w-[720px]">
            <PromptInput
              onSubmit={send}
              onStop={() => control.current?.abort()}
              status={busy ?? "idle"}
              placeholder={placeholder ?? `Message ${assistant.name}`}
            />
          </div>
        </div>
      </div>
    );
  },
);

export default AIChat;

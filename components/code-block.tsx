"use client";

import * as React from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const FONT_STACK =
  'var(--font-sans, "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif)';

const SQUIRCLE = "[corner-shape:squircle]";

const TRAY =
  "rounded-[26px] p-1.5 [corner-shape:squircle] bg-[var(--tray,#f0f0f0)] dark:bg-[var(--tray,#0e0e10)]";

const TRAY_CARD =
  "rounded-[20px] [corner-shape:squircle] bg-card ring-1 ring-border shadow-[0_1px_2px_rgb(0_0_0/0.05),0_4px_12px_-6px_rgb(0_0_0/0.08)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.5),0_4px_12px_-6px_rgb(0_0_0/0.5)]";

const FLAT_CARD =
  "overflow-hidden rounded-[22px] [corner-shape:squircle] bg-card ring-1 ring-border shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.4)]";

type Look = "layered" | "flat";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

export interface CodeBlockProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onCopy"> {
  /** The code. Ignored when `tabs` is set. */
  code?: string;
  /** The language, for colouring and the label: "ts", "tsx", "js", "bash", "json", "py", "css", "html". */
  language?: string;
  /** Shown in the header in place of the language. */
  filename?: string;
  /** Numbers down the left. Default true. */
  showLineNumbers?: boolean;
  /** One-based line numbers to mark, e.g. the lines an answer changed. */
  highlightLines?: number[];
  /** Collapse after this many lines, with "Show N more lines". Default 0, never. */
  maxLines?: number;
  /** Break long lines instead of scrolling sideways. Default false. */
  wrap?: boolean;
  /** Several files or package managers, one tab each. */
  tabs?: { label: string; code: string; language?: string }[];
  /** The code is still arriving: draws a caret at the end and keeps the block expanded. */
  streaming?: boolean;
  /** Called with the code after it is copied. */
  onCopy?: (code: string) => void;
  /** Extra buttons in the header, before Copy: "Insert", "Run". */
  actions?: React.ReactNode;
  /** Layered rests the code in a tray with the header in its margin. Flat is one card. Default layered. */
  look?: Look;
}

type Tok = { t: "kw" | "str" | "num" | "com" | "fn" | "tag" | "plain"; v: string };

const KEYWORDS = new Set(
  (
    "const let var function return if else for while do switch case break continue new class extends import from export default " +
    "async await try catch finally throw typeof instanceof in of as interface type enum implements public private protected readonly " +
    "static void null undefined true false this super yield delete keyof satisfies def lambda pass None True False elif with self " +
    "echo export cd sudo npm npx pnpm yarn bun"
  ).split(" "),
);

const HASH_COMMENTS = new Set(["bash", "sh", "shell", "zsh", "py", "python", "yaml", "yml", "toml", "rb", "ruby"]);

function tokenize(line: string, lang: string, state: { block: boolean }): Tok[] {
  const out: Tok[] = [];
  const hash = HASH_COMMENTS.has(lang);
  let i = 0;
  const push = (t: Tok["t"], v: string) => {
    const last = out[out.length - 1];
    if (last && last.t === t) last.v += v;
    else out.push({ t, v });
  };
  while (i < line.length) {
    if (state.block) {
      const end = line.indexOf("*/", i);
      if (end === -1) {
        push("com", line.slice(i));
        return out;
      }
      push("com", line.slice(i, end + 2));
      i = end + 2;
      state.block = false;
      continue;
    }
    const rest = line.slice(i);
    const c = line[i];
    if (!hash && rest.startsWith("/*")) {
      state.block = true;
      push("com", "/*");
      i += 2;
      continue;
    }
    if ((!hash && rest.startsWith("//")) || (hash && c === "#") || (lang === "html" && rest.startsWith("<!--"))) {
      push("com", rest);
      break;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== c) j += line[j] === "\\" ? 2 : 1;
      push("str", line.slice(i, Math.min(j + 1, line.length)));
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) && !/[\w$]/.test(line[i - 1] ?? "")) {
      const m = rest.match(/^(0x[\da-f]+|\d[\d_]*(\.\d+)?(e[+-]?\d+)?)/i)!;
      push("num", m[0]);
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      const m = rest.match(/^[\w$-]*[\w$]|^[\w$]/)!;
      const word = lang === "css" || lang === "html" || lang === "bash" || lang === "sh" ? m[0] : m[0].replace(/-.*/, "");
      const after = line.slice(i + word.length);
      if (line[i - 1] === "<" || line.slice(i - 2, i) === "</") push("tag", word);
      else if (KEYWORDS.has(word)) push("kw", word);
      else if (/^\s*\(/.test(after)) push("fn", word);
      else push("plain", word);
      i += word.length;
      continue;
    }
    push("plain", c);
    i++;
  }
  return out;
}

const COLOR: Record<Tok["t"], string> = {
  kw: "text-foreground font-semibold",
  str: "text-success",
  num: "text-warning",
  com: "text-muted-foreground italic",
  fn: "text-info",
  tag: "text-info",
  plain: "",
};

export const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  {
    code = "",
    language,
    filename,
    showLineNumbers = true,
    highlightLines,
    maxLines = 0,
    wrap = false,
    tabs,
    streaming = false,
    onCopy,
    actions,
    look = "layered",
    className,
    style,
    ...rest
  },
  ref,
) {
  const [tab, setTab] = React.useState(0);
  const [expanded, setExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const tabId = React.useId();

  const current = tabs?.length ? tabs[Math.min(tab, tabs.length - 1)] : { label: filename ?? "", code, language };
  const lang = (current.language ?? language ?? "").toLowerCase();
  const text = current.code.replace(/\n$/, "");
  const lines = React.useMemo(() => text.split("\n"), [text]);
  const coloured = React.useMemo(() => {
    const state = { block: false };
    return lines.map((l) => tokenize(l, lang, state));
  }, [lines, lang]);

  const marked = React.useMemo(() => new Set(highlightLines ?? []), [highlightLines]);
  const collapsible = !streaming && maxLines > 0 && lines.length > maxLines + 2;
  const shown = collapsible && !expanded ? coloured.slice(0, maxLines) : coloured;
  const hiddenCount = lines.length - maxLines;
  const gutter = String(lines.length).length;

  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
    } catch {
    }
    setCopied(true);
    onCopy?.(current.code);
  };

  const tray = look === "layered";
  const LANG_NAME: Record<string, string> = { ts: "TypeScript", tsx: "TSX", js: "JavaScript", jsx: "JSX", bash: "Bash", sh: "Shell", json: "JSON", py: "Python", css: "CSS", html: "HTML" };
  const langName = LANG_NAME[lang] ?? (lang ? lang.toUpperCase() : "Code");

  const header = (
    <div className={cn("flex min-h-10 items-center gap-2", tray ? "px-2 pt-0.5 pb-1.5" : "border-b border-border/70 px-3")}>
      {tabs?.length ? (
        <div role="tablist" aria-label="Files" className="-ml-1 flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              id={`${tabId}-${i}`}
              aria-selected={i === tab}
              tabIndex={i === tab ? 0 : -1}
              onClick={() => setTab(i)}
              onKeyDown={(e) => {
                const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                const n = (tab + d + tabs.length) % tabs.length;
                setTab(n);
                (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)?.focus();
              }}
              className={cn(
                FOCUS,
                "h-7 shrink-0 rounded-[8px] px-2.5 font-mono text-[12px] transition-colors",
                i === tab ? "bg-foreground/[0.07] text-foreground" : "text-muted-foreground hover:text-foreground",
                SQUIRCLE,
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <span className="min-w-0 truncate font-mono text-[12px] text-muted-foreground">{filename ?? langName}</span>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {actions}
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          className={cn(
            FOCUS,
            "grid size-7 place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground",
            SQUIRCLE,
          )}
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        </button>
        <span role="status" className="sr-only">
          {copied ? "Copied" : ""}
        </span>
      </div>
    </div>
  );

  const body = (
    <div className="relative">
      <pre
        tabIndex={0}
        role={tabs?.length ? "tabpanel" : undefined}
        aria-labelledby={tabs?.length ? `${tabId}-${tab}` : undefined}
        aria-label={tabs?.length ? undefined : `${langName} code${filename ? `, ${filename}` : ""}`}
        className={cn(
          "m-0 py-3 font-mono text-[12.5px] leading-[1.7] text-foreground/90 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          wrap ? "whitespace-pre-wrap break-words" : "overflow-x-auto whitespace-pre",
          tray ? "rounded-[20px]" : "",
        )}
      >
        <code className="block min-w-fit">
          {shown.map((toks, i) => (
            <span
              key={i}
              className={cn("flex pr-4", marked.has(i + 1) && "bg-info/[0.08] shadow-[inset_2px_0_0_var(--color-info)]")}
            >
              {showLineNumbers && (
                <span
                  aria-hidden
                  style={{ width: `${gutter + 2.5}ch` }}
                  className={cn("shrink-0 pr-3 text-right tabular-nums select-none", marked.has(i + 1) ? "text-foreground/80" : "text-muted-foreground")}
                >
                  {i + 1}
                </span>
              )}
              <span className={cn("min-w-0 flex-1", !showLineNumbers && "pl-4")}>
                {toks.length ? toks.map((t, j) => (t.t === "plain" ? t.v : <span key={j} className={COLOR[t.t]}>{t.v}</span>)) : "​"}
                {streaming && i === shown.length - 1 && (
                  <span aria-hidden className="ml-px inline-block h-[1.05em] w-[7px] translate-y-[2px] bg-foreground/70 motion-safe:animate-pulse" />
                )}
              </span>
            </span>
          ))}
        </code>
      </pre>
      {collapsible && (
        <div className={cn(!expanded && "absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/90 to-transparent pt-10", "flex justify-center pb-2", expanded && "pt-0")}>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
            className={cn(
              FOCUS,
              "inline-flex h-7 items-center gap-1 rounded-full bg-card px-3 text-[12px] font-medium text-foreground/80 ring-1 ring-border transition-colors hover:text-foreground",
            )}
          >
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Show less" : `Show ${hiddenCount} more line${hiddenCount === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={ref}
      {...rest}
      data-look={look}
      aria-busy={streaming || undefined}
      style={{ fontFamily: FONT_STACK, ...style }}
      className={cn("flex w-full min-w-0 flex-col text-foreground antialiased", tray ? TRAY : FLAT_CARD, className)}
    >
      {header}
      {tray ? <div className={cn(TRAY_CARD, "flex-1 overflow-hidden")}>{body}</div> : body}
    </div>
  );
});

export default CodeBlock;

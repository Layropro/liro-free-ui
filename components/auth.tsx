"use client";

import * as React from "react";
import {
  ArrowLeft,
  Check,
  Circle,
  Eye,
  EyeOff,
  Mail,
  Minus,
  Search,
  X,
} from "lucide-react";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "./button";

/* ==========================================================================
   Local utilities
   ========================================================================== */

const SQUIRCLE = "[corner-shape:squircle]";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const CONTROL = {
  sm: "h-8 rounded-[9px] px-2.5 text-[12.5px]",
  md: "h-9 rounded-[10px] px-3 text-[13px]",
  lg: "h-10 rounded-[11px] px-3.5 text-[13.5px]",
} as const;

type ControlSize = keyof typeof CONTROL;

const FIELD =
  "bg-card text-foreground ring-1 ring-inset ring-input outline-none transition-[box-shadow,background-color] " +
  "placeholder:text-muted-foreground hover:ring-foreground/25 " +
  "focus-visible:ring-2 focus-visible:ring-ring " +
  "aria-invalid:ring-destructive/60 aria-invalid:focus-visible:ring-destructive/50 " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:ring-input";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ==========================================================================
   Auth — sign in, sign up, forgot password, verify code

   The forms every product needs and nobody wants to rebuild. They own the
   state and the validation; you own the network. Each takes an async
   `onSubmit` and shows the error it throws, in words, above the button:

     <AuthCard title="Welcome back" description="Sign in to continue">
       <LoginForm
         providers={[{ id: "google", label: "Continue with Google", icon: <GoogleMark /> }]}
         onProvider={(id) => signInWith(id)}
         onSubmit={({ email, password }) => signIn(email, password)}
         forgotHref="/forgot" signupHref="/signup"
       />
     </AuthCard>

   Provider marks are yours to supply (each brand's official artwork); the
   buttons render whatever `icon` you pass. Autocomplete attributes are set
   so password managers fill and save correctly — username, current-password,
   new-password, one-time-code.
   ========================================================================== */

/* ==========================================================================
   Form primitives used by the auth forms
   ========================================================================== */

/* ------------------------------------------------------------------ field -- */

/* ==========================================================================
   Field and Label

   The wiring every form control needs and most forms get wrong: the label
   points at the control, the hint and the error are announced with it, and an
   error marks the control invalid. Field does all three through context, so a
   control inside it needs no ids:

     <Field label="Work email" hint="We send the receipt here" error={err}>
       <Input type="email" />
     </Field>

   The error replaces the hint rather than stacking under it — two lines of
   grey-and-red text under one input is where people stop reading.
   ========================================================================== */

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        "text-[12.5px] leading-none font-medium text-foreground select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

/**
 * The props a control inside a Field should carry. Every Liro control calls
 * this; call it too if you put your own control in a Field.
 */
function useFieldProps<
  T extends {
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: unknown;
    required?: boolean;
  },
>(props: T): T {
  const field = React.useContext(FieldContext);
  if (!field) return props;
  return {
    ...props,
    id: props.id ?? field.id,
    "aria-describedby":
      [field.describedBy, props["aria-describedby"]]
        .filter(Boolean)
        .join(" ") || undefined,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
    required: props.required ?? (field.required || undefined),
  };
}

interface FieldProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  label: React.ReactNode;
  /** One line under the control. Replaced by `error` when there is one. */
  hint?: React.ReactNode;
  /** Marks the control invalid and is announced with it. */
  error?: React.ReactNode;
  /** Adds "Optional" beside the label; the rarer case gets the mark. */
  optional?: boolean;
  required?: boolean;
  /** Put the label beside the control instead of above — for checkboxes and switches. */
  inline?: boolean;
  children: React.ReactNode;
}

function Field({
  label,
  hint,
  error,
  optional,
  required = false,
  inline = false,
  className,
  children,
  ...rest
}: FieldProps) {
  const id = React.useId();
  const msgId = `${id}-msg`;
  const message = error ?? hint;
  const value = React.useMemo<FieldContextValue>(
    () => ({
      id,
      describedBy: message ? msgId : undefined,
      invalid: Boolean(error),
      required,
    }),
    [id, msgId, message, error, required],
  );

  const labelEl = (
    <Label htmlFor={id} className="flex items-center gap-1.5">
      {label}
      {optional && (
        <span className="font-normal text-muted-foreground">Optional</span>
      )}
    </Label>
  );

  return (
    <FieldContext.Provider value={value}>
      {inline ? (
        /* Two columns: the control, then the label with its hint under it.
           The hint starts where the label starts, whatever the control's
           width: a checkbox, a switch or a large switch. */
        <div
          className={cn(
            "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1",
            className,
          )}
          {...rest}
        >
          {children}
          {labelEl}
          {message && (
            <p
              id={msgId}
              className={cn(
                "col-start-2 text-[12px] leading-snug",
                error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {message}
            </p>
          )}
        </div>
      ) : (
        <div className={cn("grid gap-1.5", className)} {...rest}>
          {labelEl}
          {children}
          {message && (
            <p
              id={msgId}
              className={cn(
                "text-[12px] leading-snug",
                error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {message}
            </p>
          )}
        </div>
      )}
    </FieldContext.Provider>
  );
}

/* ------------------------------------------------------------------ input -- */

/* ==========================================================================
   Input

   A text field, plus the three that differ in behaviour rather than looks:

     <Input />                 any text type — email, url, number, tel…
     <PasswordInput />         reveal toggle, and it says what it will do
     <SearchInput />           leading search icon, clear button, Escape clears

   Adornments (`leading`, `trailing`) sit inside the ring, so an icon or a unit
   ("USD", "%", ".com") reads as part of the field rather than stuck to it.
   Clicking an adornment focuses the input — the whole well is the target.
   ========================================================================== */

interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  /** Matches Button and Select of the same size. Default `md`. */
  size?: ControlSize;
  /** Inside the well, before the text: an icon or a prefix like "$". */
  leading?: React.ReactNode;
  /** Inside the well, after the text: a unit, a shortcut hint, a button. */
  trailing?: React.ReactNode;
  /** Classes for the well when adornments are used; `className` goes on the input. */
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = "md",
    leading,
    trailing,
    className,
    wrapperClassName,
    type = "text",
    ...props
  },
  ref,
) {
  const fieldProps = useFieldProps(props);
  const inner = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => inner.current as HTMLInputElement);

  if (!leading && !trailing) {
    return (
      <input
        ref={inner}
        type={type}
        className={cn(
          "w-full min-w-0",
          CONTROL[size],
          FIELD,
          SQUIRCLE,
          "file:mr-2 file:border-0 file:bg-transparent file:font-medium",
          className,
        )}
        {...fieldProps}
      />
    );
  }

  /* With adornments the ring moves to the wrapper, and follows the input's
     state through :has() — hover, focus-visible, invalid and disabled. */
  return (
    <div
      onPointerDown={(e) => {
        if (
          e.target !== inner.current &&
          !(e.target as HTMLElement).closest("button")
        ) {
          e.preventDefault();
          inner.current?.focus();
        }
      }}
      className={cn(
        "flex w-full min-w-0 cursor-text items-center gap-2 bg-card text-foreground ring-1 ring-inset ring-input transition-[box-shadow]",
        "hover:ring-foreground/25 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring",
        "has-[input[aria-invalid=true]]:ring-destructive/60 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        CONTROL[size],
        SQUIRCLE,
        wrapperClassName,
      )}
    >
      {leading && (
        <span className="flex shrink-0 items-center text-muted-foreground">
          {leading}
        </span>
      )}
      <input
        ref={inner}
        type={type}
        className={cn(
          "h-full w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
          className,
        )}
        {...fieldProps}
      />
      {trailing && (
        <span className="flex shrink-0 items-center text-muted-foreground">
          {trailing}
        </span>
      )}
    </div>
  );
});

/* ------------------------------------------------------------ password -- */

interface PasswordInputProps extends Omit<InputProps, "type" | "trailing"> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const [shown, setShown] = React.useState(false);
    return (
      <Input
        ref={ref}
        type={shown ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
        trailing={
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="-mr-1 grid size-6 cursor-pointer place-items-center rounded-[6px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {shown ? <EyeOff /> : <Eye />}
          </button>
        }
        {...props}
      />
    );
  },
);

/* -------------------------------------------------------------- search -- */

interface SearchInputProps extends Omit<
  InputProps,
  "type" | "leading" | "value" | "defaultValue" | "onChange"
> {
  value?: string;
  defaultValue?: string;
  /** Called with the text on every keystroke, and with "" when cleared. */
  onValueChange?: (value: string) => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      defaultValue = "",
      onValueChange,
      onKeyDown,
      placeholder = "Search",
      ...props
    },
    ref,
  ) {
    const [inner, setInner] = React.useState(defaultValue);
    const current = value ?? inner;
    const set = (v: string) => {
      if (value === undefined) setInner(v);
      onValueChange?.(v);
    };
    const local = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => local.current as HTMLInputElement);

    return (
      <Input
        ref={local}
        type="search"
        role="searchbox"
        placeholder={placeholder}
        value={current}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && current) {
            e.preventDefault();
            set("");
          }
          onKeyDown?.(e);
        }}
        leading={<Search />}
        trailing={
          current ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                set("");
                local.current?.focus();
              }}
              className="-mr-1 grid size-6 cursor-pointer place-items-center rounded-[6px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X />
            </button>
          ) : undefined
        }
        className="[&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
    );
  },
);

/* ------------------------------------------------------------------ checkbox -- */

/* ==========================================================================
   Checkbox

   On, off, or indeterminate — the third state is for a "select all" whose
   children disagree, and it is a state the box reports, not one a person can
   click into. Clicking an indeterminate box turns everything on.

   A checkbox commits nothing on its own. If toggling it acts immediately
   ("Email me when…"), that is a Switch.
   ========================================================================== */

interface CheckboxProps extends React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> {}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(function Checkbox({ className, ...props }, ref) {
  const fieldProps = useFieldProps(props);
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer grid size-4 shrink-0 cursor-pointer place-items-center rounded-[5px] bg-card ring-1 ring-inset ring-input transition-colors",
        "hover:ring-foreground/35",
        "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:ring-primary",
        "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:ring-primary",
        "aria-invalid:ring-destructive/70 disabled:cursor-not-allowed disabled:opacity-50",
        FOCUS,
        "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...fieldProps}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center">
        {fieldProps.checked === "indeterminate" ? (
          <Minus className="size-3" strokeWidth={3} aria-hidden />
        ) : (
          <Check className="size-3" strokeWidth={3} aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

/* ------------------------------------------------------------------ otp input -- */

/* ==========================================================================
   OTP Input

   The six boxes for a one-time code. It is one real input underneath
   (input-otp), which is what makes the details work: paste the whole code
   into any box, the phone offers the code from the SMS (autocomplete
   "one-time-code"), Backspace walks back, and a password manager can fill it.

     <OtpInput length={6} onComplete={(code) => verify(code)} />

   `onComplete` fires once all boxes are filled, so there is no Verify button
   to find. Boxes group in threes for six digits — "123 456" is how people
   read a code back.
   ========================================================================== */

function OtpSlot({
  char,
  hasFakeCaret,
  isActive,
  invalid,
}: SlotProps & { invalid?: boolean }) {
  return (
    <div
      className={cn(
        "relative grid aspect-square min-w-0 max-w-11 flex-1 place-items-center rounded-[10px] bg-card text-[16px] font-semibold tabular-nums ring-1 ring-inset ring-input transition-shadow",
        isActive && "ring-2 ring-ring",
        invalid && "ring-destructive/60",
        SQUIRCLE,
      )}
    >
      {char}
      {hasFakeCaret && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <span className="h-5 w-px bg-foreground motion-safe:animate-pulse" />
        </span>
      )}
    </div>
  );
}

interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  /** Digits only (default) or letters and digits. */
  alphanumeric?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  alphanumeric = false,
  disabled,
  autoFocus,
  className,
  ...aria
}: OtpInputProps) {
  const fieldProps = useFieldProps(aria);
  const [inner, setInner] = React.useState("");
  const v = value ?? inner;
  const invalid = fieldProps["aria-invalid"] === true;
  const split = length === 6 ? 3 : length === 8 ? 4 : 0;

  return (
    <OTPInput
      maxLength={length}
      value={v}
      onChange={(next: string) => {
        if (value === undefined) setInner(next);
        onChange?.(next);
      }}
      onComplete={onComplete}
      pattern={alphanumeric ? undefined : REGEXP_ONLY_DIGITS}
      inputMode={alphanumeric ? "text" : "numeric"}
      autoComplete="one-time-code"
      disabled={disabled}
      autoFocus={autoFocus}
      containerClassName={cn(
        "flex w-full max-w-[320px] items-center justify-center gap-1.5 sm:gap-2 has-[:disabled]:opacity-50",
        className,
      )}
      {...fieldProps}
      aria-label={
        fieldProps["aria-label"] ??
        (fieldProps.id ? undefined : `${length}-digit code`)
      }
      render={({ slots }) => (
        <>
          {slots.map((slot, i) => (
            <React.Fragment key={i}>
              {split > 0 && i === split && (
                <span
                  aria-hidden
                  className="h-0.5 w-2 shrink-0 rounded-full bg-border"
                />
              )}
              <OtpSlot {...slot} invalid={invalid} />
            </React.Fragment>
          ))}
        </>
      )}
    />
  );
}

/* ------------------------------------------------------------------ password strength -- */

/* ==========================================================================
   Password Strength

   A four-step meter and the rules behind it, under a new-password field. It
   judges length first — a long passphrase beats a short password full of
   symbols — and it says what to do next in words ("Add 4 more characters"),
   not only in colour.

     <Field label="Password"><PasswordInput value={pw} onChange={…} autoComplete="new-password" /></Field>
     <PasswordStrength value={pw} />

   The estimate is deliberately simple and local; nothing is sent anywhere.
   For a real breach check, call your backend and pass `compromised`.
   ========================================================================== */

interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}

const DEFAULT_RULES: PasswordRule[] = [
  { label: "At least 12 characters", test: (v) => v.length >= 12 },
  {
    label: "Upper and lower case",
    test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  },
  { label: "A number or a symbol", test: (v) => /[\d\W_]/.test(v) },
];

/** 0–4. Length carries most of the weight. */
function scorePassword(v: string): number {
  if (!v) return 0;
  let s = 0;
  if (v.length >= 8) s++;
  if (v.length >= 12) s++;
  if (v.length >= 16) s++;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(v),
  ).length;
  if (kinds >= 3) s++;
  if (/^(.)\1+$/.test(v) || /^(password|qwerty|123456|letmein)/i.test(v))
    s = Math.min(s, 1);
  return Math.min(4, s);
}

const WORDS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const TONE = [
  "bg-destructive",
  "bg-destructive",
  "bg-warning-fill",
  "bg-success",
  "bg-success",
];

interface PasswordStrengthProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  rules?: PasswordRule[];
  /** Set true when your backend reports the password in a known breach. */
  compromised?: boolean;
}

function PasswordStrength({
  value,
  rules = DEFAULT_RULES,
  compromised = false,
  className,
  ...rest
}: PasswordStrengthProps) {
  const score = compromised ? 0 : scorePassword(value);
  const passed = rules.map((r) => r.test(value));
  const missing = 12 - value.length;
  const next = compromised
    ? "This password has appeared in a data breach — choose another."
    : value.length === 0
      ? null
      : missing > 0
        ? `Add ${missing} more character${missing === 1 ? "" : "s"}.`
        : passed.every(Boolean)
          ? null
          : `Also: ${rules[passed.indexOf(false)].label.toLowerCase()}.`;

  return (
    <div className={cn("grid gap-2", className)} {...rest}>
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full bg-foreground/10 transition-colors duration-200",
                value && i <= Math.max(score, 1) && TONE[score],
              )}
            />
          ))}
        </div>
        <span
          className="w-16 text-right text-[11.5px] font-medium text-muted-foreground"
          aria-live="polite"
        >
          {value ? (
            <>
              <span className="sr-only">Password strength: </span>
              {WORDS[score]}
            </>
          ) : null}
        </span>
      </div>
      <ul className="grid gap-1">
        {rules.map((r, i) => (
          <li
            key={r.label}
            className={cn(
              "flex items-center gap-1.5 text-[12px]",
              passed[i] ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {passed[i] ? (
              <Check className="size-3.5 text-success" aria-hidden />
            ) : (
              <Circle className="size-3 opacity-50" aria-hidden />
            )}
            {r.label}
            <span className="sr-only">
              {passed[i] ? " — done" : " — not yet"}
            </span>
          </li>
        ))}
      </ul>
      {next && (
        <p
          className={cn(
            "text-[12px]",
            compromised ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {next}
        </p>
      )}
    </div>
  );
}

/* ==========================================================================
   Auth forms
   ========================================================================== */

export function AuthCard({
  title,
  description,
  logo,
  footer,
  level = 1,
  className,
  children,
}: {
  title: React.ReactNode;
  /** Heading level of the title. 1 on a sign-in page; lower it when the card sits inside a page that has its own h1. */
  level?: 1 | 2 | 3;
  description?: React.ReactNode;
  logo?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-[400px] rounded-[20px] bg-card p-5 text-card-foreground shadow-float ring-1 ring-border sm:p-8",
        SQUIRCLE,
        className,
      )}
    >
      {logo && <div className="mb-5 flex justify-center">{logo}</div>}
      <div className="mb-6 grid gap-1.5 text-center">
        {React.createElement(
          `h${level}`,
          { className: "text-[20px] font-semibold tracking-[-0.02em]" },
          title,
        )}
        {description && (
          <p className="text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
      {footer && (
        <div className="mt-6 text-center text-[12px] leading-relaxed text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

export interface AuthProvider {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

function useSubmit<T>(fn: (v: T) => void | Promise<void>) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const run = async (v: T) => {
    setError(null);
    setBusy(true);
    try {
      await fn(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-[10px] bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive"
    >
      {message}
    </p>
  );
}

function Providers({
  providers,
  onProvider,
  disabled,
}: {
  providers?: AuthProvider[];
  onProvider?: (id: string) => void;
  disabled?: boolean;
}) {
  if (!providers?.length) return null;
  return (
    <>
      <div className="grid gap-2">
        {providers.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant="outline"
            size="lg"
            disabled={disabled}
            onClick={() => onProvider?.(p.id)}
            className="w-full"
          >
            {p.icon && (
              <span className="flex [&_img]:size-4 [&_svg]:size-4">
                {p.icon}
              </span>
            )}
            {p.label}
          </Button>
        ))}
      </div>
      <div
        className="my-5 flex items-center gap-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
        aria-hidden
      >
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

const LINK =
  "font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground";

/* ----------------------------------------------------------------- login -- */

export interface LoginFormProps {
  onSubmit: (v: {
    email: string;
    password: string;
    remember: boolean;
  }) => void | Promise<void>;
  providers?: AuthProvider[];
  onProvider?: (id: string) => void;
  forgotHref?: string;
  signupHref?: string;
  /** Email-only magic link: hides the password field. */
  passwordless?: boolean;
  defaultEmail?: string;
}

export function LoginForm({
  onSubmit,
  providers,
  onProvider,
  forgotHref,
  signupHref,
  passwordless = false,
  defaultEmail = "",
}: LoginFormProps) {
  const [email, setEmail] = React.useState(defaultEmail);
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const { busy, error, run } = useSubmit(onSubmit);

  return (
    <div>
      <Providers
        providers={providers}
        onProvider={onProvider}
        disabled={busy}
      />
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          run({ email: email.trim(), password, remember });
        }}
      >
        <Field label="Email">
          <Input
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </Field>
        {!passwordless && (
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-[12.5px] font-medium"
              >
                Password
              </label>
              {forgotHref && (
                <a href={forgotHref} className={cn("text-[12px]", LINK)}>
                  Forgot password?
                </a>
              )}
            </div>
            <PasswordInput
              id="login-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        {!passwordless && (
          <Field label="Keep me signed in" inline>
            <Checkbox
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
            />
          </Field>
        )}
        <FormError message={error} />
        <Button type="submit" size="lg" loading={busy} className="w-full">
          {passwordless ? (
            <>
              <Mail /> Email me a sign-in link
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
      {signupHref && (
        <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
          New here?{" "}
          <a href={signupHref} className={LINK}>
            Create an account
          </a>
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- signup -- */

export interface SignupFormProps {
  onSubmit: (v: {
    name: string;
    email: string;
    password: string;
  }) => void | Promise<void>;
  providers?: AuthProvider[];
  onProvider?: (id: string) => void;
  loginHref?: string;
  termsHref?: string;
  privacyHref?: string;
}

export function SignupForm({
  onSubmit,
  providers,
  onProvider,
  loginHref,
  termsHref,
  privacyHref,
}: SignupFormProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const { busy, error, run } = useSubmit(onSubmit);
  const weak = scorePassword(password) < 3;

  return (
    <div>
      <Providers
        providers={providers}
        onProvider={onProvider}
        disabled={busy}
      />
      <form
        className="grid gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (
            !name.trim() ||
            !/\S+@\S+\.\S+/.test(email) ||
            weak ||
            (termsHref && !agreed)
          )
            return;
          run({ name: name.trim(), email: email.trim(), password });
        }}
      >
        <Field
          label="Full name"
          error={tried && !name.trim() ? "Enter your name" : undefined}
        >
          <Input
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          label="Work email"
          error={
            tried && !/\S+@\S+\.\S+/.test(email)
              ? "Enter an email like you@company.com"
              : undefined
          }
        >
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <div className="grid gap-2">
          <Field
            label="Password"
            error={tried && weak ? "Choose a stronger password" : undefined}
          >
            <PasswordInput
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <PasswordStrength value={password} />
        </div>
        {termsHref && (
          <Field
            inline
            error={
              tried && !agreed ? "Agree to the terms to continue" : undefined
            }
            label={
              <span className="font-normal text-muted-foreground">
                I agree to the{" "}
                <a href={termsHref} className={LINK}>
                  Terms
                </a>
                {privacyHref && (
                  <>
                    {" "}
                    and{" "}
                    <a href={privacyHref} className={LINK}>
                      Privacy Policy
                    </a>
                  </>
                )}
              </span>
            }
          >
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
            />
          </Field>
        )}
        <FormError message={error} />
        <Button type="submit" size="lg" loading={busy} className="w-full">
          Create account
        </Button>
      </form>
      {loginHref && (
        <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
          Already have an account?{" "}
          <a href={loginHref} className={LINK}>
            Sign in
          </a>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------- forgot password -- */

export function ForgotPasswordForm({
  onSubmit,
  backHref,
}: {
  onSubmit: (v: { email: string }) => void | Promise<void>;
  backHref?: string;
}) {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const { busy, error, run } = useSubmit(async (v: { email: string }) => {
    await onSubmit(v);
    setSent(true);
  });

  return (
    <div className="grid gap-4">
      {sent ? (
        <div
          role="status"
          className="grid gap-2 rounded-[12px] bg-muted/60 p-4 text-center"
        >
          <Mail className="mx-auto size-5 text-muted-foreground" aria-hidden />
          <p className="text-[13px] font-medium">Check your inbox</p>
          <p className="text-[12.5px] text-muted-foreground">
            If an account exists for{" "}
            <span className="text-foreground">{email}</span>, a reset link is on
            its way. It expires in 30 minutes.
          </p>
        </div>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run({ email: email.trim() });
          }}
        >
          <Field label="Email" hint="We'll send a link to reset your password">
            <Input
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <FormError message={error} />
          <Button type="submit" size="lg" loading={busy} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
      {backHref && (
        <a
          href={backHref}
          className="mx-auto inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Back to sign in
        </a>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- verify code -- */

export interface VerifyCodeFormProps {
  /** Where the code went, shown in the copy: "maya@northwind.studio". */
  destination: string;
  length?: number;
  onVerify: (code: string) => void | Promise<void>;
  onResend?: () => void | Promise<void>;
  /** Seconds before Resend is offered again. Default 30. */
  cooldown?: number;
  /** Focus the first box on mount. Default true — this is usually its own screen. */
  autoFocus?: boolean;
}

export function VerifyCodeForm({
  destination,
  length = 6,
  onVerify,
  onResend,
  cooldown = 30,
  autoFocus = true,
}: VerifyCodeFormProps) {
  const [code, setCode] = React.useState("");
  const [left, setLeft] = React.useState(cooldown);
  const { busy, error, run, setError } = useSubmit(onVerify);

  React.useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <form
      className="grid w-full justify-items-center gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === length) run(code);
      }}
    >
      <p className="text-center text-[12.5px] text-muted-foreground [overflow-wrap:anywhere]">
        Enter the {length}-digit code sent to{" "}
        <span className="font-medium text-foreground">{destination}</span>
      </p>
      <OtpInput
        length={length}
        value={code}
        aria-label="Verification code"
        aria-invalid={error ? true : undefined}
        onChange={(v) => {
          setCode(v);
          if (error) setError(null);
        }}
        onComplete={(v) => run(v)}
        autoFocus={autoFocus}
      />
      <FormError message={error} />
      <Button
        type="submit"
        size="lg"
        loading={busy}
        disabled={code.length < length}
        className="w-full"
      >
        Verify
      </Button>
      {onResend && (
        <p className="text-[12.5px] text-muted-foreground" aria-live="polite">
          {left > 0 ? (
            <>Resend a code in {left}s</>
          ) : (
            <button
              type="button"
              className={cn("cursor-pointer", LINK)}
              onClick={async () => {
                await onResend();
                setLeft(cooldown);
              }}
            >
              Resend code
            </button>
          )}
        </p>
      )}
    </form>
  );
}

export default LoginForm;

# Liro Free UI

Production-ready React and Tailwind UI components for AI applications, dashboards, SaaS products, and modern web applications.

[![Liro](https://img.shields.io/badge/Liro-UI%20Components-11BF58)](https://liro.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18%20%7C%2019-61DAFB)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38BDF8)](https://tailwindcss.com)

## What is Liro?

Liro was called Layro until November 2026. The old address `layropro.com` keeps working.

Liro is a React and Tailwind UI library built for developers creating modern products with AI coding tools.

Instead of starting every product screen from scratch, Liro provides production-ready components designed around real product workflows, states, accessibility, and responsive behavior.

Explore the full library:

https://liro.dev/components

## Free components

This repository contains 15 free Liro components. Each one is a single file you can copy into your project.

### AI UI

| Component | What it does | Source | Live demo |
|---|---|---|---|
| AI Chat | A complete chat window: welcome screen, streaming answers, thinking state, actions and input | [`ai-chat.tsx`](components/ai-chat.tsx) | [Demo](https://liro.dev/components/ai-chat) |
| Chat Message | User and assistant messages with sources, attachments and error states | [`chat-message.tsx`](components/chat-message.tsx) | [Demo](https://liro.dev/components/chat-message) |
| Streaming Response | Markdown that renders cleanly while tokens are still arriving | [`streaming-response.tsx`](components/streaming-response.tsx) | [Demo](https://liro.dev/components/streaming-response) |
| Thinking State | What the model is doing before the first word, with steps and elapsed time | [`thinking-state.tsx`](components/thinking-state.tsx) | [Demo](https://liro.dev/components/thinking-state) |
| Message Actions | Copy, regenerate, feedback and answer versions under a reply | [`message-actions.tsx`](components/message-actions.tsx) | [Demo](https://liro.dev/components/message-actions) |
| Prompt Input | Auto-growing prompt box with send, stop and tool buttons | [`prompt-input.tsx`](components/prompt-input.tsx) | [Demo](https://liro.dev/components/prompt-input) |
| Code Block | Highlighted code with a file header, copy, tabs, and long blocks that fold | [`code-block.tsx`](components/code-block.tsx) | [Demo](https://liro.dev/components/code-block) |

### Dashboard & SaaS UI

| Component | What it does | Source | Live demo |
|---|---|---|---|
| Data Table | TanStack Table with sorting, filtering, selection, column visibility and pagination | [`data-table.tsx`](components/data-table.tsx) | [Demo](https://liro.dev/components/data-table) |
| Charts | Recharts area, bar, donut, sparkline and KPI cards with an accessible data fallback | [`chart.tsx`](components/chart.tsx) | [Demo](https://liro.dev/components/chart) |
| Usage Meter | Usage projected from today's run rate, with the day you cross and what it costs | [`usage-meter.tsx`](components/usage-meter.tsx) | [Demo](https://liro.dev/components/usage-meter) |

### Essential UI

| Component | What it does | Source | Live demo |
|---|---|---|---|
| File Upload | Drag and drop, paste, progress with time left, retry, URL import and previews | [`file-upload.tsx`](components/file-upload.tsx) | [Demo](https://liro.dev/components/file-upload) |
| Button | Variants, sizes, loading state and icon buttons | [`button.tsx`](components/button.tsx) | [Demo](https://liro.dev/components/button) |
| Command Menu | A ⌘K command palette built on cmdk | [`command.tsx`](components/command.tsx) | [Demo](https://liro.dev/components/command) |
| Dialog | Accessible dialogs plus a confirm dialog with type-to-confirm | [`dialog.tsx`](components/dialog.tsx) | [Demo](https://liro.dev/components/dialog) |
| Auth Forms | Sign in, sign up, forgot password and one-time code forms | [`auth.tsx`](components/auth.tsx) | [Demo](https://liro.dev/components/auth) |

## Getting started

### Install with the shadcn CLI

If your project already uses [shadcn/ui](https://ui.shadcn.com), add any component by URL:

```bash
npx shadcn@latest add https://raw.githubusercontent.com/Layropro/liro-free-ui/main/r/ai-chat.json
```

Swap `ai-chat` for any file name in the tables above (`button`, `data-table`, `chart`, `file-upload` and so on). The CLI installs the npm packages, adds the success, warning and info colours and the animations to your global CSS, and copies the file into `components/liro/` along with any Liro components it uses. That folder keeps them apart from your shadcn/ui `components/ui/button.tsx`, so nothing gets overwritten.

Installed a component before the rename? It lives in `components/layro/` and keeps working; new installs go to `components/liro/`.

### Or copy the files

Each component is a single self-contained `.tsx` file. Copy the ones you want into one folder in your project (for example `components/liro/`). Chat Message, Prompt Input, Streaming Response, Message Actions, Data Table, Dialog and Auth Forms import `./button`, so copy `button.tsx` next to them. AI Chat is built from the other AI components, so copy it together with `button.tsx`, `chat-message.tsx`, `streaming-response.tsx`, `thinking-state.tsx`, `message-actions.tsx` and `prompt-input.tsx`.

#### 1. Install the dependencies

Every component needs React 18 or 19 and Tailwind CSS v4. Most also use:

```bash
npm i clsx tailwind-merge lucide-react framer-motion
```

A few need one more package:

| Component | Extra packages |
|---|---|
| Button | `@radix-ui/react-slot` |
| AI Chat | `@radix-ui/react-tooltip` |
| Charts | `recharts` |
| Data Table | `@tanstack/react-table` |
| Command Menu | `cmdk @radix-ui/react-dialog` |
| Dialog | `@radix-ui/react-dialog` |
| Auth Forms | `@radix-ui/react-checkbox @radix-ui/react-label input-otp` |

#### 2. Add the theme

The components use the standard shadcn/ui colour variables (`background`, `card`, `foreground`, `muted`, `primary`, `border`, `ring`, `destructive`, `chart-1` to `chart-5`), so an existing shadcn/ui theme already covers most of them.

Copy [`styles/liro-free.css`](styles/liro-free.css) into your project and import it after Tailwind. It adds the success, warning and info colours, two shadows, and the animations for dialogs, menus and the AI components:

```css
@import "tailwindcss";
@import "./styles/liro-free.css";
```

Light and dark mode follow the `.dark` class, the same as shadcn/ui.

## Quick example

```tsx
"use client";

import { AIChat } from "@/components/liro/ai-chat";

export default function Page() {
  return (
    <AIChat
      assistant={{ name: "Assistant" }}
      welcome={{ title: "How can I help?", starters: ["Summarise this week's sales"] }}
      // Omit onSend to try it with the built-in simulator.
      onSend={async function* ({ messages, signal }) {
        const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ messages }), signal });
        const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;
          yield value;
        }
      }}
    />
  );
}
```

## Why Liro?

Liro components are designed around real product requirements rather than isolated visual examples.

Components include practical states and interactions such as:

- Loading and empty states
- Error and validation states
- Responsive behavior
- Keyboard interactions
- Accessible patterns
- Light and dark interfaces
- Real product workflows

The goal is simple: help developers move from an idea to a working product faster.

## React + Tailwind

Liro is built for modern React applications and uses Tailwind CSS for styling.

The components are designed to work well in:

- AI applications
- SaaS products
- Admin dashboards
- Analytics products
- Developer tools
- Internal tools
- Modern web applications

## Explore more

**Liro UI Components**  
https://liro.dev/components

**AI UI Components**  
https://liro.dev/ai-ui-components

**React Dashboard Components**  
https://liro.dev/react-dashboard-ui

**React & Next.js Templates**  
https://liro.dev/templates

**Documentation**  
https://liro.dev/docs

**Liro**  
https://liro.dev

## About this repository

This repository contains the free portion of the Liro UI library.

The full Liro library includes additional production-ready components, collections, and complete React & Next.js templates.

Visit https://liro.dev to explore the complete library.

The `r/` folder is the shadcn registry, generated from `registry.json`. After changing a component, rebuild it with `npx shadcn@latest build -o r`.

---

Built by [Liro](https://liro.dev).

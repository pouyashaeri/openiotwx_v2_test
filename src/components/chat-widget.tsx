import { useNavigate, useRouterState } from "@tanstack/react-router";
import { MessageCircle, RotateCcw, Send, Settings, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DEFAULT_CONFIG, loadConfig, saveConfig } from "@/lib/chat/config";
import {
  allIds,
  applySelection,
  handleUserMessage,
  initialState,
  openingTurn,
  summarize,
  type ChatState,
} from "@/lib/chat/engine";
import { createExtractor, probe, type ChatConfig } from "@/lib/chat/llm";
import type { FieldSpec } from "@/lib/chat/spec";
import { useDraft } from "@/lib/wizard/store";
import { cn } from "@/lib/utils";

type Message = { id: number; role: "bot" | "user"; text: string };
type Status = "checking" | "model" | "simple";

const OLLAMA_HELP = `1. Install Ollama from ollama.com
2. In a terminal: ollama pull qwen2.5:3b
3. Let this site talk to it (PowerShell, once):
   setx OLLAMA_ORIGINS "http://localhost:8080,http://127.0.0.1:8080,https://pouyashaeri.github.io"
4. Quit Ollama from the tray and start it again.`;

export function ChatWidget() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const hasDraft = useDraft((state) => state.hydrated && Boolean(state.answers.intent));

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<ChatState>(initialState);
  const [asking, setAsking] = useState<FieldSpec | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Choices ticked on a list question, before Send is pressed.
  const [picked, setPicked] = useState<string[]>([]);
  const [typedId, setTypedId] = useState<number | null>(null);
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<Status>("checking");
  const [statusNote, setStatusNote] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const modelDown = useRef(false);
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = useCallback((role: Message["role"], text: string) => {
    const id = nextId.current++;
    setMessages((list) => [...list, { id, role, text }]);
    return id;
  }, []);

  const checkModel = useCallback(async (cfg: ChatConfig) => {
    setStatus("checking");
    const result = await probe(cfg);
    modelDown.current = !result.ok;
    if (!result.ok) {
      setStatus("simple");
      setStatusNote(result.error ?? "");
    } else if (
      result.models.length &&
      !result.models.some((id) => id === cfg.model || id.startsWith(`${cfg.model}:`))
    ) {
      modelDown.current = true;
      setStatus("simple");
      setStatusNote(`The server is running, but it does not have the model "${cfg.model}" yet.`);
    } else {
      setStatus("model");
      setStatusNote("");
    }
  }, []);

  const start = useCallback(() => {
    const turn = openingTurn();
    nextId.current = 1;
    setChat(turn.state);
    setAsking(turn.asking);
    setTypedId(null);
    setMessages([{ id: nextId.current++, role: "bot", text: turn.reply }]);
  }, []);

  // First open: load the saved settings, say hello, and look for a model in the background.
  useEffect(() => {
    if (!open || messages.length > 0) return;
    const cfg = loadConfig();
    setConfig(cfg);
    start();
    void checkModel(cfg);
  }, [open, messages.length, start, checkModel]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, busy]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, typedId, showSettings, picked.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const extractor = useMemo(
    () =>
      createExtractor(config, (reason) => {
        modelDown.current = true;
        setStatus("simple");
        setStatusNote(reason);
      }),
    [config],
  );

  const askingKey = asking?.key ?? null;
  useEffect(() => {
    setPicked([]);
  }, [askingKey]);

  const lastBot = [...messages].reverse().find((m) => m.role === "bot");
  const typingDone = lastBot ? typedId === lastBot.id : true;

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    push("user", text);
    setBusy(true);
    const turn = await handleUserMessage(chat, text, modelDown.current ? undefined : extractor);
    setChat(turn.state);
    setAsking(turn.asking);
    setBusy(false);
    push("bot", turn.reply);
  }

  /** Several ticked choices sent as one answer. */
  function sendPicked() {
    if (!asking || picked.length === 0 || busy) return;
    const everything = allIds(asking.key);
    const all = picked.length === everything.length;
    const titles = asking.options
      .filter((option) => picked.includes(String(option.id)))
      .map((option) => option.title);
    push("user", all ? "All of them" : titles.join(", "));
    setBusy(true);
    const turn = applySelection(chat, asking.key, picked);
    setChat(turn.state);
    setAsking(turn.asking);
    setBusy(false);
    push("bot", turn.reply);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  function writePlan() {
    const draft = useDraft.getState();
    draft.reset();
    const { answers, siteName } = chat;
    if (answers.intent) draft.setIntent(answers.intent);
    draft.patchAnswers(answers);
    draft.setSiteName(siteName.trim());
    draft.setStep("review");
    setOpen(false);
    toast.success("Draft plan written from our chat");
    void navigate({ to: "/plan" });
  }

  async function saveSettings(next: ChatConfig) {
    const clean = {
      ...next,
      endpoint: next.endpoint.trim().replace(/\/+$/, ""),
      model: next.model.trim(),
    };
    setConfig(clean);
    saveConfig(clean);
    await checkModel(clean);
  }

  const rows = summarize(chat);
  const done = asking === null && messages.length > 0;
  // The wizard's sticky Continue bar sits at the bottom of small screens; stay above it there.
  const lift = path === "/wizard" ? "bottom-20 sm:bottom-5" : "bottom-5";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chat to plan your station"
        title="Chat to plan your station"
        className={cn(
          "no-print fixed right-5 z-40 grid size-14 place-items-center rounded-full bg-brand text-surface shadow-lg transition-transform hover:scale-105 hover:bg-brand-deep",
          lift,
        )}
      >
        <MessageCircle className="size-6" aria-hidden="true" />
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-label="Plan your station by chatting"
      className="no-print fixed inset-x-3 bottom-3 z-50 flex h-[min(38rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[24rem]"
    >
      <header className="flex items-center justify-between gap-2 bg-navy px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Plan with a chat</p>
          <p className="flex items-center gap-1.5 text-xs text-blue-100/75">
            <span
              className={cn(
                "size-1.5 rounded-full",
                status === "model"
                  ? "bg-emerald-400"
                  : status === "simple"
                    ? "bg-amber-300"
                    : "bg-blue-300",
              )}
              aria-hidden="true"
            />
            {status === "model"
              ? "Reading your answers with a local model"
              : status === "simple"
                ? "Simple matching (no model connected)"
                : "Looking for a model…"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label="Start the chat over"
            onClick={() => {
              start();
            }}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="Chat settings" onClick={() => setShowSettings((v) => !v)}>
            <Settings className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="Close the chat" onClick={() => setOpen(false)}>
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {showSettings ? (
          <Settings_ config={config} status={status} note={statusNote} onSave={saveSettings} />
        ) : null}

        {messages.map((message) => (
          <Bubble
            key={message.id}
            message={message}
            animate={message.role === "bot" && message.id === lastBot?.id && typedId !== message.id}
            onDone={() => setTypedId(message.id)}
          />
        ))}

        {busy ? (
          <div
            className="flex w-fit items-center gap-1 rounded-lg rounded-bl-sm bg-surface-2 px-3 py-3"
            aria-label="Thinking"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-bounce rounded-full bg-muted"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        ) : null}

        {!busy && typingDone && done ? (
          <div className="rounded-lg border border-line bg-brand-soft p-3 text-sm">
            <p className="eyebrow">Your answers</p>
            <dl className="mt-2 grid gap-1.5">
              {rows.map((row) => (
                <div
                  key={`${row.key}-${row.label}`}
                  className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2"
                >
                  <dt className="text-muted">{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={writePlan}
              className="mt-3 min-h-11 w-full rounded-md bg-brand px-4 text-sm font-medium text-surface hover:bg-brand-deep"
            >
              Write my plan
            </button>
            {hasDraft ? (
              <p className="mt-2 text-xs text-muted">
                This replaces the draft saved on this device.
              </p>
            ) : null}
          </div>
        ) : null}

        {!busy && typingDone && asking && asking.options.length > 0 ? (
          asking.kind === "multi" ? (
            <div role="group" aria-label="Pick all that apply">
              <p className="mb-2 text-xs text-muted">
                Tap every one that applies, or type it, like “all of them except rain”.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={picked.length === asking.options.length}
                  onClick={() =>
                    setPicked(picked.length === asking.options.length ? [] : allIds(asking.key))
                  }
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium",
                    picked.length === asking.options.length
                      ? "border-brand bg-brand text-surface"
                      : "border-brand text-brand-deep hover:bg-brand-soft",
                  )}
                >
                  All of them
                </button>
                {asking.options.map((option) => {
                  const id = String(option.id);
                  const on = picked.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      title={option.hint}
                      aria-pressed={on}
                      onClick={() =>
                        setPicked(on ? picked.filter((item) => item !== id) : [...picked, id])
                      }
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-left text-xs",
                        on
                          ? "border-brand bg-brand-soft text-ink"
                          : "border-line bg-surface hover:border-brand",
                      )}
                    >
                      {on ? "✓ " : ""}
                      {option.title}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={picked.length === 0}
                  onClick={sendPicked}
                  className="min-h-10 rounded-md bg-brand px-4 text-sm font-medium text-surface hover:bg-brand-deep disabled:opacity-40"
                >
                  {picked.length === 0 ? "Send selection" : `Send ${picked.length} selected`}
                </button>
                {asking.skippable ? (
                  <button
                    type="button"
                    onClick={() => void send("skip")}
                    className="min-h-10 rounded-md px-3 text-sm text-muted hover:text-ink"
                  >
                    Skip
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Quick answers">
              {asking.options.map((option) => (
                <button
                  key={String(option.id)}
                  type="button"
                  title={option.hint}
                  onClick={() => void send(option.title)}
                  className="rounded-md border border-line bg-surface px-3 py-1.5 text-left text-xs hover:border-brand hover:bg-brand-soft"
                >
                  {option.title}
                </button>
              ))}
            </div>
          )
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-line bg-surface p-3"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={busy}
          maxLength={600}
          placeholder={done ? "Change something, or press Write my plan" : "Type your answer…"}
          aria-label="Your answer"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-panel px-3 text-sm text-ink placeholder:text-muted disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="grid size-11 shrink-0 place-items-center rounded-md bg-brand text-surface hover:bg-brand-deep disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md text-blue-100/80 hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

function Bubble({
  message,
  animate,
  onDone,
}: {
  message: Message;
  animate: boolean;
  onDone: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-brand px-3 py-2 text-sm text-surface">
        {message.text}
      </div>
    );
  }
  return (
    <div className="w-fit max-w-[90%] rounded-lg rounded-bl-sm bg-surface-2 px-3 py-2 text-sm text-ink">
      {animate ? <Typed text={message.text} onDone={onDone} /> : message.text}
    </div>
  );
}

/** Types the text out a few characters at a time. Shows it all at once if motion is reduced. */
function Typed({ text, onDone }: { text: string; onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      done.current();
      return;
    }
    setShown(0);
    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + 2);
      setShown(index);
      if (index >= text.length) {
        window.clearInterval(timer);
        done.current();
      }
    }, 16);
    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <>
      {text.slice(0, shown)}
      {shown < text.length ? (
        <span
          className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-ink"
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

function Settings_({
  config,
  status,
  note,
  onSave,
}: {
  config: ChatConfig;
  status: Status;
  note: string;
  onSave: (config: ChatConfig) => Promise<void>;
}) {
  const [draft, setDraft] = useState(config);
  const [testing, setTesting] = useState(false);
  const field = "mt-1 min-h-10 w-full rounded-md border border-line bg-panel px-3 text-sm text-ink";
  return (
    <div className="rounded-lg border border-line bg-panel p-3 text-sm">
      <p className="eyebrow">Model connection</p>
      <p className="mt-1 text-xs text-muted">
        The chat reads your answers with a small language model. It runs on this computer, so your
        answers stay here. Without one it still works, with simpler matching.
      </p>
      <label className="mt-3 block text-xs text-muted">
        Model address
        <input
          className={field}
          value={draft.endpoint}
          onChange={(e) => setDraft({ ...draft, endpoint: e.target.value })}
          spellCheck={false}
        />
      </label>
      <label className="mt-2 block text-xs text-muted">
        Model name
        <input
          className={field}
          value={draft.model}
          onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          spellCheck={false}
        />
      </label>
      <label className="mt-2 block text-xs text-muted">
        Key (only for a hosted server)
        <input
          className={field}
          type="password"
          autoComplete="off"
          value={draft.apiKey}
          onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
        />
      </label>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={testing}
          onClick={async () => {
            setTesting(true);
            await onSave(draft);
            setTesting(false);
          }}
          className="min-h-10 rounded-md bg-brand px-3 text-sm font-medium text-surface hover:bg-brand-deep disabled:opacity-50"
        >
          {testing ? "Testing…" : "Save and test"}
        </button>
        <button
          type="button"
          onClick={() => setDraft(DEFAULT_CONFIG)}
          className="min-h-10 rounded-md px-3 text-sm text-muted hover:text-ink"
        >
          Reset
        </button>
      </div>
      <p className="mt-2 text-xs" role="status">
        {status === "model"
          ? "Connected."
          : status === "simple"
            ? note || "Not connected."
            : "Testing…"}
      </p>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer">How to run a model on your computer</summary>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
          {OLLAMA_HELP}
        </pre>
      </details>
    </div>
  );
}

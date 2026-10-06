import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Cpu, Printer, RotateCcw, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CONFIGS, DOCS } from "@/lib/wizard/catalog";
import { flashPathFor, type FlashPath } from "@/lib/wizard/flasher";
import {
  buildPlan,
  interimText,
  planToText,
  statusLabel,
  type DraftPlan,
} from "@/lib/wizard/plan";
import { formatMoney } from "@/lib/wizard/recommend";
import { decodeDraft, encodeDraft, useDraft, type Persisted } from "@/lib/wizard/store";
import type { Goal } from "@/lib/wizard/types";
import { cn } from "@/lib/utils";

export function PlanView() {
  const hydrated = useDraft((state) => state.hydrated);
  const answers = useDraft((state) => state.answers);
  const siteName = useDraft((state) => state.siteName);
  const checks = useDraft((state) => state.checks);
  const goals = useDraft((state) => state.goals);
  const goalLog = useDraft((state) => state.goalLog);
  const goalsTouched = useDraft((state) => state.goalsTouched);
  const setGoals = useDraft((state) => state.setGoals);
  const toggleCheck = useDraft((state) => state.toggleCheck);
  const reviseGoal = useDraft((state) => state.reviseGoal);
  const markGoalsTouched = useDraft((state) => state.markGoalsTouched);
  const reset = useDraft((state) => state.reset);
  const loadShared = useDraft((state) => state.loadShared);
  const [offer, setOffer] = useState<Persisted | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const plan = useMemo(() => buildPlan(answers, siteName), [answers, siteName]);
  const signature = plan.suggestedGoals.map((goal) => `${goal.id}:${goal.text}`).join("|");

  useEffect(() => {
    if (!hydrated || !plan.ready || goalsTouched) return;
    const next = plan.suggestedGoals;
    const current = useDraft.getState().goals;
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    setGoals(next);
  }, [hydrated, goalsTouched, plan.ready, signature, plan.suggestedGoals, setGoals]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#draft=")) return;
    const data = decodeDraft(decodeURIComponent(hash.slice("#draft=".length)));
    if (!data?.answers.intent) return;
    if (!useDraft.getState().answers.intent) {
      loadShared(data);
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    setOffer(data);
  }, [hydrated, loadShared]);

  if (!hydrated) {
    return <p className="mx-auto max-w-5xl px-4 py-16 text-muted">Opening your draft…</p>;
  }

  if (!plan.ready || !plan.recommendation) {
    return (
      <main id="content" className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl">No draft yet</h1>
        <p className="mt-3 text-muted">
          The checklist appears after you name a place, a link, and at least one thing to measure.
        </p>
        <Link
          to="/wizard"
          className="mt-6 inline-flex min-h-12 items-center rounded-md bg-brand px-5 text-sm font-medium text-surface"
        >
          Start the wizard
        </Link>
      </main>
    );
  }

  const cfg = CONFIGS[plan.recommendation.configId];
  const flashPath = flashPathFor(plan.recommendation.configId, answers);
  const done = plan.tasks.filter((task) => checks[task.id]).length;
  const groups = ["Parts", "Build", "Deploy", "With people", "Check-ins"] as const;

  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Copy failed in this browser. Use print instead.");
    }
  }

  function sharedPayload(): Persisted {
    const state = useDraft.getState();
    return {
      answers: state.answers,
      step: state.step,
      checks: {},
      goals: state.goals,
      goalLog: state.goalLog,
      goalsTouched: state.goalsTouched,
      siteName: state.siteName,
      startedAt: state.startedAt,
    };
  }

  return (
    <main id="content" className="mx-auto max-w-5xl px-4 py-8">
      {offer ? (
        <div className="no-print mb-6 rounded-lg border border-line bg-panel px-4 py-4">
          <p className="text-sm">
            A shared draft for {offer.siteName || "another place"} is in this link. Opening it
            replaces the words on this device. Ticked boxes stay local.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-md bg-brand px-4 text-sm text-surface"
              onClick={() => {
                loadShared(offer);
                setOffer(null);
                window.history.replaceState(null, "", window.location.pathname);
              }}
            >
              Open shared draft
            </button>
            <button
              type="button"
              className="min-h-11 rounded-md px-4 text-sm text-muted"
              onClick={() => {
                setOffer(null);
                window.history.replaceState(null, "", window.location.pathname);
              }}
            >
              Keep mine
            </button>
          </div>
        </div>
      ) : null}

      <p className="eyebrow">Draft plan</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">{plan.siteName}</h1>
        <p className="text-sm text-muted tabular-nums">
          {done} of {plan.tasks.length} ticked on this device
        </p>
      </div>
      <p className="mt-3 max-w-2xl text-muted">
        {cfg.name} · {plan.stationCount} station{plan.stationCount === 1 ? "" : "s"} · {cfg.tag}.{" "}
        {plan.hobby
          ? "This is a build sheet. The community checklist was skipped on purpose."
          : "A first checklist, not a finished program. Share it as a draft."}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <section className="rounded-lg border border-line bg-panel p-5">
            <p className="eyebrow">{cfg.name}</p>
            <h2 className="mt-1 text-3xl">{cfg.mcu}</h2>
            <p className="mt-2 text-sm text-muted">{cfg.comms}</p>
            <ul className="mt-4 grid gap-2">
              {plan.recommendation.ports.map((port) => (
                <li key={port} className="rounded-md bg-surface px-3 py-2 text-sm">
                  {port}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              <span className="text-muted">Power. </span>
              {plan.recommendation.power}
            </p>
            {plan.recommendation.experimental ? (
              <p className="mt-4 rounded-md border border-warn px-3 py-3 text-sm">
                Long-haul amateur radio (WSPR/APRS, 1.8–30 MHz) stays on the sheet as a future
                path. The board is unchosen, so nothing in this draft orders or flashes it. The
                station you can build today is the LoRa configuration. That future path was
                budgeted around 20 W of solar.
              </p>
            ) : null}
          </section>

          <FlashSection path={flashPath} stationCount={plan.stationCount} />

          <section className="mt-6">
            <h2 className="text-2xl">Why this one</h2>
            <ul className="mt-3 grid gap-2">
              {plan.recommendation.reasons.map((reason) => (
                <li key={reason} className="border-l-2 border-brand pl-3 text-sm">
                  {reason}
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-xl">Set aside</h3>
            <ul className="mt-3 grid gap-3">
              {plan.recommendation.declined.map((row) => (
                <li key={row.id} className="text-sm">
                  <span className="font-medium">{row.name}. </span>
                  <span className="text-muted">{row.because}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl">Sensors</h2>
            <ul className="mt-3 grid gap-3">
              {plan.sensors.map((sensor) => (
                <li key={sensor.id} className="rounded-lg border border-line bg-panel px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{sensor.name}</p>
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">
                      {sensor.iface}
                    </span>
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-xs",
                        sensor.status === "pending" ? "border-warn" : "border-line text-muted",
                      )}
                    >
                      {statusLabel(sensor.status)}
                    </span>
                    {sensor.price ? (
                      <span className="text-xs tabular-nums text-muted">{sensor.price}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">{sensor.note}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl">Checklist</h2>
            {groups.map((group) => {
              const items = plan.tasks.filter((task) => task.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="mt-4">
                  <h3 className="text-sm font-medium tracking-wide text-brand-deep">{group}</h3>
                  <ul className="mt-1">
                    {items.map((task) => {
                      const checked = Boolean(checks[task.id]);
                      return (
                        <li key={task.id}>
                          <button
                            type="button"
                            aria-pressed={checked}
                            onClick={() => toggleCheck(task.id)}
                            className="flex w-full gap-3 rounded-md px-1 py-3 text-left"
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid size-6 shrink-0 place-items-center rounded border",
                                checked
                                  ? "border-brand bg-brand text-surface"
                                  : "border-line bg-panel text-transparent",
                              )}
                              aria-hidden="true"
                            >
                              <Check className="size-3.5" strokeWidth={2.5} />
                            </span>
                            <span>
                              <span className={cn("block", checked && "text-muted line-through")}>
                                {task.label}
                              </span>
                              {task.detail ? (
                                <span className="mt-1 block text-sm text-muted">{task.detail}</span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </section>

          <Goals
            plan={plan}
            goals={goals}
            goalLog={goalLog}
            editing={editing}
            setEditing={setEditing}
            onRevise={reviseGoal}
            onAdopt={() => {
              const state = useDraft.getState();
              const from = state.goals.map((goal) => goal.text).join(" · ");
              setGoals(plan.suggestedGoals);
              markGoalsTouched();
              useDraft.setState({
                goalLog: [
                  ...state.goalLog,
                  {
                    id: `adopt-${Date.now()}`,
                    at: new Date().toISOString().slice(0, 10),
                    from: from || "Empty",
                    to: plan.suggestedGoals.map((goal) => goal.text).join(" · "),
                    why: "Replaced goal posts with the set suggested by the latest answers",
                  },
                ],
              });
            }}
            showAdopt={
              goalsTouched &&
              JSON.stringify(goals) !== JSON.stringify(plan.suggestedGoals)
            }
          />

          <p className="mt-8 text-sm text-muted">
            Stations already in the field on the RP2040 stay on that classic firmware. New
            recommendations use the Atom Lite. The software direction is one image that switches
            Wi-Fi, cellular, and LoRa from a configuration file when the matching base is attached.
            This checklist uses the fixed first-version ports, not every pin combination.
          </p>
        </div>

        <aside className="h-fit rounded-lg border border-line bg-panel p-4 lg:sticky lg:top-4">
          <p className="text-sm text-muted">Known add-on prices</p>
          <p className="mt-1 text-3xl tabular-nums">{formatMoney(plan.addonCents)}</p>
          <p className="mt-2 text-sm text-muted">
            Bases{plan.sensors.some((sensor) => sensor.price) ? ", wind, and soil" : ""}. The Atom
            Lite, filament, mast, and most Qwiic boards are not in that number.
          </p>
          <p className="mt-4 text-sm text-muted">Print time</p>
          <p className="text-2xl tabular-nums">{plan.printHours} hours</p>
          <p className="mt-2 text-sm text-muted">{plan.printNote}</p>

          <div className="mt-5 grid gap-3">
            {plan.coverage.map((row) => (
              <div key={row.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{row.label}</span>
                  <span className="tabular-nums text-muted">{row.score}</span>
                </div>
                <div
                  className="mt-1 h-1.5 overflow-hidden rounded-md bg-surface-2"
                  role="meter"
                  aria-valuenow={row.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={row.label}
                >
                  <div className="h-1.5 rounded-md bg-brand" style={{ width: `${row.score}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">{row.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Coverage is a picture of this first draft, not a grade and not a forecast.
          </p>

          <div className="no-print mt-5 grid gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm text-surface"
              onClick={() =>
                copyText(planToText(answers, plan, goals, checks, goalLog), "Plan copied")
              }
            >
              <Copy className="size-4" aria-hidden="true" />
              Copy plan
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm"
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}#draft=${encodeURIComponent(encodeDraft(sharedPayload()))}`;
                void copyText(url, "Link copied. Boxes you ticked stay on this device.");
              }}
            >
              Copy share link
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm"
              onClick={() =>
                copyText(interimText(plan, goals, checks, goalLog), "Interim note copied")
              }
            >
              Copy interim note
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm"
              onClick={() => window.print()}
            >
              <Printer className="size-4" aria-hidden="true" />
              Print
            </button>
            <Link
              to="/wizard"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line px-4 text-sm"
            >
              Revise answers
            </Link>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm text-muted"
              onClick={() => {
                reset();
                toast("Draft cleared on this device");
              }}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Start over
            </button>
          </div>

          <ul className="mt-5 grid gap-2 text-sm">
            <li>
              <a className="text-brand-deep underline underline-offset-4" href={DOCS.flash}>
                Flashing guide
              </a>
            </li>
            <li>
              <a className="text-brand-deep underline underline-offset-4" href={DOCS.print}>
                Print settings
              </a>
            </li>
            <li>
              <a className="text-brand-deep underline underline-offset-4" href={DOCS.assemble}>
                Core assembly
              </a>
            </li>
            <li>
              <a className="text-brand-deep underline underline-offset-4" href={DOCS.data}>
                Data and CHORDS
              </a>
            </li>
          </ul>
        </aside>
      </div>
    </main>
  );
}

function Goals({
  plan,
  goals,
  goalLog,
  editing,
  setEditing,
  onRevise,
  onAdopt,
  showAdopt,
}: {
  plan: DraftPlan;
  goals: Goal[];
  goalLog: ReturnType<typeof useDraft.getState>["goalLog"];
  editing: string | null;
  setEditing: (id: string | null) => void;
  onRevise: (id: string, text: string, why: string) => void;
  onAdopt: () => void;
  showAdopt: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl">Goal posts</h2>
      <p className="mt-2 text-sm text-muted">
        When the aim moves, write the old sentence and the reason. The next person should inherit
        the change, not only the new words.
      </p>
      {showAdopt ? (
        <button
          type="button"
          onClick={onAdopt}
          className="no-print mt-3 text-sm text-brand-deep underline underline-offset-4"
        >
          Replace these with the posts suggested by your latest answers
        </button>
      ) : null}
      <ul className="mt-4 grid gap-3">
        {(goals.length ? goals : plan.suggestedGoals).map((goal) => (
          <li key={goal.id} className="rounded-lg border border-line bg-panel px-4 py-3">
            {editing === goal.id ? (
              <GoalEditor
                initial={goal.text}
                onCancel={() => setEditing(null)}
                onSave={(text, why) => {
                  onRevise(goal.id, text, why);
                  setEditing(null);
                }}
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p>{goal.text}</p>
                <button
                  type="button"
                  className="no-print shrink-0 text-sm text-brand-deep underline underline-offset-4"
                  onClick={() => setEditing(goal.id)}
                >
                  This changed
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <h3 className="mt-6 text-xl">Record of changes</h3>
      {goalLog.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No goal post has moved yet.</p>
      ) : (
        <ol className="mt-3 grid gap-3">
          {goalLog.map((change) => (
            <li key={change.id} className="text-sm">
              <p className="text-muted">{change.at}</p>
              <p className="mt-1">{change.why}</p>
              <p className="mt-1 text-muted">
                Was: {change.from}
                <br />
                Now: {change.to}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function GoalEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (text: string, why: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const [why, setWhy] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) return;
        onSave(text, why);
      }}
    >
      <label className="text-sm text-muted" htmlFor="goal-text">
        New wording
      </label>
      <textarea
        id="goal-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-ink"
        rows={3}
      />
      <label className="mt-3 block text-sm text-muted" htmlFor="goal-why">
        What moved, and why
      </label>
      <textarea
        id="goal-why"
        value={why}
        onChange={(event) => setWhy(event.target.value)}
        className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-ink"
        rows={2}
      />
      <div className="mt-3 flex gap-2">
        <button type="submit" className="min-h-11 rounded-md bg-brand px-4 text-sm text-surface">
          Save change
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-md px-4 text-sm text-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}

function FlashSection({ path, stationCount }: { path: FlashPath | null; stationCount: number }) {
  if (!path) {
    return (
      <section id="flash" className="no-print mt-6 rounded-lg border border-dashed border-line px-5 py-4">
        <p className="eyebrow">Flash</p>
        <h2 className="mt-1 text-xl">Nothing to flash yet</h2>
        <p className="mt-1 text-sm text-muted">
          This path has no chosen board, so the browser flasher has nothing to program. Choose
          radio, Wi-Fi, or cellular to get a flashing path.
        </p>
      </section>
    );
  }
  return (
    <section
      id="flash"
      className="no-print mt-6 overflow-hidden rounded-lg border border-brand bg-panel"
    >
      <div className="grid-bg px-5 py-5 text-white">
        <p className="font-mono text-xs uppercase tracking-widest text-blue-300">
          Flash from your browser
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl">
          <Cpu className="size-6 shrink-0 text-blue-300" aria-hidden="true" />
          {path.board}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-blue-100/85">{path.why}</p>
        <a
          href={path.href}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-brand-deep hover:bg-blue-50"
        >
          <Zap className="size-4" aria-hidden="true" />
          Open the web flasher
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
      <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
        <div>
          <h3 className="eyebrow">Your path</h3>
          <ol className="mt-3 grid gap-3">
            {path.steps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-soft font-mono text-xs text-brand-deep">
                  {index + 1}
                </span>
                <span className="text-sm">
                  <span className="font-medium">{step.title}. </span>
                  <span className="text-muted">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="eyebrow">Bring</h3>
          <ul className="mt-3 grid gap-2 text-sm text-muted">
            {path.bring.map((item) => (
              <li key={item} className="border-l-2 border-line pl-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {path.note || stationCount > 1 ? (
        <div className="grid gap-2 border-t border-line bg-surface-2 px-5 py-3 text-sm">
          {path.note ? <p>{path.note}</p> : null}
          {stationCount > 1 ? (
            <p>
              This plan has {stationCount} stations. Run the flasher once per board, and give each
              one its own station ID or owner details.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChoiceCard } from "@/components/choice-card";
import { INTENTS } from "@/lib/wizard/catalog";
import { useDraft } from "@/lib/wizard/store";
import type { Intent } from "@/lib/wizard/types";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const hydrated = useDraft((state) => state.hydrated);
  const siteName = useDraft((state) => state.siteName);
  const intent = useDraft((state) => state.answers.intent);
  const reset = useDraft((state) => state.reset);
  const setIntent = useDraft((state) => state.setIntent);
  const setStep = useDraft((state) => state.setStep);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  function begin(id: Intent) {
    reset();
    setIntent(id);
    setStep("place");
    void navigate({ to: "/wizard" });
  }

  return (
    <main id="content">
      <section className="grid-bg text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <p className="font-mono text-xs uppercase tracking-widest text-blue-300">
            NCAR · open environmental sensing
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] sm:text-6xl">
            Start with the place, not the parts list.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-blue-100/80">
            Say what the site has to live with. Leave with a station configuration and a draft
            checklist your people can share, before anyone flashes a board.
          </p>
          <div className="no-print mt-8 flex flex-wrap gap-3">
            <a
              href="#start"
              className="inline-flex min-h-11 items-center rounded-md bg-white px-5 text-sm font-semibold text-brand-deep hover:bg-blue-50"
            >
              Plan a station
            </a>
            <Link
              to="/library"
              className="inline-flex min-h-11 items-center rounded-md border border-white/25 px-5 font-mono text-sm text-white hover:bg-white/10"
            >
              read the docs →
            </Link>
          </div>
          <pre className="mt-10 hidden max-w-md overflow-x-auto rounded-md border border-white/10 bg-black/30 px-4 py-3 text-xs leading-relaxed text-blue-100/90 sm:block">{`$ iotwx plan --site "ridge-01"
> link      cellular
> measures  temp, rh, pressure
> status    ready to print ✓`}</pre>
        </div>
      </section>

      <div id="start" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-10 sm:py-14">
        {hydrated && intent ? (
          <div className="no-print mb-8 flex flex-col gap-3 rounded-lg border border-line bg-brand-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            {confirming ? (
              <>
                <p className="text-sm">
                  Discard this draft{siteName ? ` for ${siteName}` : ""}? This clears it from this
                  device.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-surface hover:bg-brand-deep"
                    onClick={() => {
                      reset();
                      setConfirming(false);
                      toast("Draft discarded. Start a new one below.");
                    }}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm"
                    onClick={() => setConfirming(false)}
                  >
                    Keep it
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">
                  A draft is already on this device{siteName ? ` for ${siteName}` : ""}.
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    to="/plan"
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-surface hover:bg-brand-deep"
                  >
                    Continue the draft
                  </Link>
                  <button
                    type="button"
                    aria-label="Discard draft"
                    title="Discard draft"
                    onClick={() => setConfirming(true)}
                    className="grid size-11 place-items-center rounded-md border border-line bg-surface text-muted transition-colors hover:border-brand hover:text-ink"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        <p className="eyebrow">01 / start</p>
        <h2 className="mt-2 text-2xl">What brings you here?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {INTENTS.map((item) => (
            <ChoiceCard
              key={item.id}
              icon={item.icon}
              title={item.title}
              body={item.body}
              selected={false}
              onSelect={() => begin(item.id)}
            />
          ))}
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          <Note
            n="02"
            title="Click together"
            body="No soldering and no breadboard. Qwiic and Grove parts, a 1 inch thread, and caps for the ports you are not using."
          />
          <Note
            n="03"
            title="Print, then wait"
            body="Most housings finish in under five hours. A full station with base accessories is about 35 hours on an entry-level printer."
          />
          <Note
            n="04"
            title="Keep the readings"
            body="FAIR and CARE sit under the project. Publishing to a public map is optional. A broker you control is a valid ending."
          />
        </section>

        <p className="mt-10 text-sm text-muted">
          Already flashing an Atom Lite or keeping an RP2040 station in the field?{" "}
          <Link to="/library" className="text-brand underline underline-offset-4">
            The field library
          </Link>{" "}
          holds the classic manuals.
        </p>
      </div>
    </main>
  );
}

function Note({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line border-t-2 border-t-brand bg-surface-2 px-4 pb-4 pt-3">
      <p className="eyebrow">{n}</p>
      <h3 className="mt-1 text-lg">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}

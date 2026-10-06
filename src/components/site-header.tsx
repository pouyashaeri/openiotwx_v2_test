import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { FLASHER_ROOT } from "@/lib/wizard/flasher";

const LINKS = [
  { to: "/wizard", label: "Wizard" },
  { to: "/plan", label: "Plan" },
  { to: "/library", label: "Library" },
] as const;

export function SiteHeader() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 text-white">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand">
            <span className="size-2.5 rounded-full border-2 border-white" />
          </span>
          <span className="truncate font-mono text-base font-semibold leading-none tracking-tight">
            openiotwx<span className="text-blue-300">/</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center sm:gap-1">
          {LINKS.map((item) => {
            const active = path === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-2 py-1.5 text-[13px] transition-colors sm:px-3 sm:text-sm",
                  active ? "bg-white/15 text-white" : "text-blue-100/75 hover:text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href={FLASHER_ROOT}
            className="rounded-md px-2 py-1.5 text-[13px] text-blue-100/75 transition-colors hover:text-white sm:px-3 sm:text-sm"
          >
            Flash
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-navy text-blue-100/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>An open source NCAR community project. Data sharing stays a choice.</p>
        <a
          className="font-mono text-xs text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
          href="https://ncar.github.io/openiotwx/"
        >
          earlier-manuals ↗
        </a>
      </div>
    </footer>
  );
}

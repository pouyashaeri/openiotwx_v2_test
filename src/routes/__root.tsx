import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { useDraft } from "@/lib/wizard/store";
import appCss from "../styles.css?url";

const BASE = import.meta.env.BASE_URL;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "OpenIoTwx — plan a station from the place" },
      {
        name: "description",
        content:
          "A needs-first wizard for OpenIoTwx. Leave with a station configuration and a draft community checklist.",
      },
      { name: "theme-color", content: "#071530" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: `${BASE}favicon.svg` },
      { rel: "stylesheet", href: appCss },
      // Platform-only PWA assets; the GitHub Pages build is served from a sub-path without them.
      ...(BASE === "/"
        ? [
            { rel: "manifest", href: "/__grok/manifest.webmanifest" },
            { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
          ]
        : []),
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: Root,
});

function Root() {
  const hydrate = useDraft((state) => state.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <SiteHeader />
          <Outlet />
          <SiteFooter />
          <Toaster position="bottom-center" />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

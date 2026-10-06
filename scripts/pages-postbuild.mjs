// After `vite build --mode pages`: turn TanStack's SPA shell into what GitHub Pages serves.
//  - 404.html    : GitHub Pages serves this for unknown paths
//  - .nojekyll   : stop Pages from running Jekyll over the output
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "dist", "client");
// Pages are prerendered, so index.html already exists. A truly unknown path falls back to the
// home page, and the router then shows its own not-found view.
const index = join(out, "index.html");
if (!existsSync(index)) {
  console.error("[pages] dist/client/index.html not found. Run `vite build --mode pages` first.");
  process.exit(1);
}
copyFileSync(index, join(out, "404.html"));
writeFileSync(join(out, ".nojekyll"), "");
console.log("[pages] wrote 404.html and .nojekyll in dist/client");

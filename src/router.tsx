import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    // "/" normally; "/openiotwx_v2_test" in the GitHub Pages build (Vite's `base`).
    basepath: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
    defaultErrorComponent: AppErrorComponent,
    defaultViewTransition: true,
    scrollRestoration: true,
  });
}

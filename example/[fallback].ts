import { createRoute } from "../mod.ts";

export default createRoute((_req, slugs) => {
  return new Response(`/${slugs.fallback}`);
});

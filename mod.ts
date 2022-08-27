import { walk, type WalkOptions } from "./private/deps/std/fs.ts";
import { type Handler } from "./private/deps/std/http.ts";
import { bootMessage, errorMessage } from "./private/log.ts";
import { notFound } from "./private/response.ts";
import { Route } from "./private/route.ts";

// Given a map of routes to their respective handlers, returns a single
// handler that correctly forwards requests to the right handler.
// If a route is hit that doesn't exist, the returned handler will 404.
function handleRoutes(routes: Route[]): Handler {
  // Make a map outta these routes for easier lookup.
  const routeMap = new Map<string, Route>(
    routes.map((route) => [route.parsed, route]),
  );

  return (req, connInfo) => {
    const urlPath = new URL(req.url).pathname;
    const route = routeMap.get(urlPath);

    // Non-slug route found, serve it
    if (route) {
      return route.handler(req, connInfo);
    }

    // Respond with a 404 Not Found if asking for a route
    // that does not exist
    return notFound();
  };
}

/**
 * A collection of options to be passed in on initialization.
 */
export interface RouterOptions {
  /**
   * Whether or not an information message should be shown on startup.
   * Defaults to true.
   */
  bootMessage?: boolean;
}

/**
 * fsRouter creates a Handler which handles requests
 * according to the shape of the filesystem at the given rootDir.
 * Each file within rootDir must provide a Handler as its default
 * export, which will be used to execute requests if the requested
 * route matches the file's position in the filesystem.
 *
 * Given a project with the following folder structure:
 *
 * ```bash
 * my-app/
 * ├─ pages/
 * │  ├─ blog/
 * │  │  ├─ post.ts
 * │  │  ├─ index.ts
 * │  ├─ about.ts
 * │  ├─ index.ts
 * ├─ mod.ts
 * ```
 *
 * Each "route file" must export a Handler as its default export:
 *
 * ```typescript
 * // my-app/pages/blog/post.ts
 * export default (req: Request) => {
 *   return new Response("hello world!");
 * };
 * ```
 *
 * Initialize a server by calling `fsRouter`:
 *
 * ```typescript
 * // my-app/mod.ts
 * import { fsRouter } from "https://deno.land/x/fsrouter@{VERSION}/mod.ts";
 * import { serve } from "https://deno.land/std@{VERSION}/http/server.ts";
 *
 * // Use the file system router with base directory 'pages'
 * serve(await fsRouter("pages"));
 *
 * // Or, provide an options (RouterOptions) object:
 * // serve(await fsRouter("pages"), { bootMessage: false });
 * ```
 *
 * @param rootDir The directory at which routes will be served
 * @param opts An optional options object
 * @returns A Promise which resolves to a Handler
 */
export async function fsRouter(
  rootDir: string,
  opts: RouterOptions = {
    bootMessage: true,
  },
): Promise<Handler> {
  const walkOpts: WalkOptions = {
    // Exclude directories when walking the filesystem.  We only care
    // about files which have declared handlers in them.
    includeDirs: false,

    // Only allow typescript files because they are the only files which
    // will have actual handler definitions.
    // TODO: maybe act as a static file server for all other files?
    exts: [".ts", ".js", ".jsx", ".tsx"],
  };

  const routes: Route[] = [];
  for await (const filePath of walk(rootDir, walkOpts)) {
    routes.push(await Route.create(filePath.path, rootDir));
  }

  if (routes.length === 0) {
    errorMessage(rootDir);
    Deno.exit(0);
  }

  if (opts.bootMessage) {
    bootMessage(routes, rootDir);
  }

  return handleRoutes(routes);
}

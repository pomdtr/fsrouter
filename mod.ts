import * as path from "@std/path"
import * as fs from "@std/fs"
import * as http from "@std/http"
import * as gfm from "@deno/gfm"
import * as frontmatter from "@std/front-matter"

type HTMLOptions = {
    title?: string,
    favicon?: string,
}

function html(body: string, options?: HTMLOptions): string {
    return /* html */ `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${options?.title ? `<title>${options?.title}</title>` : ""}
      ${options?.favicon ? `<link rel="icon" href="${options?.favicon}" />` : ""}
      <style>
        main {
          max-width: 800px;
          margin: 0 auto;
        }
        ${gfm.CSS}
      </style>
    </head>
    <body data-color-mode="light" data-light-theme="light" data-dark-theme="dark" class="markdown-body">
      <main>
        ${body}
      </main>
    </body>
  </html>
  `
}


function stripFrontmatter(markdown: string): string {
    const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) return markdown
    return markdown.slice(match[0].length)
}


async function serveMarkdown(absPath: string): Promise<Response> {
    let markdown = await Deno.readTextFileSync(absPath);
    let options: HTMLOptions = {};
    if (frontmatter.test(markdown, ["yaml"])) {
        const res = frontmatter.extractYaml<HTMLOptions>(markdown);
        options = res.attrs;
        markdown = stripFrontmatter(markdown);
    }

    const body = await gfm.render(markdown);
    if (!options.title) {
        options.title = path.basename(absPath, ".md");
    }
    return new Response(html(body, options), {
        headers: {
            "content-type": "text/html",
        },
    });
}


// Define types for our route information
type RouteInfo = {
    filepath: string;
    pattern: string;
};

/**
 * Converts a filename to a route pattern.
 * @param file - The filename to convert.
 * @returns The corresponding route pattern.
 */
function filenameToRoutePattern(filepath: string): RouteInfo {
    const extname = path.extname(filepath);

    // Remove the file extension
    let pattern = filepath.slice(0, -extname.length);

    // Handle index files
    if (pattern.endsWith('/index')) {
        pattern = pattern.slice(0, -6);
    }

    // Handle [...path].ts case
    if (pattern.includes('[...')) {
        pattern = pattern.replace(/\[\.\.\.(\w+)\]/g, ':$1*');
    }

    // Handle [param].ts case
    pattern = pattern.replace(/\[(\w+)\]/g, ':$1');

    // Handle optional parameters
    pattern = pattern.replace(/\[\[(\w+)\]\]/g, '{/:$1}?');

    // Ensure pattern starts with /
    if (!pattern.startsWith('/')) {
        pattern = '/' + pattern;
    }

    // Handle root path
    if (pattern === '/index') {
        pattern = '/';
    }

    return { filepath, pattern };
}

function comparePatterns(a: string, b: string): number {
    // Root path should always be last
    if (a === '/') return 1;
    if (b === '/') return -1;

    // Count static segments
    const aStatic = a.split('/').filter(s => !s.startsWith(':') && s !== '*' && s !== '').length;
    const bStatic = b.split('/').filter(s => !s.startsWith(':') && s !== '*' && s !== '').length;

    // More static segments come first
    if (aStatic !== bStatic) return bStatic - aStatic;

    // Count dynamic segments
    const aDynamic = a.split('/').filter(s => s.startsWith(':') && !s.endsWith('*')).length;
    const bDynamic = b.split('/').filter(s => s.startsWith(':') && !s.endsWith('*')).length;

    // More dynamic segments come next
    if (aDynamic !== bDynamic) return bDynamic - aDynamic;

    // Catch-all routes come last (before root)
    const aHasCatchAll = a.includes('*');
    const bHasCatchAll = b.includes('*');
    if (aHasCatchAll && !bHasCatchAll) return 1;
    if (!aHasCatchAll && bHasCatchAll) return -1;

    // If all else is equal, sort by pattern length (longer first)
    return b.length - a.length;
}



export function normalizeRootDir(rootDir: string): string {
    if (rootDir.startsWith("file://")) {
        rootDir = rootDir.substring("file://".length);
    }

    if (!path.isAbsolute(rootDir)) {
        rootDir = path.join(Deno.cwd(), rootDir);
    }

    return rootDir;
}


function discoverRoutes(
    rootDir: string,
): http.Route[] {
    rootDir = normalizeRootDir(rootDir);

    const files: string[] = [];
    try {
        for (const entry of fs.walkSync(rootDir, {
            // Exclude directories when walking the filesystem.  We only care
            // about files which have declared handlers in them.
            includeDirs: false,
            exts: [".ts", ".js", ".jsx", ".tsx", ".md", ".html"],
        })) {
            files.push(path.relative(rootDir, entry.path));
        }
    } catch (_e) {
        throw new Error(`No such file or directory: ${rootDir}`);
    }

    return files.map(filenameToRoutePattern).sort((a, b) => comparePatterns(a.pattern, b.pattern)).map(({ filepath, pattern }) => {
        const extname = path.extname(filepath);
        return {
            pattern: new URLPattern({ pathname: pattern }),
            handler: async (req, info, res) => {
                if (extname === ".html") {
                    return http.serveFile(req, path.join(rootDir, filepath))
                }

                if (extname === ".md") {
                    return serveMarkdown(path.join(rootDir, filepath))
                }

                const { default: handler } = await import(path.join(rootDir, filepath)) as { default?: Handler };
                if (!handler || typeof handler !== "function") {
                    return new Response("Default export must be a function", { status: 500 });
                }

                const params: Record<string, string> = {}
                for (const key in res?.pathname.groups) {
                    params[key] = res?.pathname.groups[key] || "";
                }

                return handler(req, params, info);
            }
        } satisfies http.Route
    })
}

export function route(
    rootDir: string,
    defaultHandler: (request: Request, info?: Deno.ServeHandlerInfo,) => Response | Promise<Response>
): (request: Request, info?: Deno.ServeHandlerInfo,) => Response | Promise<Response> {
    const routes = discoverRoutes(rootDir);
    return http.route(routes, defaultHandler)
}

export type Handler = (req: Request, params: Readonly<Record<string, string>>, info?: Deno.ServeHandlerInfo) => Response | Promise<Response>;
export function createRoute(handler: Handler) {
    return handler;
}

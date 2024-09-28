# `fsrouter`

A file system based router for [Deno](https://deno.land).

## Basic usage

Given a project with the following folder structure:

```bash
my-app/
├─ pages/
│  ├─ blog/
│  │  ├─ post.md
│  │  ├─ index.ts
│  ├─ about.ts
│  ├─ index.html
├─ mod.ts
```

Each "route file" must export a Fetch Handler as its default export:

```typescript
// my-app/pages/blog/post.ts
export default (req: Request) => {
  return new Response("hello world!");
};
```

`.js` files are fine as well:

```javascript
// my-app/pages/blog/post.js
export default (req) => {
  return new Response("hello world!");
};
```

As well as `.jsx` and `.tsx` files, with jsx runtime modules from whichever
source you wish:

```tsx
// my-app/pages/blog/post.tsx

/** @jsxImportSource npm:preact */
import { render } from "npm:preact-render-to-string";

function App() {
  return (
    <html>
      <head>
        <title>Hello from JSX</title>
      </head>
      <body>
        <h1>Hello world</h1>
      </body>
    </html>
  );
}

export default (_req: Request) => {
  const html = render(<App />);

  return new Response(html, {
    headers: {
      "content-type": "text/html",
    },
  });
};
```

Initialize a server by calling `createRouter`:

```typescript
// my-app/mod.ts
import { createRouter } from "jsr:@pomdtr/fsrouter";

export default createRouter(import.meta.resolve("./pages"));
```

`.html`, `.md`, and `.mdx` files are also supported:

```html
<!-- my-app/pages/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>Hello world</title>
  </head>
  <body>
    <h1>Hello world</h1>
  </body>
</html>
```

You can specify the page title and favicon in `.md` and `.mdx` files:

```markdown
---
title: Hello world
favicon: /favicon.ico
---

# Hello world
```

Now running:

```bash
deno serve --allow-read=. my-app/mod.ts
```

Results in routes being served as follows:

| File                  | Route        |
| --------------------- | ------------ |
| `pages/index.ts`      | `/`          |
| `pages/about.ts`      | `/about`     |
| `pages/blog/index.ts` | `/blog`      |
| `pages/blog/post.ts`  | `/blog/post` |

## Dynamic routes

Dynamic routes are supported using the `[slug]` syntax. This works for files,
folders, or both. For example:

| File name                     | Route pattern              | Matching paths                          |
|-------------------------------|----------------------------|-----------------------------------------|
| `index.ts`                    | `/`                        | `/`                                     |
| `about.ts`                    | `/about`                   | `/about`                                |
| `blog/index.ts`               | `/blog`                    | `/blog`                                 |
| `blog/[slug].ts`              | `/blog/:slug`              | `/blog/foo`, `/blog/bar`                |
| `blog/[slug]/comments.ts`     | `/blog/:slug/comments`     | `/blog/foo/comments`                    |
| `old/[...path].ts`            | `/old/:path*`              | `/old/foo`, `/old/bar/baz`              |
| `docs/[version]/index.ts`     | `/docs{/:version}?`        | `/docs`, `/docs/latest`, `/docs/canary` |

Matching slug values are provided as the second argument to your handler. Given
the files as defined in the table above, the route `/example/route` will be provided
a params object of the shape `{ id1: 'example', id2: 'route' }`:

```typescript
// my-app/pages/[id1]/[id2].ts
import { createRoute } from "jsr:@pomdtr/fsrouter";

// req url: /example/route
export default createRoute((req, params) => {
  console.log(params.id1); // 'example'
  console.log(params.id2); // 'route'

  return new Response("Matched dynamic route!");
})
```

## Permissions

Using `fsrouter` requires both `--allow-read` and `--allow-net` for the
following reasons:

- `--allow-read`: `fsrouter` needs to traverse the filesystem in order to
  discover handler files
- `--allow-net`: `fsrouter` itself doesn't actually need network access, but
  since it's very likely your script will include using `fsrouter` in tandem
  with some sort of file server, you'll likely need this permission grant

# `fsrouter`

A file system based router for [Deno](https://deno.land).

## Basic usage

Given a project with the following folder structure:

```bash
my-app/
├─ pages/
│  ├─ blog/
│  │  ├─ post.ts
│  │  ├─ index.ts
│  ├─ about.ts
│  ├─ index.ts
├─ mod.ts
```

Each "route file" must export a
[FsHandler](https://deno.land/x/fsrouter/mod.ts?s=FsHandler) as its default
export:

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

/** @jsx h */
import { h, renderSSR } from "https://deno.land/x/nano_jsx@v0.0.33/mod.ts";

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
  const html = renderSSR(<App />);

  return new Response(html, {
    headers: {
      "content-type": "text/html",
    },
  });
};
```

Initialize a server by calling `fsRouter`:

```typescript
// my-app/mod.ts
import { fsRouter } from "jsr:@pomdtr/fsrouter";

export default {
  fetch: fsRouter(import.meta.resolve("./pages")),
}
```

Now running:

```bash
deno run --allow-read --allow-net my-app/mod.ts
```

Results in routes being served as follows:

| File                  | Route        |
| --------------------- | ------------ |
| `pages/index.ts`      | `/`          |
| `pages/about.ts`      | `/about`     |
| `pages/blog/index.ts` | `/blog`      |
| `pages/blog/post.ts`  | `/blog/post` |

An options object can be provided as the second argument to `fsRouter`. See
[RouterOptions](https://deno.land/x/fsrouter/mod.ts?s=RouterOptions) for
details.

## Dynamic routes

Dynamic routes are supported using the `[slug]` syntax. This works for files,
folders, or both. For example:

| File                   | Matches                         |
| ---------------------- | ------------------------------- |
| `pages/blog/[id].ts`   | `/blog/123`, `/blog/first-post` |
| `pages/[id1]/[id2].ts` | `/any/route`                    |
| `pages/[fallback].ts`  | `/caught-all`, `/any`           |

Matching slug values are provided as the second argument to `FsHandler`. Given
the files as defined in the table above, the route `/any/route` will be provided
a slug object of the shape `{ id1: 'any', id2: 'route' }`:

```typescript
// my-app/pages/[id1]/[id2].ts
import { type Slugs } from "https://deno.land/x/fsrouter@{VERSION}/mod.ts";

// req url: /any/route
export default (req: Request, slugs: Slugs) => {
  console.log(slugs.id1); // 'any'
  console.log(slugs.id2); // 'route'

  return new Response("Matched dynamic route!");
};
```

## Typed dynamic routes

Slugs can optionally include a `:string` or `:number` postfix to exclusively
match strings and numbers respectively. For example:

| File                        | Matches                                 |
| --------------------------- | --------------------------------------- |
| `pages/blog/[id:number].ts` | `/blog/123`, `/blog/45`                 |
| `pages/blog/[id:string].ts` | `/blog/first-post`, `/blog/second-post` |

## Permissions

Using `fsrouter` requires both `--allow-read` and `--allow-net` for the
following reasons:

- `--allow-read`: `fsrouter` needs to traverse the filesystem in order to
  discover handler files
- `--allow-net`: `fsrouter` itself doesn't actually need network access, but
  since it's very likely your script will include using `fsrouter` in tandem
  with some sort of file server, you'll likely need this permission grant

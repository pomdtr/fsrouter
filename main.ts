import { router } from "./mod.ts";

export default {
    fetch: router("./example", () => { return new Response("Not found", { status: 404 }); })
} satisfies Deno.ServeDefaultExport

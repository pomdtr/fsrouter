import { route } from "./mod.ts";

export default {
    fetch: route("./example", () => { return new Response("Not found", { status: 404 }); })
} satisfies Deno.ServeDefaultExport

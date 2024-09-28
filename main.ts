import { createRouter } from "./mod.ts";

export default {
    fetch: createRouter(import.meta.resolve("./example")),
}

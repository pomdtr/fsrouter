import { fsRouter } from "./mod.ts";

export default {
    fetch: fsRouter(import.meta.resolve("./example")),
}

import { router } from "jsr:@pomdtr/fsrouter"
import { serveDir } from "jsr:@std/http/file-server"

export default {
    fetch: router("./example", (req) => {
        return serveDir(req, {
            fsRoot: "./public",
        })
    })
}

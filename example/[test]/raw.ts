import { createRoute } from "../../mod.ts";


export default createRoute((_req, params) => {
  return new Response(`/example/${params.test}/raw`);
});

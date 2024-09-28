import { route } from "jsr:@pomdtr/fsrouter";

export default route((_req, params) => {
  return new Response(`/${params.test}/${params.user}`);
});

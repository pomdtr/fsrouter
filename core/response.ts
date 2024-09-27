export function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

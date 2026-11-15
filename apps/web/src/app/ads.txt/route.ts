export const dynamic = "force-static";

export function GET(): Response {
  return new Response(
    "# monetag\n# TODO: insert the authorized seller records supplied by Monetag.\n",
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
}

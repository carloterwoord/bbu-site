export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/auth") {
      return new Response(
        JSON.stringify({
          message:
            "OAuth worker placeholder. Deploy a Sveltia/Decap-compatible authenticator implementation before production use.",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Sveltia OAuth worker placeholder", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};

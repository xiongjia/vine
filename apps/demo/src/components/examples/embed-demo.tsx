// embed.html is mounted at /vine/examples/ by the demo dev/preview widget-dist plugin
const EMBED_URL = "/vine/examples/embed.html";

/** Embed demo — link to the plain-HTML widget example. */
const EmbedDemo = () => (
  <section className="pb-6">
    <h2 className="mb-1 text-xl font-semibold">Embed in plain HTML</h2>
    <p className="mb-4 text-sm text-muted-foreground">
      The same map as a self-contained widget — no React, no build step.
    </p>
    <a
      href={EMBED_URL}
      className="inline-block rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      Open embed.html →
    </a>
  </section>
);

export { EmbedDemo };

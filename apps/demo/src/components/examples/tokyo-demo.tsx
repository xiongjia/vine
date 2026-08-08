import { CodeToggle, MapView, tokyoMarkers, tokyoTracks } from "@vine/ui";
import { demoConfig } from "../../config";
import { tokyoCode } from "../../lib/example-snippets";

const cfg = demoConfig();

/** Tokyo demo — a different region file with the dark flavor. */
const TokyoDemo = () => (
  <section>
    <h2 className="mb-1 text-xl font-semibold">东京 · Tokyo</h2>
    <p className="mb-4 text-sm text-muted-foreground">
      A different region file with the dark flavor.
    </p>
    <MapView
      className="h-[420px] w-full rounded-xl border"
      basemap={{ url: `${cfg.pmtilesPrefix}tokyo.pmtiles`, flavor: "dark" }}
      center={[139.7, 35.68]}
      zoom={12}
      markers={tokyoMarkers}
      tracks={tokyoTracks}
      openMarkerIndex={0}
    />
    <CodeToggle code={tokyoCode} />
  </section>
);

export { TokyoDemo };

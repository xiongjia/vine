import { CodeToggle, MapView, shanghaiMarkers, shanghaiTracks } from "@vine/ui";
import { demoConfig } from "../../config";
import { shanghaiCode } from "../../lib/example-snippets";

const cfg = demoConfig();

/** Hero demo — Shanghai: markers + riverside track + HUD + first popup open. */
const ShanghaiDemo = () => (
  <section>
    <h2 className="mb-1 text-xl font-semibold">上海 · Shanghai</h2>
    <p className="mb-4 text-sm text-muted-foreground">
      Markers, a riverside track, the live center HUD, and the first marker
      popup open on load.
    </p>
    <MapView
      className="h-[480px] w-full rounded-xl border"
      basemap={{ url: `${cfg.pmtilesPrefix}shanghai.pmtiles`, flavor: "light" }}
      center={[121.47, 31.23]}
      zoom={12}
      markers={shanghaiMarkers}
      tracks={shanghaiTracks}
      openMarkerIndex={0}
      showCenterHud
    />
    <CodeToggle code={shanghaiCode} />
  </section>
);

export { ShanghaiDemo };

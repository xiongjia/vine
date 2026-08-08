import { useState } from "react";
import { CodeToggle, MapView, shanghaiMarkers } from "@vine/ui";
import type { MapFlavor } from "@vine/ui";
import { demoConfig } from "../../config";
import { styleCode } from "../../lib/example-snippets";

const cfg = demoConfig();

const FLAVORS: MapFlavor[] = ["light", "dark", "grayscale", "black"];

/** Styles demo — switch the Protomaps flavor at runtime (style re-applied in place, map is not recreated). */
const StylesDemo = () => {
  const [flavor, setFlavor] = useState<MapFlavor>("light");
  const tabCls = (active: boolean) =>
    `rounded px-2.5 py-1 text-xs transition-colors ${
      active
        ? "bg-accent text-accent-foreground font-medium"
        : "hover:bg-accent/50"
    }`;
  return (
    <section>
      <h2 className="mb-1 text-xl font-semibold">Styles</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Switch the Protomaps flavor at runtime — the style is re-applied in
        place, the map is not recreated.
      </p>
      <div className="mb-3 flex items-center gap-1">
        {FLAVORS.map((f) => (
          <button
            key={f}
            onClick={() => setFlavor(f)}
            className={tabCls(flavor === f)}
          >
            {f}
          </button>
        ))}
      </div>
      <MapView
        className="h-[420px] w-full rounded-xl border"
        basemap={{ url: `${cfg.pmtilesPrefix}shanghai.pmtiles`, flavor }}
        center={[121.47, 31.23]}
        zoom={12}
        markers={shanghaiMarkers}
      />
      <CodeToggle code={styleCode} />
    </section>
  );
};

export { StylesDemo };

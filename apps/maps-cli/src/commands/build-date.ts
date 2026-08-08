/** Query the latest Protomaps daily build date (YYYYMMDD). Network. */
export async function latestBuildDate(): Promise<string> {
  const res = await fetch("https://build-metadata.protomaps.dev/builds.json");
  if (!res.ok) throw new Error(`builds.json HTTP ${res.status}`);
  const data = (await res.json()) as Array<{ key: string }>;
  // The list is expected oldest-first, but do not rely on the order — pick the
  // max key (YYYYMMDD sorts lexicographically).
  const latest = data.reduce<string | undefined>(
    (max, b) => (max === undefined || b.key > max ? b.key : max),
    undefined,
  );
  if (!latest) throw new Error("builds.json has no data");
  // the key looks like "20260805.pmtiles" — take the date part
  const date = latest.replace(/\.pmtiles$/, "");
  if (!/^\d{8}$/.test(date))
    throw new Error(`cannot parse build date: ${latest}`);
  return date;
}

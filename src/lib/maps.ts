import "server-only";

export function mapsEnabled(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

const MAX_TRAVEL_MIN = 240; // garde-fou : ignore un résultat aberrant
const CHUNK_SIZE = 25; // limite Distance Matrix par requête

type DistanceMatrixResponse = {
  status: string;
  rows?: { elements?: { status: string; duration?: { value: number } }[] }[];
};

/**
 * Temps de trajet (minutes, arrondi au supérieur) entre `origin` et chaque
 * adresse de `destinations`. Sans clé API ou en cas d'échec, l'adresse est
 * simplement absente du résultat (l'appelant retombe sur son battement fixe).
 */
export async function travelMinutesBatch(
  origin: string,
  destinations: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const unique = [...new Set(destinations.filter((d) => d.trim()))];
  if (!key || !origin.trim() || unique.length === 0) return result;

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    try {
      const url = new URL(
        "https://maps.googleapis.com/maps/api/distancematrix/json",
      );
      url.searchParams.set("origins", origin);
      url.searchParams.set("destinations", chunk.join("|"));
      url.searchParams.set("mode", "driving");
      url.searchParams.set("language", "fr-CA");
      url.searchParams.set("region", "ca");
      url.searchParams.set("key", key);

      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const data = (await res.json()) as DistanceMatrixResponse;
      if (data.status !== "OK") continue;

      const elements = data.rows?.[0]?.elements ?? [];
      chunk.forEach((dest, idx) => {
        const el = elements[idx];
        if (el?.status === "OK" && typeof el.duration?.value === "number") {
          const minutes = Math.min(
            MAX_TRAVEL_MIN,
            Math.ceil(el.duration.value / 60),
          );
          result.set(dest, minutes);
        }
      });
    } catch (err) {
      console.error("travelMinutesBatch:", err);
    }
  }

  return result;
}

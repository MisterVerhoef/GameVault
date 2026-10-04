const platformNames = new Map([
  ["PC", "PC"],
  ["PlayStation 5", "PS5"],
  ["Xbox Series X|S", "Xbox"],
  ["Xbox Series X/S", "Xbox"],
  ["Nintendo Switch", "Switch"],
]);

function imageUrl(image) {
  return image?.url?.replace(/^\/\//, "https://");
}

export function normalizeIgdbRecord(record) {
  const platforms = (record.platforms ?? [])
    .map((platform) => platformNames.get(platform.name))
    .filter(Boolean);
  const year = record.first_release_date
    ? new Date(record.first_release_date * 1000).getUTCFullYear()
    : undefined;

  return {
    id: String(record.id ?? ""),
    title: record.name,
    slug: record.slug,
    summary: record.summary,
    description: record.storyline ?? record.summary,
    releaseYear: year,
    genres: (record.genres ?? []).map((genre) => genre.name).filter(Boolean),
    platforms,
    cover: imageUrl(record.cover),
    background: imageUrl(record.artworks?.[0]),
    rating: record.rating,
    ratingCount: record.rating_count,
    sourceId: String(record.id ?? ""),
  };
}

export function normalizeIgdbExport(input) {
  const records = Array.isArray(input) ? input : input?.games;
  if (!Array.isArray(records)) {
    throw new Error("IGDB input must be an array or an object containing a games array.");
  }
  return records.map(normalizeIgdbRecord);
}

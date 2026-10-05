const platformNames = new Map([
  ["PC", "PC"],
  ["PC (Microsoft Windows)", "PC"],
  ["Mac", "PC"],
  ["Linux", "PC"],
  ["PlayStation 5", "PS5"],
  ["PlayStation 4", "PS5"],
  ["PlayStation 3", "PS5"],
  ["PlayStation 2", "PS5"],
  ["Xbox Series X|S", "Xbox"],
  ["Xbox Series X/S", "Xbox"],
  ["Xbox Series", "Xbox"],
  ["Xbox One", "Xbox"],
  ["Xbox 360", "Xbox"],
  ["Nintendo Switch", "Switch"],
]);

function imageUrl(image) {
  return image?.url?.replace(/^\/\//, "https://");
}

function contentRefs(records = []) {
  return records
    .filter((record) => record?.id && record?.name)
    .map((record) => ({ id: String(record.id), title: record.name }));
}

function companies(involvedCompanies = [], developer) {
  return involvedCompanies
    .filter((entry) => entry?.company?.id && entry.company.name && Boolean(entry.developer) === developer)
    .map((entry) => ({ id: String(entry.company.id), name: entry.company.name }));
}

export function normalizeIgdbRecord(record) {
  const unsupportedPlatforms = (record.platforms ?? [])
    .map((platform) => platform.name)
    .filter((name) => name && !platformNames.has(name));
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
    themes: (record.themes ?? []).map((theme) => theme.name).filter(Boolean),
    developers: companies(record.involved_companies, true),
    publishers: companies(record.involved_companies, false),
    platforms,
    cover: imageUrl(record.cover),
    background: imageUrl(record.artworks?.[0]),
    screenshots: (record.screenshots ?? []).map((image) => ({
      url: imageUrl(image),
      width: image.width,
      height: image.height,
    })).filter((image) => image.url),
    videos: (record.videos ?? []).filter((video) => video.video_id).map((video) => ({
      id: String(video.id),
      name: video.name,
      url: `https://www.youtube.com/watch?v=${video.video_id}`,
    })),
    websites: (record.websites ?? []).filter((site) => site.url).map((site) => ({
      label: site.name ?? "Official website",
      url: site.url,
      category: site.category === 1 ? "store" : "website",
    })),
    dlc: contentRefs(record.dlcs),
    expansions: contentRefs(record.expansions),
    editions: contentRefs(record.editions),
    relatedGames: (record.remakes ?? []).map((game) => ({
      id: String(game.id),
      title: game.name,
      relation: "remake",
    })).concat((record.remasters ?? []).map((game) => ({
      id: String(game.id),
      title: game.name,
      relation: "sequel",
    }))),
    similarGames: contentRefs(record.similar_games),
    franchises: (record.franchises ?? []).map((franchise) => franchise.name).filter(Boolean),
    collections: (record.collections ?? []).map((collection) => collection.name).filter(Boolean),
    rating: record.rating,
    ratingCount: record.rating_count,
    sourceId: String(record.id ?? ""),
    warnings: unsupportedPlatforms.map((platform) => `Unsupported IGDB platform omitted: ${platform}`),
  };
}

export function normalizeIgdbExport(input) {
  const records = Array.isArray(input) ? input : input?.games;
  if (!Array.isArray(records)) {
    throw new Error("IGDB input must be an array or an object containing a games array.");
  }
  return records
    .map(normalizeIgdbRecord)
    .filter((record) => record.platforms.length > 0);
}

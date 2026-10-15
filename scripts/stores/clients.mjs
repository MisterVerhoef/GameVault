import { fetchJson, httpsUrl, isMiss } from "./http.mjs";

const CONCEPT_HASH = process.env.PS_CONCEPT_HASH ?? "cc90404ac049d935afbd9968aef523da2b6723abfb9d586e5f77ebf7c5289006";
const PRICING_HASH = process.env.PS_PRICING_HASH ?? "abcb311ea830e679fe2b697a27f755764535d825b24510ab1239a4ca3092bd09";

function unique(urls) {
  return [...new Set(urls.filter(Boolean))];
}

function euro(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

export function microsoftProduct(product) {
  const localized = product?.LocalizedProperties?.[0] ?? {};
  const images = localized.Images ?? [];
  const uri = (image) => httpsUrl(image?.Uri ?? image?.Url);
  const cover = images.find((image) => image.ImagePurpose === "BoxArt")
    ?? images.find((image) => image.ImagePurpose === "Poster");
  const screenshots = unique(images.filter((image) => image.ImagePurpose === "Screenshot").map(uri)).slice(0, 4);
  const availability = (product.DisplaySkuAvailabilities ?? [])
    .flatMap((sku) => sku.Availabilities ?? [])
    .find((entry) => entry?.OrderManagementData?.Price?.CurrencyCode === "EUR");
  const price = availability?.OrderManagementData?.Price;
  return {
    id: product.ProductId,
    title: localized.ProductTitle ?? "",
    kind: "game",
    price: euro(price?.ListPrice),
    regularPrice: euro(price?.MSRP ?? price?.ListPrice),
    currency: price?.CurrencyCode === "EUR" ? "EUR" : undefined,
    description: localized.ProductDescription || localized.ShortDescription || undefined,
    cover: cover ? uri(cover) : undefined,
    screenshots,
    url: `https://www.xbox.com/nl-nl/games/store/game/${product.ProductId}`,
  };
}

export async function lookupMicrosoft(ids, wait) {
  if (ids.length === 0) return new Map();
  await wait();
  const url = new URL("https://displaycatalog.mp.microsoft.com/v7.0/products");
  url.searchParams.set("bigIds", ids.join(","));
  url.searchParams.set("market", "NL");
  url.searchParams.set("languages", "nl-NL");
  url.searchParams.set("fieldsTemplate", "Details");
  const body = await fetchJson(url);
  const found = new Map();
  for (const product of body.Products ?? []) {
    if (product?.ProductId) found.set(product.ProductId.toUpperCase(), microsoftProduct(product));
  }
  return found;
}

export async function searchMicrosoft(title, wait) {
  await wait();
  const url = new URL("https://displaycatalog.mp.microsoft.com/v7.0/productFamilies/autosuggest");
  url.searchParams.set("query", title);
  url.searchParams.set("market", "NL");
  url.searchParams.set("languages", "nl-NL");
  url.searchParams.set("platformdependencyname", "Windows.Xbox");
  url.searchParams.set("productFamilyNames", "Games");
  url.searchParams.set("topProducts", "8");
  const body = await fetchJson(url);
  const candidates = [];
  for (const result of body.Results ?? []) {
    for (const product of result.Products ?? []) {
      if (!product?.ProductId || !product.Title) continue;
      candidates.push({
        id: String(product.ProductId).toUpperCase(),
        title: product.Title,
        kind: product.Type === "Game" ? "game" : "other",
      });
    }
  }
  return candidates;
}

async function playstationGraphql(operationName, hash, variables, wait) {
  await wait();
  const url = new URL("https://web.np.playstation.com/api/graphql/v1/op");
  url.searchParams.set("operationName", operationName);
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("extensions", JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }));
  try {
    return await fetchJson(url, {
      "Content-Type": "application/json",
      "apollographql-client-name": "PlayStationApp-Android",
      "Accept-Language": "nl-NL",
    });
  } catch (error) {
    if (String(error.body ?? "").includes("not whitelisted")) {
      const blocked = new Error("PlayStation persisted query was rejected");
      blocked.status = 400;
      blocked.fatal = true;
      throw blocked;
    }
    throw error;
  }
}

export function playstationMedia(concept) {
  const product = concept?.defaultProduct ?? {};
  const media = [...(product.media ?? []), ...(concept?.media ?? [])];
  const image = (role) => media.find((item) => item?.role === role && item.type === "IMAGE" && item.url)?.url;
  const screenshots = unique(media.filter((item) => item?.role === "SCREENSHOT" && item.url).map((item) => item.url)).slice(0, 4);
  const trailer = media.find((item) => item?.role === "PREVIEW" && item.type === "VIDEO" && item.url)?.url;
  const description = (product.descriptions ?? []).find((entry) => entry?.type === "LONG")?.value
    ?? (concept?.descriptions ?? []).find((entry) => entry?.type === "LONG")?.value;
  return {
    title: product.name || concept?.name || "",
    description,
    cover: image("GAMEHUB_COVER_ART") || image("MASTER") || image("EDITION_KEY_ART"),
    screenshots,
    trailer,
  };
}

export async function lookupPlayStationConcept(conceptId, wait, { media = false } = {}) {
  const priced = await playstationGraphql("metGetPricingDataByConceptId", PRICING_HASH, { conceptId }, wait);
  const product = priced?.data?.conceptRetrieve?.defaultProduct;
  if (!product?.id) return undefined;
  const ctas = product.mobilectas ?? [];
  const outright = ctas.find((cta) => (
    cta?.price?.currencyCode === "EUR" &&
    cta.price.isTiedToSubscription !== true &&
    typeof cta.price.discountedValue === "number" &&
    typeof cta.price.basePriceValue === "number"
  ));
  let details = {};
  if (media) {
    const concept = await playstationGraphql("metGetConceptById", CONCEPT_HASH, { conceptId }, wait);
    details = playstationMedia(concept?.data?.conceptRetrieve);
  }
  return {
    id: String(product.id),
    title: product.name || product.invariantName || details.title || "",
    kind: "game",
    price: outright ? outright.price.discountedValue / 100 : null,
    regularPrice: outright ? outright.price.basePriceValue / 100 : null,
    currency: outright ? "EUR" : undefined,
    description: details.description,
    cover: details.cover,
    screenshots: details.screenshots ?? [],
    trailer: details.trailer,
    url: `https://store.playstation.com/nl-nl/concept/${conceptId}`,
  };
}

export async function lookupPlayStationProduct(productId, wait) {
  await wait();
  const url = `https://store.playstation.com/store/api/chihiro/00_09_000/container/NL/nl/999/${encodeURIComponent(productId)}`;
  let body;
  try {
    body = await fetchJson(url);
  } catch (error) {
    if (isMiss(error)) return undefined;
    throw error;
  }
  if (!body?.name) return undefined;
  const sku = body.default_sku ?? {};
  const cover = (body.images ?? []).find((image) => image.type === 10)?.url;
  const trailer = (body.promomedia ?? []).find((media) => media.key === "preview")?.url;
  const cents = typeof sku.price === "number" ? sku.price : null;
  return {
    id: productId,
    title: body.name,
    kind: "game",
    price: cents === null ? null : cents / 100,
    regularPrice: cents === null ? null : cents / 100,
    currency: cents === null ? undefined : "EUR",
    description: typeof body.long_desc === "string" ? body.long_desc : undefined,
    cover: httpsUrl(cover),
    screenshots: [],
    trailer: httpsUrl(trailer),
    url: `https://store.playstation.com/nl-nl/product/${productId}`,
  };
}

export async function searchPlayStation(title, wait) {
  await wait();
  const url = `https://store.playstation.com/store/api/chihiro/00_09_000/tumbler/NL/nl/999/${encodeURIComponent(title)}?size=25`;
  const body = await fetchJson(url);
  return (body.links ?? []).flatMap((link) => {
    if (!link?.id || !link.name) return [];
    const category = String(link.top_category ?? link.game_contentType ?? "").toLowerCase();
    const year = typeof link.release_date === "string" ? Number(link.release_date.slice(0, 4)) : undefined;
    return [{
      id: link.id,
      title: link.name,
      kind: category.includes("add") || category.includes("avatar") || category.includes("theme") ? "other" : "game",
      year: Number.isInteger(year) ? year : undefined,
      price: typeof link.default_sku?.price === "number" ? link.default_sku.price / 100 : null,
      regularPrice: typeof link.default_sku?.price === "number" ? link.default_sku.price / 100 : null,
      currency: typeof link.default_sku?.price === "number" ? "EUR" : undefined,
      url: `https://store.playstation.com/nl-nl/product/${link.id}`,
    }];
  });
}

function nintendoCandidate(doc) {
  const ids = (doc.nsuid_txt ?? []).map(String);
  const nsuid = ids.find((id) => id.startsWith("700100")) ?? ids[0];
  if (!nsuid || !doc.title) return undefined;
  const year = typeof doc.date_from === "string" ? Number(doc.date_from.slice(0, 4)) : undefined;
  const regular = euro(doc.price_regular_f ?? doc.price_lowest_f);
  const onSale = doc.price_has_discount_b === true;
  return {
    id: nsuid,
    title: doc.title,
    kind: doc.type === "GAME" ? "game" : "other",
    year: Number.isInteger(year) ? year : undefined,
    price: euro(onSale ? doc.price_lowest_f : regular),
    regularPrice: regular,
    currency: typeof doc.price_lowest_f === "number" ? "EUR" : undefined,
    description: doc.product_catalog_description_s,
    cover: httpsUrl(doc.image_url_sq_s || doc.image_url),
    screenshots: [],
    url: typeof doc.url === "string" ? `https://www.nintendo.com${doc.url}` : undefined,
  };
}

async function nintendoSelect(params, wait) {
  await wait();
  const url = new URL("https://search.nintendo-europe.com/nl/select");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const body = await fetchJson(url);
  return (body?.response?.docs ?? []).map(nintendoCandidate).filter(Boolean);
}

export async function lookupNintendo(nsuid, wait) {
  const docs = await nintendoSelect({
    q: "*:*",
    fq: `type:GAME AND nsuid_txt:${nsuid}`,
    rows: "1",
    wt: "json",
  }, wait);
  return docs[0];
}

export async function searchNintendo(title, wait) {
  const exact = await nintendoSelect({
    q: `title:"${title.replace(/"/g, "")}"`,
    fq: "type:GAME",
    rows: "5",
    wt: "json",
  }, wait);
  if (exact.length > 0) return exact;
  return nintendoSelect({
    q: title,
    fq: "type:GAME",
    rows: "8",
    wt: "json",
  }, wait);
}

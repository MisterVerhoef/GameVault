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

const STEAM_OTHER = new Set(["dlc", "music", "software", "video", "demo", "mod", "advertising", "hardware"]);

function releaseYear(value) {
  const match = String(value ?? "").match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : undefined;
}

function cents(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) / 100 : null;
}

export function steamCandidate(appId, data) {
  if (!data?.name) return undefined;
  const overview = data.price_overview;
  const free = data.is_free === true;
  const priced = overview?.currency === "EUR";
  const screenshots = unique((data.screenshots ?? []).slice(0, 4).map((shot) => httpsUrl(shot?.path_full)));
  const movie = (data.movies ?? []).find((entry) => entry?.mp4?.max || entry?.webm?.max);
  let price = null;
  let regularPrice = null;
  let currency;
  if (free) {
    price = 0;
    regularPrice = 0;
    currency = "EUR";
  } else if (priced) {
    price = cents(overview.final);
    regularPrice = cents(overview.initial);
    currency = "EUR";
  }
  return {
    id: String(data.steam_appid ?? appId),
    title: data.name,
    kind: data.type === "game" ? "game" : "other",
    year: releaseYear(data.release_date?.date),
    price,
    regularPrice,
    currency,
    description: typeof data.short_description === "string" ? data.short_description : undefined,
    cover: httpsUrl(data.header_image),
    screenshots,
    trailer: httpsUrl(movie?.mp4?.max || movie?.webm?.max),
    url: `https://store.steampowered.com/app/${data.steam_appid ?? appId}`,
  };
}

async function steamDetails(appId, wait) {
  await wait();
  const url = new URL("https://store.steampowered.com/api/appdetails");
  url.searchParams.set("appids", String(appId));
  url.searchParams.set("cc", "nl");
  url.searchParams.set("l", "dutch");
  const body = await fetchJson(url);
  return body?.[String(appId)];
}

export async function lookupSteam(appId, wait) {
  let entry = await steamDetails(appId, wait);
  if (!entry?.success || !entry.data) {
    // Steam sometimes answers a rate limit with success:false. One delayed
    // retry separates that from an app that is not in the NL catalogue.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    entry = await steamDetails(appId, wait);
  }
  if (!entry?.success || !entry.data) return undefined;
  return steamCandidate(appId, entry.data);
}

export async function searchSteam(title, wait) {
  await wait();
  const url = new URL("https://store.steampowered.com/api/storesearch/");
  url.searchParams.set("term", title);
  url.searchParams.set("l", "dutch");
  url.searchParams.set("cc", "NL");
  const body = await fetchJson(url);
  return (body?.items ?? []).flatMap((item) => {
    if (!item?.id || !item.name) return [];
    const type = String(item.type ?? "").toLowerCase();
    const price = item.price;
    const priced = price?.currency === "EUR" && typeof price.final === "number";
    return [{
      id: String(item.id),
      title: item.name,
      kind: STEAM_OTHER.has(type) ? "other" : "game",
      price: priced ? price.final / 100 : null,
      regularPrice: priced && typeof price.initial === "number" ? price.initial / 100 : null,
      currency: priced ? "EUR" : undefined,
      url: `https://store.steampowered.com/app/${item.id}`,
    }];
  });
}

let gogLocale = "nl-NL";

function gogYear(value) {
  const year = Number(String(value ?? "").slice(0, 4));
  return year >= 1970 && year <= 2100 ? year : undefined;
}

function gogAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100) / 100;
  if (typeof value !== "string" || value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function gogApiPrice(value) {
  const match = String(value ?? "").match(/^(-?\d+(?:\.\d+)?)\s+([A-Z]{3})$/);
  if (!match) return undefined;
  return { amount: Number(match[1]) / 100, currency: match[2] };
}

export function gogCandidate(product) {
  if (!product?.title) return undefined;
  const slug = typeof product.slug === "string" && product.slug ? product.slug : undefined;
  const id = slug || (product.id != null ? String(product.id) : "");
  if (!id) return undefined;
  const finalMoney = product.price?.finalMoney;
  const baseMoney = product.price?.baseMoney;
  const currency = finalMoney?.currency === "EUR" ? "EUR" : undefined;
  const type = String(product.productType ?? product.game_type ?? "");
  return {
    id,
    title: product.title,
    kind: type === "game" || type === "pack" ? "game" : "other",
    year: gogYear(product.releaseDate ?? product.release_date),
    price: currency ? gogAmount(finalMoney.amount) : null,
    regularPrice: currency ? gogAmount(baseMoney?.amount ?? finalMoney.amount) : null,
    currency,
    description: typeof product.description === "string" ? product.description : undefined,
    cover: httpsUrl(product.coverVertical || product.coverHorizontal),
    screenshots: [],
    url: typeof product.storeLink === "string" && product.storeLink.startsWith("https://")
      ? product.storeLink
      : `https://www.gog.com/en/game/${slug || id}`,
  };
}

async function gogCatalog(query, wait, limit = "20") {
  async function request(locale) {
    await wait();
    const url = new URL("https://catalog.gog.com/v1/catalog");
    url.searchParams.set("limit", limit);
    url.searchParams.set("countryCode", "NL");
    url.searchParams.set("locale", locale);
    url.searchParams.set("currencyCode", "EUR");
    url.searchParams.set("productType", "in:game,pack");
    url.searchParams.set("query", `like:${query}`);
    const body = await fetchJson(url);
    return Array.isArray(body?.products) ? body.products : [];
  }
  const products = await request(gogLocale);
  if (products.length > 0 || gogLocale === "en-US") return products;
  gogLocale = "en-US";
  return request("en-US");
}

export async function lookupGog(id, wait) {
  const key = String(id);
  if (/^\d+$/.test(key)) {
    await wait();
    let product;
    try {
      product = await fetchJson(`https://api.gog.com/products/${key}?locale=en-US`);
    } catch (error) {
      if (isMiss(error)) return undefined;
      throw error;
    }
    if (!product?.title) return undefined;
    await wait();
    let prices;
    try {
      prices = await fetchJson(`https://api.gog.com/products/${key}/prices?countryCode=NL`);
    } catch (error) {
      // 400 PRICES_NOT_FOUND means the product exists but has no Netherlands price.
      if (isMiss(error) || error.status === 400) prices = undefined;
      else throw error;
    }
    const listed = (prices?._embedded?.prices ?? []).find((entry) => entry?.currency?.code === "EUR");
    const finalPrice = gogApiPrice(listed?.finalPrice);
    const basePrice = gogApiPrice(listed?.basePrice);
    const slug = typeof product.slug === "string" ? product.slug : "";
    return {
      id: slug || key,
      title: product.title,
      kind: product.game_type === "game" ? "game" : "other",
      year: gogYear(product.release_date),
      price: finalPrice?.currency === "EUR" ? finalPrice.amount : null,
      regularPrice: basePrice?.currency === "EUR" ? basePrice.amount : finalPrice?.amount ?? null,
      currency: finalPrice?.currency === "EUR" ? "EUR" : undefined,
      description: typeof product.description === "string" ? product.description : undefined,
      cover: undefined,
      screenshots: [],
      url: `https://www.gog.com/en/game/${slug || key}`,
    };
  }
  const products = await gogCatalog(key.replace(/[_-]+/g, " "), wait);
  const found = products.find((product) => product?.slug === key);
  return found ? gogCandidate(found) : undefined;
}

export async function searchGog(title, wait) {
  const products = await gogCatalog(title, wait, "10");
  return products.map(gogCandidate).filter(Boolean);
}

const EPIC_GRAPHQL = "https://store.epicgames.com/graphql";
const EPIC_SEARCH = `query searchStoreQuery($keywords: String!, $country: String!, $locale: String!, $count: Int, $category: String) {
  Catalog {
    searchStore(
      keywords: $keywords
      country: $country
      locale: $locale
      count: $count
      category: $category
      sortBy: "relevancy"
      sortDir: "DESC"
    ) {
      elements {
        title
        id
        namespace
        description
        effectiveDate
        categories { path }
        price(country: $country) { totalPrice { discountPrice originalPrice currencyCode } }
        catalogNs { mappings(pageType: "productHome") { pageSlug pageType } }
        offerMappings { pageSlug pageType }
      }
    }
  }
}`;

function epicSlug(element) {
  const mappings = [
    ...(element?.catalogNs?.mappings ?? []),
    ...(element?.offerMappings ?? []),
  ];
  const home = mappings.find((mapping) => mapping?.pageType === "productHome" && mapping.pageSlug);
  return home?.pageSlug || element?.productSlug || element?.urlSlug || "";
}

function epicKind(element) {
  const paths = (element?.categories ?? []).map((category) => String(category?.path ?? ""));
  if (paths.some((path) => path.startsWith("addons") || path.includes("dlc") || path.includes("soundtrack"))) return "other";
  if (paths.includes("games/edition/base") || paths.includes("bundles/games") || paths.includes("games")) return "game";
  return "other";
}

function epicUrl(slug, element) {
  const paths = (element?.categories ?? []).map((category) => String(category?.path ?? ""));
  const bundle = paths.includes("bundles/games") || paths.includes("bundles");
  return `https://store.epicgames.com/en-US/${bundle ? "bundles" : "p"}/${slug}`;
}

export function epicCandidate(element) {
  const slug = epicSlug(element);
  if (!slug || !element?.title) return undefined;
  const total = element.price?.totalPrice;
  const priced = total?.currencyCode === "EUR";
  return {
    id: slug,
    title: element.title,
    kind: epicKind(element),
    year: releaseYear(element.effectiveDate),
    price: priced ? cents(total.discountPrice) : null,
    regularPrice: priced ? cents(total.originalPrice) : null,
    currency: "EUR",
    description: typeof element.description === "string" ? element.description : undefined,
    cover: undefined,
    screenshots: [],
    url: epicUrl(slug, element),
  };
}

function epicFatal(error) {
  if (error?.status === 401 || error?.status === 403) error.fatal = true;
  return error;
}

async function epicQuery(keywords, category, count) {
  const body = await fetchJson(EPIC_GRAPHQL, {
    "Content-Type": "application/json",
    Origin: "https://store.epicgames.com",
    Referer: "https://store.epicgames.com/",
  }, {
    method: "POST",
    body: JSON.stringify({
      query: EPIC_SEARCH,
      variables: {
        keywords,
        country: "NL",
        locale: "en-US",
        count,
        category,
      },
    }),
  });
  const elements = body?.data?.Catalog?.searchStore?.elements;
  if (!Array.isArray(elements)) {
    const rejected = new Error(body?.errors?.[0]?.message || "Epic Games Store rejected the catalogue query");
    rejected.status = 400;
    rejected.fatal = true;
    throw rejected;
  }
  return elements;
}

async function epicSearch(keywords, wait, { category, count }) {
  let last;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await wait();
    try {
      return await epicQuery(keywords, category, count);
    } catch (error) {
      last = error;
      if (error?.status === 429) throw error;
      if (error?.status !== 403) throw epicFatal(error);
      if (attempt === 3) throw epicFatal(error);
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  throw epicFatal(last);
}

function epicKeywords(slug) {
  const key = String(slug);
  const stem = key.replace(/-[0-9a-f]{6}$/i, "");
  return stem === key ? [key] : [stem, key];
}

/** Exact Epic page slug, or the one product that shares the URL's 6-character id suffix. */
export function matchEpicSlug(candidates, slug) {
  const list = candidates.filter((candidate) => candidate?.id && candidate.kind !== "other");
  const exact = [...new Map(list.filter((candidate) => candidate.id === slug).map((candidate) => [candidate.id, candidate])).values()];
  if (exact.length === 1) return exact[0];
  const suffix = String(slug).match(/-([0-9a-f]{6})$/i)?.[1].toLowerCase();
  if (!suffix) return undefined;
  const suffixed = [...new Map(
    list
      .filter((candidate) => String(candidate.id).toLowerCase().endsWith(`-${suffix}`))
      .map((candidate) => [candidate.id, candidate]),
  ).values()];
  return suffixed.length === 1 ? suffixed[0] : undefined;
}

export async function lookupEpic(slug, wait) {
  const keywords = epicKeywords(slug);
  for (const category of ["games/edition/base", "bundles/games"]) {
    for (const keyword of keywords) {
      const elements = await epicSearch(keyword, wait, { category, count: 12 });
      const found = matchEpicSlug(elements.map(epicCandidate).filter(Boolean), slug);
      if (found) return found;
    }
  }
  return undefined;
}

export async function searchEpic(title, wait) {
  const elements = await epicSearch(title, wait, { category: "games/edition/base", count: 8 });
  return elements.map(epicCandidate).filter(Boolean);
}

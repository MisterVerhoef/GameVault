/** Undocumented PlayStation Store GraphQL (persisted queries); hashes may change when the web store ships. */
const GRAPHQL_ORIGIN = "https://web.np.playstation.com/api/graphql/v1/op";
const EMS_CLIENT_ID = "b6de8d4d-bf9b-11ee-ad2a-aea73dc1ea43";

const QUERY_HASHES = {
  getExperience: "b5078800ed1bdebee9800979f9306abeadc5169030263f7095fe573b12e52270",
  categoryGridRetrieve: "88c0b9a1273c6d320c51cd73e390924e21ae28bf09f01cde8b84b1034b16cd03",
} as const;

const USER_AGENT = "GameVault/1.0 (+https://github.com/gamevault; personal catalogue app)";

const PAGE_SIZE = 24;
const MAX_PAGES = 50;
const PAGE_PAUSE_MS = 120;

export interface PlayStationGraphqlOptions {
  revalidate?: number;
}

async function playstationPersistedQuery<T>(
  operationName: string,
  hash: string,
  variables: Record<string, unknown>,
  init?: PlayStationGraphqlOptions,
): Promise<T> {
  const url = new URL(GRAPHQL_ORIGIN);
  url.searchParams.set("operationName", operationName);
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("extensions", JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "nl-NL",
      "User-Agent": USER_AGENT,
      "x-apollo-operation-name": operationName,
    },
    next: init?.revalidate ? { revalidate: init.revalidate } : undefined,
  });

  if (!response.ok) {
    throw new Error(`PlayStation GraphQL HTTP ${response.status} for ${operationName}`);
  }

  const body = await response.json() as { errors?: { message?: string }[]; data?: unknown };
  if (body.errors?.length) {
    throw new Error(body.errors.map((entry) => entry.message ?? "GraphQL error").join("; "));
  }
  return body as T;
}

export async function fetchDealsCategoryId(revalidate: number): Promise<string> {
  const body = await playstationPersistedQuery<{ data?: { emsExperienceRetrieve?: unknown } }>(
    "getExperience",
    QUERY_HASHES.getExperience,
    { clientId: EMS_CLIENT_ID, alias: "deals" },
    { revalidate },
  );
  const { assertPlayStationExperience } = await import("./playstation-deals-schema");
  return assertPlayStationExperience(body);
}

export interface CategoryGridPageResult {
  grid: import("./playstation-deals-schema").CategoryGridRetrievePayload;
  isLast: boolean;
  nextOffset: number;
}

export async function fetchCategoryGridPage(
  categoryId: string,
  offset: number,
  revalidate: number,
): Promise<CategoryGridPageResult> {
  const body = await playstationPersistedQuery<{ data?: { categoryGridRetrieve?: unknown } }>(
    "categoryGridRetrieve",
    QUERY_HASHES.categoryGridRetrieve,
    {
      id: categoryId,
      pageArgs: { size: PAGE_SIZE, offset },
      sortBy: null,
      filterBy: [],
      facetOptions: [],
    },
    { revalidate },
  );
  const { assertCategoryGridRetrieve } = await import("./playstation-deals-schema");
  const grid = assertCategoryGridRetrieve(body);
  const isLast = grid.pageInfo?.isLast === true;
  const nextOffset = offset + (grid.pageInfo?.size ?? PAGE_SIZE);
  return { grid, isLast, nextOffset };
}

export async function fetchAllDealsGridPages(
  categoryId: string,
  revalidate: number,
): Promise<import("./playstation-deals-schema").CategoryGridRetrievePayload[]> {
  const pages: import("./playstation-deals-schema").CategoryGridRetrievePayload[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { grid, isLast, nextOffset } = await fetchCategoryGridPage(categoryId, offset, revalidate);
    pages.push(grid);
    if (isLast) break;
    offset = nextOffset;
    if (page < MAX_PAGES - 1) {
      await new Promise((resolve) => setTimeout(resolve, PAGE_PAUSE_MS));
    }
  }
  return pages;
}
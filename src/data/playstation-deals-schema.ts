export interface CategoryGridPageInfo {
  offset?: number;
  size?: number;
  isLast?: boolean;
  totalCount?: number;
}

export interface CategoryGridRow {
  __typename?: string;
  id?: string;
  name?: string;
  platforms?: string[];
  storeDisplayClassification?: string;
  localizedStoreDisplayClassification?: string;
  media?: { role?: string; type?: string; url?: string }[];
  price?: Record<string, unknown>;
  products?: { id?: string }[];
}

export interface CategoryGridRetrievePayload {
  id?: string;
  pageInfo?: CategoryGridPageInfo;
  products?: CategoryGridRow[];
  concepts?: CategoryGridRow[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCategoryGridPageInfo(value: unknown): value is CategoryGridPageInfo {
  if (!isRecord(value)) return false;
  if (value.offset != null && typeof value.offset !== "number") return false;
  if (value.size != null && typeof value.size !== "number") return false;
  if (value.isLast != null && typeof value.isLast !== "boolean") return false;
  if (value.totalCount != null && typeof value.totalCount !== "number") return false;
  return true;
}

export function isCategoryGridRow(value: unknown): value is CategoryGridRow {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;
  if (value.name != null && typeof value.name !== "string") return false;
  if (value.platforms != null && (!Array.isArray(value.platforms) || value.platforms.some((p) => typeof p !== "string"))) {
    return false;
  }
  if (value.media != null && (!Array.isArray(value.media) || value.media.some((m) => !isRecord(m)))) return false;
  return true;
}

export function assertCategoryGridRetrieve(body: unknown): CategoryGridRetrievePayload {
  if (!isRecord(body) || !isRecord(body.data)) {
    throw new Error("PlayStation category grid response missing data root");
  }
  const grid = body.data.categoryGridRetrieve;
  if (!isRecord(grid)) {
    throw new Error("PlayStation category grid response missing categoryGridRetrieve");
  }
  if (!isCategoryGridPageInfo(grid.pageInfo)) {
    throw new Error("PlayStation category grid response has invalid pageInfo");
  }
  const products = grid.products ?? [];
  const concepts = grid.concepts ?? [];
  if (!Array.isArray(products) || !Array.isArray(concepts)) {
    throw new Error("PlayStation category grid response has invalid products or concepts");
  }
  for (const row of [...products, ...concepts]) {
    if (!isCategoryGridRow(row)) {
      throw new Error("PlayStation category grid response has invalid row");
    }
  }
  return grid as CategoryGridRetrievePayload;
}

export function assertPlayStationExperience(body: unknown): string {
  if (!isRecord(body) || !isRecord(body.data)) {
    throw new Error("PlayStation experience response missing data root");
  }
  const experience = body.data.emsExperienceRetrieve;
  if (!isRecord(experience)) {
    throw new Error("PlayStation experience response missing emsExperienceRetrieve");
  }
  const categoryId = findDealsCategoryIdInExperience(experience);
  if (!categoryId) {
    throw new Error("PlayStation deals experience did not expose a category grid id");
  }
  return categoryId;
}

function findDealsCategoryIdInExperience(experience: Record<string, unknown>): string | null {
  const queue: unknown[] = [experience];
  let best: string | null = null;
  while (queue.length > 0) {
    const current = queue.shift();
    if (!isRecord(current)) continue;
    if (current.__typename === "EMSStrandComponent" && typeof current.categoryId === "string") {
      best = current.categoryId;
    }
    for (const value of Object.values(current)) {
      if (Array.isArray(value)) queue.push(...value);
      else if (isRecord(value)) queue.push(value);
    }
  }
  return best;
}
export const LIST_NAME_LIMIT = 60;
export const LIST_LIMIT = 100;
export const LIST_GAME_LIMIT = 1000;

export interface GameList {
  id: string;
  name: string;
  gameIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListsState {
  schemaVersion: 1;
  lists: GameList[];
}

export const EMPTY_LISTS_STATE: ListsState = { schemaVersion: 1, lists: [] };

type ListError = { state: ListsState; error: string };
type ListSuccess = { state: ListsState; list: GameList };
export type ListResult = ListError | ListSuccess;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function timestamp(value: unknown, fallback: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : fallback;
}

function cleanName(value: unknown) {
  return typeof value === "string"
    ? value.trim().slice(0, LIST_NAME_LIMIT)
    : "";
}

export function normalizeListsState(raw: unknown): ListsState {
  if (!record(raw) || !Array.isArray(raw.lists))
    return { ...EMPTY_LISTS_STATE, lists: [] };
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const lists: GameList[] = [];

  for (const item of raw.lists) {
    if (!record(item) || typeof item.id !== "string" || !item.id.trim())
      continue;
    const id = item.id.trim();
    const name = cleanName(item.name);
    if (!name || seen.has(id) || lists.length >= LIST_LIMIT) continue;
    seen.add(id);
    const gameIds = Array.isArray(item.gameIds)
      ? [
          ...new Set(
            item.gameIds
              .filter(
                (gameId): gameId is string =>
                  typeof gameId === "string" && gameId.trim().length > 0,
              )
              .map((gameId) => gameId.trim()),
          ),
        ].slice(0, LIST_GAME_LIMIT)
      : [];
    const createdAt = timestamp(item.createdAt, now);
    lists.push({
      id,
      name,
      gameIds,
      createdAt,
      updatedAt: timestamp(item.updatedAt, createdAt),
    });
  }

  return { schemaVersion: 1, lists };
}

function validateName(state: ListsState, name: unknown, exceptId?: string) {
  const clean = cleanName(name);
  if (!clean) return { name: clean, error: "Enter a list name." };
  if (
    state.lists.some(
      (list) =>
        list.id !== exceptId && list.name.toLowerCase() === clean.toLowerCase(),
    )
  ) {
    return { name: clean, error: "A list with that name already exists." };
  }
  return { name: clean, error: "" };
}

export function createList(
  state: ListsState,
  name: string,
  options: { id: string; now: string },
): ListResult {
  if (state.lists.length >= LIST_LIMIT)
    return { state, error: `You can create up to ${LIST_LIMIT} lists.` };
  const checked = validateName(state, name);
  if (checked.error) return { state, error: checked.error };
  if (
    !options.id.trim() ||
    state.lists.some((list) => list.id === options.id)
  ) {
    return { state, error: "Could not create a unique list. Try again." };
  }
  const list: GameList = {
    id: options.id,
    name: checked.name,
    gameIds: [],
    createdAt: options.now,
    updatedAt: options.now,
  };
  return { state: { schemaVersion: 1, lists: [...state.lists, list] }, list };
}

export function renameList(
  state: ListsState,
  listId: string,
  name: string,
  now: string,
): ListResult {
  const current = state.lists.find((list) => list.id === listId);
  if (!current) return { state, error: "This list doesn't exist anymore." };
  const checked = validateName(state, name, listId);
  if (checked.error) return { state, error: checked.error };
  if (checked.name === current.name) return { state, list: current };
  const list = { ...current, name: checked.name, updatedAt: now };
  return {
    state: {
      schemaVersion: 1,
      lists: state.lists.map((item) => (item.id === listId ? list : item)),
    },
    list,
  };
}

export function deleteList(state: ListsState, listId: string): ListsState {
  if (!state.lists.some((list) => list.id === listId)) return state;
  return {
    schemaVersion: 1,
    lists: state.lists.filter((list) => list.id !== listId),
  };
}

export function addGameToList(
  state: ListsState,
  listId: string,
  gameId: string,
  now: string,
): ListsState {
  if (!gameId.trim()) return state;
  let changed = false;
  const lists = state.lists.map((list) => {
    if (
      list.id !== listId ||
      list.gameIds.includes(gameId) ||
      list.gameIds.length >= LIST_GAME_LIMIT
    )
      return list;
    changed = true;
    return { ...list, gameIds: [...list.gameIds, gameId], updatedAt: now };
  });
  return changed ? { schemaVersion: 1, lists } : state;
}

export function removeGameFromList(
  state: ListsState,
  listId: string,
  gameId: string,
  now: string,
): ListsState {
  let changed = false;
  const lists = state.lists.map((list) => {
    if (list.id !== listId || !list.gameIds.includes(gameId)) return list;
    changed = true;
    return {
      ...list,
      gameIds: list.gameIds.filter((id) => id !== gameId),
      updatedAt: now,
    };
  });
  return changed ? { schemaVersion: 1, lists } : state;
}

export function toggleGameInList(
  state: ListsState,
  listId: string,
  gameId: string,
  now: string,
): ListsState {
  const list = state.lists.find((item) => item.id === listId);
  if (!list) return state;
  return list.gameIds.includes(gameId)
    ? removeGameFromList(state, listId, gameId, now)
    : addGameToList(state, listId, gameId, now);
}

export function listsForGame(state: ListsState, gameId: string): GameList[] {
  return state.lists.filter((list) => list.gameIds.includes(gameId));
}

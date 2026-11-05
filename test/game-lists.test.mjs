import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTsModule } from "../scripts/load-ts-module.mjs";

const {
  LIST_NAME_LIMIT, LIST_LIMIT, LIST_GAME_LIMIT, normalizeListsState,
  createList, renameList, deleteList, addGameToList, removeGameFromList,
  toggleGameInList, listsForGame,
} = loadTsModule("src/context/game-lists.ts");

const now = "2026-01-01T00:00:00.000Z";
const seed = (lists = []) => ({ schemaVersion: 1, lists });

test("normalizes garbage, duplicate ids and game ids, invalid entries and long names", () => {
  const result = normalizeListsState({ lists: [
    null, { id: "a", name: "  " }, { id: "a", name: " First ", gameIds: ["1", "1", "", 2], createdAt: now },
    { id: "a", name: "Duplicate id" },
    { id: "b", name: "x".repeat(80), gameIds: "bad" },
  ] });
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.lists.length, 2);
  assert.equal(result.lists[0].name, "First");
  assert.deepEqual(result.lists[0].gameIds, ["1"]);
  assert.equal(result.lists[1].name.length, LIST_NAME_LIMIT);
  assert.deepEqual(normalizeListsState(null).lists, []);
});

test("normalization enforces list and per-list game limits", () => {
  const lists = Array.from({ length: LIST_LIMIT + 5 }, (_, i) => ({
    id: String(i), name: `List ${i}`, gameIds: Array.from({ length: LIST_GAME_LIMIT + 2 }, (_, j) => String(j)),
  }));
  const result = normalizeListsState({ lists });
  assert.equal(result.lists.length, LIST_LIMIT);
  assert.equal(result.lists[0].gameIds.length, LIST_GAME_LIMIT);
});

test("create rejects blank and case-insensitive duplicate names", () => {
  const state = seed([{ id: "1", name: "Couch co-op", gameIds: [], createdAt: now, updatedAt: now }]);
  assert.match(createList(state, "  ", { id: "2", now }).error, /name/i);
  assert.match(createList(state, " couch CO-OP ", { id: "2", now }).error, /already exists/i);
  const created = createList(state, " Backlog 2027 ", { id: "2", now });
  assert.equal(created.list.name, "Backlog 2027");
  assert.equal(created.state.lists.length, 2);
});

test("create enforces maximum list count", () => {
  const state = seed(Array.from({ length: LIST_LIMIT }, (_, i) => ({ id: String(i), name: `L${i}`, gameIds: [], createdAt: now, updatedAt: now })));
  assert.match(createList(state, "Extra", { id: "extra", now }).error, /up to/i);
});

test("rename validates names and leaves unknown ids unchanged", () => {
  const state = seed([{ id: "1", name: "First", gameIds: [], createdAt: now, updatedAt: now }]);
  assert.match(renameList(state, "1", " ", now).error, /name/i);
  assert.equal(renameList(state, "missing", "Other", now).state, state);
  assert.equal(renameList(state, "1", "Second", "later").list.updatedAt, "later");
});

test("delete removes only the selected list", () => {
  const state = seed([{ id: "1", name: "One", gameIds: ["g"], createdAt: now, updatedAt: now }, { id: "2", name: "Two", gameIds: [], createdAt: now, updatedAt: now }]);
  assert.deepEqual(deleteList(state, "1").lists.map((list) => list.id), ["2"]);
  assert.equal(deleteList(state, "missing"), state);
});

test("add/remove/toggle are idempotent and update timestamps only on changes", () => {
  const state = seed([{ id: "1", name: "One", gameIds: [], createdAt: now, updatedAt: now }]);
  const added = addGameToList(state, "1", "g", "later");
  assert.deepEqual(added.lists[0].gameIds, ["g"]);
  assert.equal(added.lists[0].updatedAt, "later");
  assert.equal(addGameToList(added, "1", "g", "later2"), added);
  const removed = removeGameFromList(added, "1", "g", "later3");
  assert.deepEqual(removed.lists[0].gameIds, []);
  assert.equal(removed.lists[0].updatedAt, "later3");
  assert.equal(removeGameFromList(removed, "1", "g", "later4"), removed);
  assert.deepEqual(toggleGameInList(state, "1", "g", "later").lists[0].gameIds, ["g"]);
  assert.deepEqual(toggleGameInList(added, "1", "g", "later").lists[0].gameIds, []);
});

test("listsForGame returns every matching list", () => {
  const state = seed([
    { id: "1", name: "One", gameIds: ["g"], createdAt: now, updatedAt: now },
    { id: "2", name: "Two", gameIds: ["g"], createdAt: now, updatedAt: now },
    { id: "3", name: "Three", gameIds: [], createdAt: now, updatedAt: now },
  ]);
  assert.deepEqual(listsForGame(state, "g").map((list) => list.id), ["1", "2"]);
});

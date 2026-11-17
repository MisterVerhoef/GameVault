import { loadTsModule } from "../load-ts-module.mjs";

const { normalizeIgdbRecord, normalizeIgdbExport } = loadTsModule("src/lib/igdb/normalize-record.ts");

export { normalizeIgdbRecord, normalizeIgdbExport };
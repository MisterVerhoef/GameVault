"use client";

import { useEffect, useState } from "react";
import { createBrowseCatalogue, type BrowseCatalogue, type BrowseIndexFile, type SearchIndexFile } from "./library-view";

let browseRequest: Promise<BrowseIndexFile> | null = null;
let searchRequest: Promise<SearchIndexFile> | null = null;

function fetchJson<T>(url: string): Promise<T> {
  const request = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
    return response.json() as Promise<T>;
  });
  request.catch(() => {
    if (url.endsWith("browse-index.json")) browseRequest = null;
    if (url.endsWith("search-index.json")) searchRequest = null;
  });
  return request;
}

function loadBrowseFile() {
  if (!browseRequest) browseRequest = fetchJson<BrowseIndexFile>("/catalog/browse-index.json");
  return browseRequest;
}

function loadSearchFile() {
  if (!searchRequest) searchRequest = fetchJson<SearchIndexFile>("/catalog/search-index.json");
  return searchRequest;
}

export function loadBrowseCatalogue(withSearch: boolean) {
  const browse = loadBrowseFile();
  if (!withSearch) return browse.then((file) => createBrowseCatalogue(file, null));
  return Promise.all([browse, loadSearchFile()]).then(([browseFile, searchFile]) => createBrowseCatalogue(browseFile, searchFile));
}

export function useBrowseCatalogue(withSearch: boolean) {
  const [catalogue, setCatalogue] = useState<BrowseCatalogue | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadBrowseCatalogue(withSearch).then(
      (value) => {
        if (active) setCatalogue(value);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [withSearch]);

  return { catalogue, failed };
}

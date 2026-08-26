"use client";

import { useState } from "react";

// Shared search-with-disambiguation flow for the Ratings and Wishlist pages'
// "search a title" box. Two tiers, by design (a cost/latency tradeoff):
//   1. A normal search is one cheap AI call, returning a single best guess -
//      right most of the time, and the only cost incurred by default.
//   2. If that guess isn't right, "show other matches" is an opt-in SECOND
//      call returning a short list of lightweight candidates (no full
//      metadata) to pick from - so the extra cost is only ever paid when a
//      user actually needs it, not on every search.
export function useTitleSearch() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedTitle, setSelectedTitle] = useState(null);

  const [candidates, setCandidates] = useState(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  async function search(e) {
    e?.preventDefault?.();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    setSelectedTitle(null);
    setCandidates(null);
    try {
      const res = await fetch(`/api/titles/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setSelectedTitle(data.title);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function showOtherMatches() {
    if (!query.trim()) return;
    setLoadingCandidates(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/titles/candidates?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not look up other matches.");
      setCandidates(data.candidates || []);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function selectCandidate(candidate) {
    setLoadingCandidates(true);
    setSearchError("");
    try {
      const params = new URLSearchParams({ q: candidate.name });
      if (candidate.year) params.set("year", candidate.year);
      if (candidate.type) params.set("type", candidate.type);
      const res = await fetch(`/api/titles/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not look up that title.");
      setSelectedTitle(data.title);
      setCandidates(null);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setLoadingCandidates(false);
    }
  }

  function reset() {
    setQuery("");
    setSelectedTitle(null);
    setCandidates(null);
    setSearchError("");
  }

  return {
    query,
    setQuery,
    searching,
    searchError,
    selectedTitle,
    setSelectedTitle,
    candidates,
    loadingCandidates,
    search,
    showOtherMatches,
    selectCandidate,
    reset,
  };
}

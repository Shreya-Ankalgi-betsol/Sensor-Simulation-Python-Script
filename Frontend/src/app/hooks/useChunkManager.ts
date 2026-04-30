import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet } from '../services/apiClient';
import type { ThreatChunkManifestItem, ThreatChunkOut, ThreatLog } from '../types/api';

const MAX_CACHE_SIZE = 3;
const MAX_THREATS_PER_CHUNK = 5000;
const PREFETCH_RADIUS = 1;
const FILTER_WINDOW_MS = 30 * 1000;
const CHUNK_PAGE_SIZE = 5000;

type ChunkCache = Map<string, ThreatLog[]>;

type LoadChunkOptions = {
  silent?: boolean;
};

// Hook to manage adaptive chunk manifest + cache
export function useChunkManager() {
  const [manifest, setManifest] = useState<ThreatChunkManifestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChunkId, setCurrentChunkId] = useState<string | null>(null);
  const [cacheSize, setCacheSize] = useState(0);

  const manifestRef = useRef<ThreatChunkManifestItem[]>([]);
  const chunkMetaRef = useRef<Map<string, ThreatChunkManifestItem>>(new Map());
  const cacheRef = useRef<ChunkCache>(new Map());
  const currentTimeRef = useRef<number | null>(null);

  useEffect(() => {
    manifestRef.current = manifest;
    chunkMetaRef.current = new Map(manifest.map((item) => [item.chunk_id, item]));
  }, [manifest]);

  // Load the latest manifest from the backend
  const loadManifest = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<ThreatChunkManifestItem[]>('/api/v1/threats/manifest');
      manifestRef.current = data;
      chunkMetaRef.current = new Map(data.map((item) => [item.chunk_id, item]));
      setManifest(data);
      console.log('[ChunkManager] Manifest loaded:', data.length, 'chunks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadManifest();
  }, [loadManifest]);

  // Find the chunk id covering a timestamp
  const getChunkForTime = useCallback((timestampMs: number) => {
    const items = manifestRef.current;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const startMs = new Date(item.start_time).getTime();
      const endMs = new Date(item.end_time).getTime();
      const isLast = index === items.length - 1;

      if (timestampMs >= startMs && (timestampMs < endMs || (isLast && timestampMs === endMs))) {
        return item.chunk_id;
      }
    }
    return null;
  }, []);

  // Evict cached chunks farthest from the current scrubber time
  const evictIfNeeded = useCallback((anchorChunkId: string | null) => {
    const cache = cacheRef.current;
    if (cache.size <= MAX_CACHE_SIZE) {
      setCacheSize(cache.size);
      return;
    }

    const anchorTime = currentTimeRef.current ?? Date.now();
    const meta = chunkMetaRef.current;

    while (cache.size > MAX_CACHE_SIZE) {
      let farthestId: string | null = null;
      let farthestDistance = -1;

      for (const chunkId of cache.keys()) {
        if (chunkId === anchorChunkId) {
          continue;
        }

        const chunkMeta = meta.get(chunkId);
        if (!chunkMeta) {
          farthestId = chunkId;
          break;
        }

        const startMs = new Date(chunkMeta.start_time).getTime();
        const endMs = new Date(chunkMeta.end_time).getTime();
        const midMs = (startMs + endMs) / 2;
        const distance = Math.abs(midMs - anchorTime);

        if (distance > farthestDistance) {
          farthestDistance = distance;
          farthestId = chunkId;
        }
      }

      if (!farthestId) {
        break;
      }

      cache.delete(farthestId);
      console.log('[ChunkManager] Evicted chunk:', farthestId);
    }

    setCacheSize(cache.size);
  }, []);

  // Load a chunk from cache or backend
  const loadChunk = useCallback(async (chunkId: string, options: LoadChunkOptions = {}) => {
    const cache = cacheRef.current;
    const cached = cache.get(chunkId);
    if (cached) {
      return cached;
    }

    if (!options.silent) {
      setIsLoading(true);
    }

    try {
      const chunk = await apiGet<ThreatChunkOut>(
        `/api/v1/threats/chunk/${chunkId}?page_size=${CHUNK_PAGE_SIZE}`
      );
      const items = [...chunk.items].sort(
        (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
      );

      cache.set(chunkId, items);
      console.log('[ChunkManager] Chunk loaded:', chunkId, 'items:', items.length);
      evictIfNeeded(chunkId);
      return items;
    } finally {
      if (!options.silent) {
        setIsLoading(false);
      }
    }
  }, [evictIfNeeded]);

  // Prefetch neighboring chunks for smoother scrubbing
  const prefetchNeighbors = useCallback((chunkId: string) => {
    const items = manifestRef.current;
    const currentIndex = items.findIndex((item) => item.chunk_id === chunkId);
    if (currentIndex === -1) {
      return;
    }

    const neighbors: string[] = [];
    for (let offset = 1; offset <= PREFETCH_RADIUS; offset += 1) {
      const prev = items[currentIndex - offset];
      const next = items[currentIndex + offset];
      if (prev?.chunk_id) {
        neighbors.push(prev.chunk_id);
      }
      if (next?.chunk_id) {
        neighbors.push(next.chunk_id);
      }
    }

    neighbors.forEach((neighborId) => {
      if (!cacheRef.current.has(neighborId)) {
        void loadChunk(neighborId, { silent: true });
      }
    });
  }, [loadChunk]);

  // Fetch threats near a timestamp using the adaptive chunk cache
  const getThreatsAtTime = useCallback(async (timestampMs: number) => {
    if (manifestRef.current.length === 0) {
      await loadManifest();
    }

    const chunkId = getChunkForTime(timestampMs);
    if (!chunkId) {
      setCurrentChunkId(null);
      return [] as ThreatLog[];
    }

    currentTimeRef.current = timestampMs;
    setCurrentChunkId(chunkId);

    console.log('[ChunkManager] getThreatsAtTime -> chunk', {
      chunkId,
      timestamp: new Date(timestampMs).toISOString(),
    });

    const threats = await loadChunk(chunkId);
    prefetchNeighbors(chunkId);

    const windowStart = timestampMs - FILTER_WINDOW_MS;
    const windowEnd = timestampMs + FILTER_WINDOW_MS;

    return threats.filter((threat) => {
      const threatMs = new Date(threat.timestamp).getTime();
      return threatMs >= windowStart && threatMs <= windowEnd;
    });
  }, [getChunkForTime, loadChunk, loadManifest, prefetchNeighbors]);

  // Insert a live threat into a cached chunk (if present)
  const insertLiveThreat = useCallback((threat: ThreatLog) => {
    const threatMs = new Date(threat.timestamp).getTime();
    if (!Number.isFinite(threatMs)) {
      return;
    }

    const chunkId = getChunkForTime(threatMs);
    if (!chunkId) {
      return;
    }

    const cache = cacheRef.current;
    const cached = cache.get(chunkId);
    if (!cached) {
      return;
    }

    const exists = cached.some((item) => item.alert_id === threat.alert_id);
    if (exists) {
      return;
    }

    const next = [...cached, threat].sort(
      (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
    );

    while (next.length > MAX_THREATS_PER_CHUNK) {
      next.shift();
    }

    cache.set(chunkId, next);
    setCacheSize(cache.size);
    console.log('[ChunkManager] Live threat added to chunk:', chunkId);
  }, [getChunkForTime]);

  return useMemo(
    () => ({
      manifest,
      isLoading,
      getThreatsAtTime,
      currentChunkId,
      cacheSize,
      getChunkForTime,
      insertLiveThreat,
    }),
    [cacheSize, currentChunkId, getChunkForTime, getThreatsAtTime, insertLiveThreat, isLoading, manifest]
  );
}

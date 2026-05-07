import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';

import { apiGet, APIError } from '../services/apiClient';
import { PagedThreats, ThreatLog, ThreatSummaryOut } from '../types/api';

type ThreatLocationLookup = {
  sensor_id: string;
  location?: string;
};

type VirtualizedThreatLogTableProps = {
  isActive: boolean;
  timezoneLabel: string;
  sensorList: ThreatLocationLookup[];
  filterTime: string;
  filterSensorTypes: string[];
  filterSensorIds: string[];
  filterThreatTypes: string[];
  filterSeverities: string[];
  fromDateTime: Date | null;
  toDateTime: Date | null;
  refreshKey: number;
  formatTimestamp: (utcTimestamp: string, tz?: string) => string;
  getSeverityColor: (severity: string) => string;
  getSeverityBgColor: (severity: string) => string;
  onThreatClick?: (threat: ThreatLog) => void;
  onSummaryChange?: (summary: ThreatSummaryOut) => void;
};

type RowData = {
  getThreatAtIndex: (index: number) => ThreatLog | null;
  formatTimestamp: (utcTimestamp: string, tz?: string) => string;
  timezoneLabel: string;
  sensorLocationMap: Map<string, string>;
  getSeverityColor: (severity: string) => string;
  getSeverityBgColor: (severity: string) => string;
  onThreatClick?: (threat: ThreatLog) => void;
  cacheVersion: number;
};

const PAGE_SIZE = 50;
const CACHE_PAGES = 8;
const ROW_HEIGHT = 58;

class PageCache {
  private readonly entries = new Map<number, ThreatLog[]>();
  private readonly order: number[] = [];

  clear() {
    this.entries.clear();
    this.order.length = 0;
  }

  has(pageIndex: number) {
    return this.entries.has(pageIndex);
  }

  get(pageIndex: number) {
    const page = this.entries.get(pageIndex);
    if (!page) {
      return undefined;
    }

    const orderIndex = this.order.indexOf(pageIndex);
    if (orderIndex >= 0) {
      this.order.splice(orderIndex, 1);
    }
    this.order.push(pageIndex);
    return page;
  }

  set(pageIndex: number, items: ThreatLog[]) {
    if (this.entries.has(pageIndex)) {
      const existingIndex = this.order.indexOf(pageIndex);
      if (existingIndex >= 0) {
        this.order.splice(existingIndex, 1);
      }
    }

    this.entries.set(pageIndex, items);
    this.order.push(pageIndex);

    while (this.order.length > CACHE_PAGES) {
      const oldestPageIndex = this.order.shift();
      if (oldestPageIndex !== undefined) {
        this.entries.delete(oldestPageIndex);
      }
    }
  }
}

const buildDateRange = (
  filterTime: string,
  fromDateTime: Date | null,
  toDateTime: Date | null,
) => {
  const now = new Date();
  let from: Date | null = null;
  let to: Date | null = now;

  switch (filterTime) {
    case 'All':
      return { from_dt: null, to_dt: null };
    case 'Last 30 min':
      from = new Date(now.getTime() - 30 * 60 * 1000);
      break;
    case 'Last 1 Hour':
      from = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case 'Last 2 Hours':
      from = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      break;
    case 'Last 24 hours':
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'Last 7 days':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'Last 30 days':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'Custom':
      from = fromDateTime;
      to = toDateTime;
      break;
  }

  return {
    from_dt: from ? from.toISOString() : null,
    to_dt: to ? to.toISOString() : null,
  };
};

const getPageIndexForItem = (index: number) => Math.floor(index / PAGE_SIZE);

const buildRowLocationMap = (sensorList: ThreatLocationLookup[]) => {
  const map = new Map<string, string>();
  sensorList.forEach((sensor) => {
    if (sensor.sensor_id && sensor.location) {
      map.set(sensor.sensor_id, sensor.location);
    }
  });
  return map;
};

function ThreatRow({ index, style, data }: ListChildComponentProps<RowData>) {
  const threat = data.getThreatAtIndex(index);

  if (!threat) {
    return (
      <div
        style={{
          ...style,
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr 0.8fr 0.8fr 1fr 0.6fr',
          alignItems: 'center',
          gap: '12px',
          padding: '0 16px',
          borderBottom: '1px solid rgba(226,232,240,0.8)',
          background: index % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-table-alt)',
        }}
      >
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
      </div>
    );
  }

  const location = data.sensorLocationMap.get(threat.sensor_id) || 'Unknown';

  return (
    <div
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: '1.15fr 1fr 0.8fr 0.8fr 1fr 0.6fr',
        alignItems: 'center',
        gap: '12px',
        padding: '0 16px',
        borderBottom: '1px solid rgba(226,232,240,0.8)',
        background: index % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-table-alt)',
        cursor: data.onThreatClick ? 'pointer' : 'default',
      }}
      onClick={() => data.onThreatClick?.(threat)}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = index % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-table-alt)';
      }}
    >
      <div
        style={{
          fontSize: '0.865rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {data.formatTimestamp(threat.timestamp, data.timezoneLabel)}
      </div>
      <div style={{ fontSize: '1.00625rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {threat.threat_type}
      </div>
      <div style={{ fontSize: '1.00625rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {threat.sensor_id}
      </div>
      <div style={{ fontSize: '1.00625rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {threat.sensor_type}
      </div>
      <div style={{ fontSize: '1.00625rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {location}
      </div>
      <div>
        <span
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
          style={{
            background: data.getSeverityBgColor(threat.severity),
            color: data.getSeverityColor(threat.severity),
            fontSize: '0.865rem',
            fontWeight: 600,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: data.getSeverityColor(threat.severity) }}
          />
          {threat.severity}
        </span>
      </div>
    </div>
  );
}

export function VirtualizedThreatLogTable({
  isActive,
  timezoneLabel,
  sensorList,
  filterTime,
  filterSensorTypes,
  filterSensorIds,
  filterThreatTypes,
  filterSeverities,
  fromDateTime,
  toDateTime,
  refreshKey,
  formatTimestamp,
  getSeverityColor,
  getSeverityBgColor,
  onThreatClick,
  onSummaryChange,
}: VirtualizedThreatLogTableProps) {
  const [totalThreats, setTotalThreats] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [tableHeight, setTableHeight] = useState(480);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const requestVersionRef = useRef(0);
  const cacheRef = useRef(new PageCache());
  const loadingPagesRef = useRef(new Set<number>());
  const hasScrolledRef = useRef(false);

  const sensorLocationMap = useMemo(() => buildRowLocationMap(sensorList), [sensorList]);

  useLayoutEffect(() => {
    const updateHeight = () => {
      if (!wrapperRef.current) {
        return;
      }

      setTableHeight(Math.max(240, wrapperRef.current.clientHeight));
    };

    updateHeight();

    if (!wrapperRef.current || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [isActive]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    loadingPagesRef.current.clear();
    setCacheVersion((version) => version + 1);
  }, []);

  const buildRequestUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();

      params.append('offset', String(offset));
      params.append('page_size', String(PAGE_SIZE));

      filterSensorTypes.forEach((value) => params.append('sensor_type', value.toLowerCase()));
      filterSensorIds.forEach((value) => params.append('sensor_id', value));
      filterThreatTypes.forEach((value) => params.append('threat_type', value));
      filterSeverities.forEach((value) => params.append('severity', value));

      const { from_dt, to_dt } = buildDateRange(filterTime, fromDateTime, toDateTime);
      if (from_dt) {
        params.append('from_dt', from_dt);
      }
      if (to_dt) {
        params.append('to_dt', to_dt);
      }

      return `/api/v1/threats?${params.toString()}`;
    },
    [filterSeverities, filterSensorIds, filterSensorTypes, filterThreatTypes, filterTime, fromDateTime, toDateTime]
  );

  const loadPage = useCallback(
    async (pageIndex: number) => {
      if (!isActive) {
        console.log('[VirtualizedThreatLogTable] Skipping load - not active');
        return;
      }

      if (cacheRef.current.has(pageIndex) || loadingPagesRef.current.has(pageIndex)) {
        console.log(`[VirtualizedThreatLogTable] Page ${pageIndex} already loading or cached`);
        return;
      }

      loadingPagesRef.current.add(pageIndex);
      const requestVersion = requestVersionRef.current;

      if (pageIndex === 0) {
        setIsInitialLoading(true);
      }

      try {
        const url = buildRequestUrl(pageIndex * PAGE_SIZE);
        console.log(`[VirtualizedThreatLogTable] Fetching page ${pageIndex}:`, url);
        const response = await apiGet<PagedThreats>(url);

        if (requestVersion !== requestVersionRef.current) {
          console.log(`[VirtualizedThreatLogTable] Request version mismatch for page ${pageIndex}`);
          return;
        }

        console.log(`[VirtualizedThreatLogTable] Page ${pageIndex} loaded: ${response.items.length} items, total: ${response.total}`);
        cacheRef.current.set(pageIndex, response.items);
        setCacheVersion((version) => version + 1);
        setTotalThreats(response.total);
        setError(null);

        if (pageIndex === 0) {
          onSummaryChange?.({
            total_threats: response.total,
            high_severity_count: response.high_severity_count,
            active_sensor_count: response.active_sensor_count,
          });
        }
      } catch (loadError) {
        if (requestVersion === requestVersionRef.current) {
          const message = loadError instanceof APIError ? loadError.message : 'Failed to load threat logs.';
          console.error(`[VirtualizedThreatLogTable] Error loading page ${pageIndex}:`, message);
          setError(message);
        }
      } finally {
        loadingPagesRef.current.delete(pageIndex);
        if (pageIndex === 0) {
          setIsInitialLoading(false);
        }
      }
    },
    [buildRequestUrl, isActive, onSummaryChange]
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }

    requestVersionRef.current += 1;
    setError(null);
    setTotalThreats(0);
    onSummaryChange?.({ total_threats: 0, high_severity_count: 0, active_sensor_count: 0 });
    clearCache();
    void loadPage(0);
  }, [clearCache, isActive, loadPage, onSummaryChange, refreshKey]);

  const getThreatAtIndex = useCallback(
    (index: number) => {
      const pageIndex = getPageIndexForItem(index);
      const page = cacheRef.current.get(pageIndex);
      if (!page) {
        return null;
      }

      const itemInPage = page[index % PAGE_SIZE];
      return itemInPage || null;
    },
    []
  );

  const isItemLoaded = useCallback(
    (index: number) => {
      const pageIndex = getPageIndexForItem(index);
      const page = cacheRef.current.get(pageIndex);
      if (!page) return false;
      
      const itemInPage = page[index % PAGE_SIZE];
      return Boolean(itemInPage);
    },
    []
  );

  const handleItemsRendered = useCallback(
    ({ visibleStartIndex, visibleStopIndex }: { visibleStartIndex: number; visibleStopIndex: number }) => {
      if (!isActive || totalThreats === 0 || !hasScrolledRef.current) {
        return;
      }

      const startPage = getPageIndexForItem(visibleStartIndex);
      const endPage = getPageIndexForItem(visibleStopIndex);

      void loadPage(startPage);
      void loadPage(endPage);
    },
    [isActive, loadPage, totalThreats]
  );

  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    if (scrollOffset > 0) {
      hasScrolledRef.current = true;
    }
  }, []);

  const itemData: RowData = useMemo(
    () => ({
      getThreatAtIndex,
      formatTimestamp,
      timezoneLabel,
      sensorLocationMap,
      getSeverityColor,
      getSeverityBgColor,
      onThreatClick,
      cacheVersion,
    }),
    [formatTimestamp, getSeverityBgColor, getSeverityColor, getThreatAtIndex, onThreatClick, sensorLocationMap, timezoneLabel, cacheVersion]
  );

  if (!isActive) {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{
        background: 'rgba(255,255,255,0.94)',
        border: '1px solid rgba(226,232,240,0.9)',
        minHeight: '480px',
      }}
    >
      <div
        className="grid items-center border-b px-4 py-3"
        style={{
          gridTemplateColumns: '1.15fr 1fr 0.8fr 0.8fr 1fr 0.6fr',
          background: 'rgba(248,250,252,0.95)',
          borderBottom: '1px solid rgba(226,232,240,0.9)',
        }}
      >
        {[
          `Time (${timezoneLabel})`,
          'Threat',
          'Sensor ID',
          'Sensor Type',
          'Location',
          'Severity',
        ].map((header) => (
          <div
            key={header}
            className="uppercase tracking-wider"
            style={{
              fontSize: '0.865rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {header}
          </div>
        ))}
      </div>

      <div style={{ height: Math.max(240, tableHeight - 48) }}>
        {isInitialLoading && totalThreats === 0 ? (
          <div className="flex h-full items-center justify-center px-4 py-10" style={{ color: 'var(--text-secondary)' }}>
            Loading threat logs...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-4 py-10 text-center" style={{ color: '#B91C1C' }}>
            {error}
          </div>
        ) : totalThreats === 0 ? (
          <div className="flex h-full items-center justify-center px-4 py-10 text-center" style={{ color: 'var(--text-secondary)' }}>
            No threats found matching the current filters.
          </div>
        ) : (
          <List
            height={Math.max(240, tableHeight - 48)}
            itemCount={totalThreats}
            itemSize={ROW_HEIGHT}
            itemData={itemData}
            onScroll={handleScroll}
            onItemsRendered={handleItemsRendered}
            overscanCount={8}
            width="100%"
          >
            {ThreatRow}
          </List>
        )}
      </div>
    </div>
  );
}

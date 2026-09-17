import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useVehicles } from '../api/hooks'
import type { SortKey, VehicleQuery } from '../api/types'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Filters, type FacetKey } from '../components/Filters/Filters'
import { Pagination } from '../components/Pagination/Pagination'
import type { PriceBounds } from '../components/PriceRange/PriceRange'
import { SearchBar } from '../components/SearchBar/SearchBar'
import { SortSelect } from '../components/SortSelect/SortSelect'
import { VehicleCard } from '../components/VehicleCard/VehicleCard'
import styles from './InventoryPage.module.css'

const FACET_KEYS: FacetKey[] = ['state', 'make', 'bodyStyle', 'province', 'titleStatus']
const PAGE_SIZE = 24

/**
 * Inventory browsing. All query state lives in the URL so views are shareable
 * and the back button behaves.
 */
export function InventoryPage() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const q = params.get('q') ?? ''
  const sort = (params.get('sort') as SortKey | null) ?? 'ending_soon'
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const selected = useMemo(
    () => Object.fromEntries(FACET_KEYS.map((k) => [k, params.getAll(k)])) as Record<FacetKey, string[]>,
    [params],
  )

  const price: PriceBounds = useMemo(
    () => ({ min: numberParam(params.get('minPrice')), max: numberParam(params.get('maxPrice')) }),
    [params],
  )

  const topTen = params.get('top') === '5'

  const query: VehicleQuery = useMemo(
    () => ({ q: q || undefined, sort, page, pageSize: PAGE_SIZE, minPrice: price.min, maxPrice: price.max, top: topTen ? 5 : undefined, ...selected }),
    [q, sort, page, price, topTen, selected],
  )
  const { data, isPending, isError, isFetching, refetch } = useVehicles(query)

  const update = useCallback(
    (mutate: (p: URLSearchParams) => void, resetPage = true) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          mutate(next)
          if (resetPage) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setQ = useCallback((value: string) => update((p) => (value ? p.set('q', value) : p.delete('q'))), [update])
  const setSort = (value: SortKey) => update((p) => (value === 'ending_soon' ? p.delete('sort') : p.set('sort', value)))
  const setPage = (value: number) => {
    update((p) => (value > 1 ? p.set('page', String(value)) : p.delete('page')), false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const toggleFacet = (key: FacetKey, value: string) =>
    update((p) => {
      const values = p.getAll(key)
      p.delete(key)
      const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
      next.forEach((v) => p.append(key, v))
    })
  const setPrice = (bounds: PriceBounds) =>
    update((p) => {
      if (bounds.min !== undefined) p.set('minPrice', String(bounds.min))
      else p.delete('minPrice')
      if (bounds.max !== undefined) p.set('maxPrice', String(bounds.max))
      else p.delete('maxPrice')
    })
  const setTopTen = (on: boolean) => update((p) => (on ? p.set('top', '5') : p.delete('top')))
  const clearFacets = () =>
    update((p) => {
      FACET_KEYS.forEach((k) => p.delete(k))
      p.delete('minPrice')
      p.delete('maxPrice')
      p.delete('top')
    })
  const clearAll = () => setParams({}, { replace: true })

  const activeFilterCount =
    Object.values(selected).reduce((n, arr) => n + arr.length, 0) +
    (price.min !== undefined || price.max !== undefined ? 1 : 0) +
    (topTen ? 1 : 0)

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <SearchBar value={q} onChange={setQ} />
        <div className={styles.toolbarRight}>
          <button type="button" className={styles.filterToggle} onClick={() => setFiltersOpen(true)}>
            Filters{activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
          </button>
          <SortSelect value={sort} onChange={setSort} />
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`} aria-label="Filters">
          <div className={styles.sidebarHead}>
            <span>Filters</span>
            <button type="button" className={styles.close} onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button>
          </div>
          <Filters
            facets={data?.facets}
            selected={selected}
            price={price}
            topTen={topTen}
            onToggle={toggleFacet}
            onPriceChange={setPrice}
            onTopTenChange={setTopTen}
            onClear={clearFacets}
          />
          <div className={styles.sidebarFoot}>
            <button type="button" className={styles.apply} onClick={() => setFiltersOpen(false)}>
              Show {data?.total ?? ''} vehicles
            </button>
          </div>
        </aside>
        {filtersOpen && <button type="button" className={styles.scrim} aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}

        <section className={styles.results} aria-live="polite" aria-busy={isFetching}>
          <div className={styles.resultsHead}>
            <h1 className={styles.heading}>
              {isPending
                ? 'Loading inventory…'
                : topTen
                  ? `Top ${data?.total ?? 0} most popular`
                  : `${data?.total ?? 0} vehicle${data?.total === 1 ? '' : 's'}`}
              {q && !isPending && <span className={styles.forQuery}> for “{q}”</span>}
            </h1>
          </div>

          {isError ? (
            <EmptyState
              tone="error"
              title="Couldn’t load inventory"
              description="The API isn’t responding. Make sure the server is running on port 5080."
              action={<button type="button" className={styles.apply} onClick={() => refetch()}>Try again</button>}
            />
          ) : isPending ? (
            <ul className={styles.grid} aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => <li key={i} className={styles.skeleton} />)}
            </ul>
          ) : data.items.length === 0 ? (
            <EmptyState
              title="No vehicles match"
              description="Try a broader search or remove some filters."
              action={<button type="button" className={styles.apply} onClick={clearAll}>Clear search and filters</button>}
            />
          ) : (
            <>
              <ul className={`${styles.grid} ${isFetching ? styles.gridStale : ''}`}>
                {data.items.map((v) => (
                  <li key={v.id}><VehicleCard vehicle={v} /></li>
                ))}
              </ul>
              <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function numberParam(raw: string | null): number | undefined {
  if (raw === null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  MAX_SEARCH_LENGTH,
  PAGE_SIZE,
  SORT_OPTIONS,
  applyFilterChange,
  hasActiveFilters,
  normalizeSearch,
  replaceRow,
  summaryOf,
  toListParams,
} from './adminUserQuery';
import { detail, summary } from './adminTestKit';

describe('normalizeSearch', () => {
  it('trims, collapses whitespace runs, and keeps case for display', () => {
    expect(normalizeSearch('   Alice \t  Doe  ')).toBe('Alice Doe');
  });

  it('caps the text at the length the server accepts', () => {
    expect(normalizeSearch('a'.repeat(MAX_SEARCH_LENGTH + 40))).toHaveLength(MAX_SEARCH_LENGTH);
  });

  it('turns whitespace-only input into an empty filter', () => {
    expect(normalizeSearch('  \n ')).toBe('');
  });
});

describe('toListParams', () => {
  it('always asks for a bounded page and never a negative one', () => {
    const params = toListParams({ ...DEFAULT_FILTERS, page: -3, q: '  bob ' });
    expect(params).toMatchObject({ page: 0, size: PAGE_SIZE, q: 'bob' });
  });

  it('passes role, status, and sort through untouched', () => {
    const params = toListParams({ q: '', role: 'admin', status: 'disabled', sort: 'email,asc', page: 2 });
    expect(params).toEqual({ q: '', role: 'admin', status: 'disabled', sort: 'email,asc', page: 2, size: PAGE_SIZE });
  });

  it('defaults to the newest users first', () => {
    expect(DEFAULT_FILTERS.sort).toBe(SORT_OPTIONS[0].value);
    expect(DEFAULT_FILTERS.sort).toBe('createdAt,desc');
  });
});

describe('filters', () => {
  it('returns to the first page whenever a filter changes', () => {
    const next = applyFilterChange({ ...DEFAULT_FILTERS, page: 4 }, { role: 'admin' });
    expect(next).toMatchObject({ role: 'admin', page: 0 });
  });

  it('reports whether anything narrows the list', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, q: 'x' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'active' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'email,asc', page: 3 })).toBe(false);
  });
});

describe('row helpers', () => {
  it('derives a summary that carries no detail-only fields', () => {
    const derived = summaryOf(detail({ disabledReason: 'spam', workspaces: [{ id: 'w', name: 'W', roleName: 'Member', owner: false }] }));
    expect(Object.keys(derived).sort()).toEqual(Object.keys(summary()).sort());
  });

  it('replaces only the matching row and keeps the others by identity', () => {
    const a = summary({ id: 'a' });
    const b = summary({ id: 'b' });
    const updated = summary({ id: 'b', role: 'admin' });

    const result = replaceRow([a, b], updated);

    expect(result[0]).toBe(a);
    expect(result[1]).toBe(updated);
    expect(replaceRow([a], summary({ id: 'missing' }))).toEqual([a]);
  });
});

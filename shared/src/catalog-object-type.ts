import type { CatalogObjectType } from './types/satellite.js';

export const CATALOG_OBJECT_TYPES: readonly CatalogObjectType[] = [
  'payload',
  'rocket-body',
  'debris',
  'unknown',
] as const;

export const CATALOG_OBJECT_TYPE_LABEL: Record<CatalogObjectType, string> = {
  payload: 'Payload',
  'rocket-body': 'Rocket body',
  debris: 'Debris',
  unknown: 'Unknown',
};

export const CATALOG_OBJECT_TYPE_COLOR: Record<CatalogObjectType, string> = {
  payload: '#8ed8ff',
  'rocket-body': '#ffd166',
  debris: '#ff6b6b',
  unknown: '#93a1b5',
};

export function normalizeCatalogObjectType(raw?: string | null): CatalogObjectType {
  const value = String(raw ?? '').trim().toUpperCase();
  if (value === 'PAY' || value === 'PAYLOAD') return 'payload';
  if (value === 'R/B' || value === 'ROCKET BODY' || value === 'ROCKET-BODY') {
    return 'rocket-body';
  }
  if (value === 'DEB' || value === 'DEBRIS') return 'debris';
  return 'unknown';
}

import type { KeyframeData, Coord, AnimationState, TerritoryFeature } from './types';
import {
  createPolygonInterpolator,
  createDissolveInterpolator,
  createAppearInterpolator,
} from './interpolator';

interface TerritorySnapshot {
  polygon: Coord[];
}

interface InterpolatorEntry {
  territoryId: string;
  interpolate: (t: number) => Coord[];
  appearsAtEnd: boolean;
  dissolvesAtEnd: boolean;
}

/**
 * TerritoryAnimationEngine — map-library agnostic.
 * Feed it keyframe data, ask for GeoJSON at any year.
 */
export class TerritoryAnimationEngine {
  private data: KeyframeData;
  private stateCache: Map<number, Record<string, TerritorySnapshot | null>> = new Map();
  private interpolatorCache: Map<string, InterpolatorEntry[]> = new Map();

  constructor(data: KeyframeData) {
    this.data = data;
    this.buildStateCache();
  }

  get startYear(): number {
    return this.data.meta.startYear;
  }

  get endYear(): number {
    return this.data.meta.endYear;
  }

  get keyframes() {
    return this.data.keyframes;
  }

  /**
   * Core method: get the full GeoJSON FeatureCollection at a given year.
   */
  getStateAtYear(year: number): AnimationState {
    const { keyframes } = this.data;

    // Clamp
    if (year <= keyframes[0].year) return this.buildGeoJSON(keyframes[0].year);
    if (year >= keyframes[keyframes.length - 1].year)
      return this.buildGeoJSON(keyframes[keyframes.length - 1].year);

    // Find surrounding keyframes
    let prevIdx = 0;
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].year <= year && keyframes[i + 1].year > year) {
        prevIdx = i;
        break;
      }
    }

    const prevKf = keyframes[prevIdx];
    const nextKf = keyframes[prevIdx + 1];
    const t = (year - prevKf.year) / (nextKf.year - prevKf.year);

    const prevState = this.stateCache.get(prevKf.year)!;
    const nextState = this.stateCache.get(nextKf.year)!;

    const features: TerritoryFeature[] = [];
    const allIds = new Set([...Object.keys(prevState), ...Object.keys(nextState)]);

    for (const id of allIds) {
      const prev = prevState[id];
      const next = nextState[id];
      const meta = this.data.territories[id];
      if (!meta) continue;

      let polygon: Coord[] | null = null;

      if (prev && next) {
        const cacheKey = `${prevKf.year}-${nextKf.year}-${id}`;
        const interp = this.getOrCreateInterpolator(cacheKey, prev.polygon, next.polygon);
        polygon = interp(t);
      } else if (prev && !next) {
        const cacheKey = `${prevKf.year}-${nextKf.year}-${id}-dissolve`;
        const interp = this.getOrCreateDissolve(cacheKey, prev.polygon);
        polygon = interp(t);
        if (t >= 0.99) continue;
      } else if (!prev && next) {
        const cacheKey = `${prevKf.year}-${nextKf.year}-${id}-appear`;
        const interp = this.getOrCreateAppear(cacheKey, next.polygon);
        polygon = interp(t);
        if (t <= 0.01) continue;
      }

      if (polygon) {
        features.push({
          type: 'Feature',
          properties: { id, name: meta.name, color: meta.color },
          geometry: { type: 'Polygon', coordinates: [polygon] },
        });
      }
    }

    return { type: 'FeatureCollection', features };
  }

  private buildGeoJSON(year: number): AnimationState {
    const state = this.stateCache.get(year);
    if (!state) return { type: 'FeatureCollection', features: [] };

    const features: TerritoryFeature[] = [];
    for (const [id, snapshot] of Object.entries(state)) {
      if (!snapshot) continue;
      const meta = this.data.territories[id];
      if (!meta) continue;
      const closed = ensureClosed(snapshot.polygon);
      features.push({
        type: 'Feature',
        properties: { id, name: meta.name, color: meta.color },
        geometry: { type: 'Polygon', coordinates: [closed] },
      });
    }
    return { type: 'FeatureCollection', features };
  }

  private buildStateCache() {
    const current: Record<string, TerritorySnapshot> = {};
    for (const kf of this.data.keyframes) {
      for (const [id, change] of Object.entries(kf.changes)) {
        if (change === null) {
          delete current[id];
        } else {
          current[id] = { polygon: change.polygon };
        }
      }
      this.stateCache.set(kf.year, { ...current });
    }
  }

  private morphCache = new Map<string, (t: number) => Coord[]>();

  private getOrCreateInterpolator(key: string, from: Coord[], to: Coord[]) {
    if (!this.morphCache.has(key)) {
      this.morphCache.set(key, createPolygonInterpolator(from, to));
    }
    return this.morphCache.get(key)!;
  }

  private getOrCreateDissolve(key: string, polygon: Coord[]) {
    if (!this.morphCache.has(key)) {
      this.morphCache.set(key, createDissolveInterpolator(polygon));
    }
    return this.morphCache.get(key)!;
  }

  private getOrCreateAppear(key: string, polygon: Coord[]) {
    if (!this.morphCache.has(key)) {
      this.morphCache.set(key, createAppearInterpolator(polygon));
    }
    return this.morphCache.get(key)!;
  }
}

function ensureClosed(ring: Coord[]): Coord[] {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}
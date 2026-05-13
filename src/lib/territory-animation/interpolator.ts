import { interpolate } from 'flubber';
import type { Coord } from './types';

/**
 * Create an interpolator between two polygon shapes.
 * Returns a function (t: 0→1) that produces intermediate polygon coordinates.
 */
export function createPolygonInterpolator(
  from: Coord[],
  to: Coord[]
): (t: number) => Coord[] {
  // Ensure polygons are closed rings
  const fromClosed = ensureClosed(from);
  const toClosed = ensureClosed(to);

  const interp = interpolate(fromClosed, toClosed, {
    string: false,
    maxSegmentLength: 2,
  });

  return (t: number): Coord[] => {
    if (t <= 0) return fromClosed;
    if (t >= 1) return toClosed;
    return interp(t) as Coord[];
  };
}

/**
 * Create a dissolve interpolator — polygon shrinks to its centroid.
 */
export function createDissolveInterpolator(polygon: Coord[]): (t: number) => Coord[] {
  const closed = ensureClosed(polygon);
  const center = centroid(closed);
  // Create a tiny polygon at the centroid
  const tiny: Coord[] = [
    [center[0] - 0.01, center[1] - 0.01],
    [center[0] + 0.01, center[1] - 0.01],
    [center[0] + 0.01, center[1] + 0.01],
    [center[0] - 0.01, center[1] + 0.01],
    [center[0] - 0.01, center[1] - 0.01],
  ];

  return createPolygonInterpolator(closed, tiny);
}

/**
 * Create an appear interpolator — polygon grows from centroid.
 */
export function createAppearInterpolator(polygon: Coord[]): (t: number) => Coord[] {
  const closed = ensureClosed(polygon);
  const center = centroid(closed);
  const tiny: Coord[] = [
    [center[0] - 0.01, center[1] - 0.01],
    [center[0] + 0.01, center[1] - 0.01],
    [center[0] + 0.01, center[1] + 0.01],
    [center[0] - 0.01, center[1] + 0.01],
    [center[0] - 0.01, center[1] - 0.01],
  ];

  return createPolygonInterpolator(tiny, closed);
}

/** Ensure a polygon ring is closed (first point === last point) */
function ensureClosed(ring: Coord[]): Coord[] {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

/** Compute centroid of a polygon ring */
function centroid(ring: Coord[]): Coord {
  let x = 0, y = 0;
  const n = ring[ring.length - 1][0] === ring[0][0] ? ring.length - 1 : ring.length;
  for (let i = 0; i < n; i++) {
    x += ring[i][0];
    y += ring[i][1];
  }
  return [x / n, y / n];
}

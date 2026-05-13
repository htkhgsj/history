/** Coordinate pair [longitude, latitude] */
export type Coord = [number, number];

/** A polygon ring (array of coordinates, first === last for closure) */
export type PolygonRing = Coord[];

/** Territory metadata — stable identity */
export interface TerritoryMeta {
  name: string;
  color: string;
}

/** A single change entry in a keyframe */
export interface TerritoryChange {
  polygon: Coord[];
}

/** A keyframe: snapshot of what changed at a given year */
export interface Keyframe {
  year: number;
  label: string;
  changes: Record<string, TerritoryChange | null>;
}

/** Top-level keyframe data file structure */
export interface KeyframeData {
  meta: {
    era: string;
    startYear: number;
    endYear: number;
  };
  territories: Record<string, TerritoryMeta>;
  keyframes: Keyframe[];
}

/** GeoJSON Feature for a territory at a point in time */
export interface TerritoryFeature {
  type: 'Feature';
  properties: {
    id: string;
    name: string;
    color: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: [Coord[]];
  };
}

/** Output of the animation engine */
export interface AnimationState {
  type: 'FeatureCollection';
  features: TerritoryFeature[];
}

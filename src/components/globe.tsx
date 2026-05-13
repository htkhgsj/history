'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export type GlobeTheme =
  | 'dark-matter'
  | 'positron'
  | 'liberty'
  | 'bright';

const THEME_STYLES: Record<GlobeTheme, string> = {
  'dark-matter': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  'positron': 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  'liberty': 'https://tiles.openfreemap.org/styles/liberty',
  'bright': 'https://tiles.openfreemap.org/styles/bright',
};

interface GlobeProps {
  onLocationClick: (location: { name: string; lat: number; lng: number }) => void;
  theme?: GlobeTheme;
  initialCenter?: [number, number];
  initialZoom?: number;
  marker?: { lat: number; lng: number };
  disableInteraction?: boolean;
}

export interface GlobeRef {
  selectRandomLocation: () => void;
}

// Suppress abort errors globally
if (typeof window !== 'undefined') {
  const handleError = (event: ErrorEvent) => {
    if (event.error?.name === 'AbortError' || event.message?.includes('aborted')) {
      event.preventDefault();
    }
  };
  window.addEventListener('error', handleError);

  const handleRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (reason?.name === 'AbortError' || reason?.message?.includes('aborted')) {
      event.preventDefault();
    }
  };
  window.addEventListener('unhandledrejection', handleRejection);
}

export const Globe = forwardRef<GlobeRef, GlobeProps>(function Globe({ onLocationClick, theme = 'dark-matter', initialCenter, initialZoom, marker, disableInteraction = false }, ref) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const styleUrl = THEME_STYLES[theme] || THEME_STYLES['dark-matter'];

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: initialCenter || [112, 33], // Five Dynasties center (Central China)
        zoom: initialZoom || 4,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('error', (e) => {
        console.error('[Globe] Map error:', e.error?.message || e);
      });

      map.on('load', () => {
        // Enable globe projection after style is loaded
        (map as any).setProjection('globe');

        setIsLoading(false);

        // Add Five Dynasties GeoJSON data
        map.addSource('five-dynasties', {
          type: 'geojson',
          data: '/data/five-dynasties.geojson'
        });

        map.addLayer({
          id: 'kingdoms-fill',
          type: 'fill',
          source: 'five-dynasties',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.45
          }
        });

        map.addLayer({
          id: 'kingdoms-outline',
          type: 'line',
          source: 'five-dynasties',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.8
          }
        });

        map.addLayer({
          id: 'kingdoms-labels',
          type: 'symbol',
          source: 'five-dynasties',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 12,
            'text-anchor': 'center',
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1
          }
        });

        // Add marker if provided
        if (marker) {
          const el = document.createElement('div');
          el.className = 'location-marker';
          el.style.width = '32px';
          el.style.height = '32px';
          el.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iI0VGNDQ0NCIgZmlsbC1vcGFjaXR5PSIwLjgiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNSIgZmlsbD0iI0ZGRkZGRiIvPjwvc3ZnPg==)';
          el.style.backgroundSize = 'cover';
          el.style.cursor = 'pointer';

          markerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([marker.lng, marker.lat])
            .addTo(map);
        }

        // Auto-rotation logic
        let userInteracting = false;
        let spinEnabled = !marker;
        const secondsPerRevolution = 120;
        const maxSpinZoom = 5;
        const slowSpinZoom = 3;

        function spinGlobe() {
          const zoom = map.getZoom();
          if (spinEnabled && !userInteracting && zoom < maxSpinZoom && !marker) {
            let distancePerSecond = 360 / secondsPerRevolution;
            if (zoom > slowSpinZoom) {
              const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
              distancePerSecond *= zoomDif;
            }
            const center = map.getCenter();
            center.lng -= distancePerSecond / 60;
            map.easeTo({ center, duration: 1000 / 60, easing: (n: number) => n });
          }
        }

        const pauseAndResume = () => {
          userInteracting = false;
          setTimeout(() => { if (!userInteracting) spinEnabled = true; }, 3000);
        };

        map.on('mousedown', () => { userInteracting = true; spinEnabled = false; });
        map.on('mouseup', pauseAndResume);
        map.on('dragend', pauseAndResume);
        map.on('pitchend', pauseAndResume);
        map.on('rotateend', pauseAndResume);
        map.on('zoomstart', () => { userInteracting = true; spinEnabled = false; });
        map.on('zoomend', pauseAndResume);
        map.on('touchstart', () => { userInteracting = true; spinEnabled = false; });
        map.on('touchend', pauseAndResume);

        spinGlobe();
        setInterval(spinGlobe, 1000 / 60);
      });

      // Handle clicks - detect kingdom features
      if (!marker && !disableInteraction) {
        map.on('click', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['kingdoms-fill'] });

          if (features && features.length > 0) {
            const feature = features[0];
            const name = (feature.properties?.name as string) || `Location (${e.lngLat.lat.toFixed(2)}, ${e.lngLat.lng.toFixed(2)})`;
            const period = feature.properties?.period || '';

            new maplibregl.Marker({ color: '#FF6B6B' })
              .setLngLat([e.lngLat.lng, e.lngLat.lat])
              .setPopup(
                new maplibregl.Popup({ offset: 25 })
                  .setHTML(`<h3 style="font-weight:600">${name}</h3><p style="font-size:12px">${period}</p>`)
              )
              .addTo(map);

            onLocationClick({ name, lat: e.lngLat.lat, lng: e.lngLat.lng });
          } else {
            const name = `Location (${e.lngLat.lat.toFixed(2)}, ${e.lngLat.lng.toFixed(2)})`;
            onLocationClick({ name, lat: e.lngLat.lat, lng: e.lngLat.lng });
          }
        });
      }

      map.on('mouseenter', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', () => { map.getCanvas().style.cursor = ''; });

    } catch (err) {
      console.error('[Globe] Failed to initialize map:', err);
      setError(`Failed to initialize map: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) { /* suppress */ }
        mapRef.current = null;
      }
    };
  }, [onLocationClick, theme]);

  useEffect(() => {
    if (mapRef.current && !isLoading) {
      const styleUrl = THEME_STYLES[theme as GlobeTheme] || THEME_STYLES['dark-matter'];
      mapRef.current.setStyle(styleUrl);
    }
  }, [theme, isLoading]);

  useImperativeHandle(ref, () => ({
    selectRandomLocation: async () => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      // Random location within China region
      const lat = 22 + Math.random() * 18; // 22-40N
      const lng = 100 + Math.random() * 22; // 100-122E

      map.easeTo({
        center: [lng, lat],
        zoom: 5,
        duration: 2000,
        easing: (t: number) => t * (2 - t),
      });

      setTimeout(() => {
        const name = `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
        onLocationClick({ name, lat, lng });
      }, 2100);
    },
  }));

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Map Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading globe...</p>
          </div>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
      {!marker && (
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-medium">Click anywhere to explore Five Dynasties and Ten Kingdoms</p>
          <p className="text-xs text-muted-foreground mt-1">五代十国 (907-979 AD)</p>
        </div>
      )}
    </div>
  );
});

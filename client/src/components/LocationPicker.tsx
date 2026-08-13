import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from '../lib/leaflet-fix';

const PABELLON_CENTER: [number, number] = [22.1493, -102.2761];

interface Props {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number }) => void;
  height?: number | string;
}

function ClickHandler({ onChange }: { onChange: (v: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ value }: { value: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) {
      map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);
  return null;
}

const TILE_LAYERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
  },
} as const;

function LayerToggle({
  layer,
  onChange,
}: {
  layer: keyof typeof TILE_LAYERS;
  onChange: (l: keyof typeof TILE_LAYERS) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Deshabilitar la propagación de clicks/scroll al mapa de Leaflet
  // (no basta con React stopPropagation, porque Leaflet escucha a nivel DOM)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  const stop = (l: keyof typeof TILE_LAYERS) => () => onChange(l);

  return (
    <div
      ref={containerRef}
      className="leaflet-top leaflet-right"
      style={{ top: '10px', right: '10px' }}
    >
      <div className="leaflet-control bg-content1 rounded-lg shadow-md border border-default-200 p-1 flex gap-1">
        <button
          type="button"
          onClick={stop('street')}
          className={`px-2 py-1 text-xs rounded ${
            layer === 'street'
              ? 'bg-success text-white'
              : 'bg-default-100 text-default-700 hover:bg-default-200'
          }`}
        >
          🗺️ Calle
        </button>
        <button
          type="button"
          onClick={stop('satellite')}
          className={`px-2 py-1 text-xs rounded ${
            layer === 'satellite'
              ? 'bg-success text-white'
              : 'bg-default-100 text-default-700 hover:bg-default-200'
          }`}
        >
          🛰️ Satélite
        </button>
      </div>
    </div>
  );
}

export default function LocationPicker({ value, onChange, height = 320 }: Props) {
  const [layer, setLayer] = useState<keyof typeof TILE_LAYERS>('street');
  const center: [number, number] = value ? [value.lat, value.lng] : PABELLON_CENTER;
  const tiles = TILE_LAYERS[layer];

  return (
    <div
      className="rounded-lg overflow-hidden border border-default-200"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={value ? 15 : 13}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer attribution={tiles.attr} url={tiles.url} />
        <LayerToggle layer={layer} onChange={setLayer} />
        <ClickHandler onChange={onChange} />
        <Recenter value={value} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target as L.Marker;
                const p = m.getLatLng();
                onChange({ lat: p.lat, lng: p.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

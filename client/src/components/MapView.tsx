import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from '../lib/leaflet-fix';
import type { Actividad } from '../lib/types';
import { TIPO_COLOR_HEX } from '../lib/types';
import { formatDate } from '../lib/format';
import { useTipos } from '../lib/tipos';
import type { TipoColor } from '../lib/types';

const PABELLON_CENTER: [number, number] = [22.1493, -102.2761];

// Caché de iconos: misma combinación → mismo DivIcon
const iconCache = new Map<string, L.DivIcon>();
function getIcon(color: string, count: number, photoUrl?: string): L.DivIcon {
  const key = `${color}|${count}|${photoUrl ?? ''}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  // inner: si hay foto, un <img> absoluto que llena el círculo;
  // si no, el contador centrado. Como el padre está rotado -45° para
  // dar forma de gota, hay que contra-rotar el texto +45° para que
  // el número se vea derecho.
  const inner = photoUrl
    ? `<img src="${photoUrl}" loading="lazy" style="
        position:absolute; inset:3px;
        width:calc(100% - 6px); height:calc(100% - 6px);
        object-fit:cover; border-radius:50%;
      " onerror="this.style.display='none'"/>`
    : `<span style="
        position:absolute; inset:0;
        display:flex; align-items:center; justify-content:center;
        color:white; font-size:13px; font-weight:700;
        font-family:system-ui,-apple-system,sans-serif;
        line-height:1;
        text-shadow:0 1px 2px rgba(0,0,0,0.3);
        transform:rotate(45deg);
      ">${count > 0 ? count : ''}</span>`;

  // Si hay foto, el contenedor recorta con overflow:hidden para que la
  // imagen quede circular. Si no hay foto, NO debe haber overflow:hidden
  // porque el número necesita su espacio completo.
  const overflow = photoUrl ? 'hidden' : 'visible';

  const icon = L.divIcon({
    className: 'imbio-pin',
    html: `<div style="
      background:${color};
      width:36px; height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.45);
      position:relative;
      overflow:${overflow};
    ">${inner}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32],
  });
  iconCache.set(key, icon);
  return icon;
}

function pinColor(tipoKeys: string[], getColor: (k: string) => TipoColor): string {
  if (tipoKeys.length === 0) return '#9ca3af';
  return TIPO_COLOR_HEX[getColor(tipoKeys[0])] ?? '#9ca3af';
}

// Habilita zoom con scroll con sensibilidad reducida para no interferir
// con el scroll normal de la página (requiere más movimiento de rueda
// para cambiar de nivel de zoom). Leaflet usa `wheelPxPerZoomLevel` como
// prop independiente de MapOptions.
const WHEEL_PX_PER_ZOOM = 120;

// Botón flotante dentro del mapa (esquina superior derecha) para cambiar capa
function LayerToggle({
  layer,
  onChange,
}: {
  layer: 'street' | 'satellite';
  onChange: (l: 'street' | 'satellite') => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Deshabilitar la propagación de clicks/scroll al mapa de Leaflet
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  const stop = (l: 'street' | 'satellite') => () => onChange(l);

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

interface Props {
  actividades: Actividad[];
  height?: number | string;
  onEdit?: (a: Actividad) => void;
  onDelete?: (a: Actividad) => void;
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

export default function MapView({
  actividades,
  height = 'calc(100vh - 220px)',
  onEdit,
  onDelete,
}: Props) {
  const [layer, setLayer] = useState<'street' | 'satellite'>('street');
  const { getLabel, getColor } = useTipos();

  // Memo para que el centro no cambie la identidad del array si los datos no cambiaron
  const center = useMemo<[number, number]>(() => {
    if (actividades.length === 0) return PABELLON_CENTER;
    let lat = 0;
    let lng = 0;
    for (const a of actividades) {
      lat += a.lat;
      lng += a.lng;
    }
    return [lat / actividades.length, lng / actividades.length];
  }, [actividades]);

  const tiles = TILE_LAYERS[layer];

  return (
    <div
      className="rounded-lg overflow-hidden border border-default-200 relative"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        wheelPxPerZoomLevel={WHEEL_PX_PER_ZOOM}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer attribution={tiles.attr} url={tiles.url} />
        <LayerToggle layer={layer} onChange={setLayer} />

        {actividades.map((a) => {
          const color = pinColor(a.tiposIntervencion, getColor);
          const icon = getIcon(color, a.tiposIntervencion.length, a.fotos[0]?.url);
          return (
            <Marker key={a.id} position={[a.lat, a.lng]} icon={icon}>
              <Popup>
                <div className="space-y-1.5 min-w-[220px] max-w-[260px]">
                  {a.fotos[0] && (
                    <img
                      src={a.fotos[0].url}
                      alt={a.nombre}
                      loading="lazy"
                      className="w-full h-28 object-cover rounded-md"
                    />
                  )}
                  <p className="font-semibold text-sm leading-tight">{a.nombre}</p>
                  <div className="flex flex-wrap gap-1">
                    {a.tiposIntervencion.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: TIPO_COLOR_HEX[getColor(t)] }}
                      >
                        {getLabel(t)}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(a.fecha)}</p>
                  <p className="text-xs">
                    <span className="text-gray-500">Por: </span>
                    {a.realizadaPor}
                  </p>
                  <p className="text-xs">
                    <span className="text-gray-500">Dir: </span>
                    {a.direccion}
                  </p>
                  {a.fotos.length > 1 && (
                    <p className="text-xs text-gray-500">
                      📷 {a.fotos.length} foto(s)
                    </p>
                  )}
                  {(onEdit || onDelete) && (
                    <div className="flex gap-1 pt-1 border-t border-gray-200">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(a)}
                          className="flex-1 px-2 py-1 text-xs rounded bg-[#E8F1FB] text-[#002A5C] hover:bg-[#d6e7f8] border border-[#B3CFF0]"
                        >
                          ✏️ Editar
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar "${a.nombre}"?`)) onDelete(a);
                          }}
                          className="flex-1 px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

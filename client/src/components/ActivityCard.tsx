import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  Separator,
} from '@heroui/react';
import type { Actividad } from '../lib/types';
import { formatDate } from '../lib/format';
import { useTipos } from '../lib/tipos';
import TipoPill from './TipoPill';
import PhotoLightbox from './PhotoLightbox';

interface Props {
  actividad: Actividad;
  onEdit?: (a: Actividad) => void;
  onDelete?: (a: Actividad) => void;
}

export default function ActivityCard({ actividad, onEdit, onDelete }: Props) {
  const { getLabel, getColor } = useTipos();
  const [lightbox, setLightbox] = useState(false);
  const cover = actividad.fotos[0]?.url;
  const more = Math.max(0, actividad.fotos.length - 1);

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      {cover ? (
        <button
          type="button"
          className="relative w-full bg-[#f0f4fa] rounded-t-large cursor-pointer text-left"
          onClick={() => setLightbox(true)}
          aria-label="Ver foto completa"
        >
          <img
            alt={actividad.nombre}
            src={cover}
            loading="lazy"
            decoding="async"
            className="w-full max-h-80 object-contain"
          />
          {more > 0 && (
            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              +{more} foto{more > 1 ? 's' : ''}
            </span>
          )}
        </button>
      ) : (
        <div className="w-full h-20 rounded-t-large bg-gradient-to-br from-[#E8F1FB] to-[#f0f4fa] flex items-center justify-center">
          <p className="text-sm font-medium text-[#003B7A]">Sin fotografías</p>
        </div>
      )}

      <CardHeader className="flex flex-col items-start gap-2 pb-1">
        <h3 className="text-base font-semibold leading-tight w-full">
          {actividad.nombre}
        </h3>
        <div className="flex flex-wrap gap-1 w-full">
          {actividad.tiposIntervencion.map((t) => (
            <TipoPill key={t} color={getColor(t)} label={getLabel(t)} size="sm" />
          ))}
        </div>
        <p className="text-xs text-default-500">{formatDate(actividad.fecha)}</p>
      </CardHeader>

      <CardContent className="pt-1 space-y-1">
        <p className="text-sm">
          <span className="text-default-500">Realizada por: </span>
          {actividad.realizadaPor}
        </p>
        <p className="text-sm">
          <span className="text-default-500">Dirección: </span>
          {actividad.direccion}
        </p>
        {actividad.descripcion && (
          <p className="text-sm text-default-600 line-clamp-2">
            {actividad.descripcion}
          </p>
        )}
        <Separator className="my-2" />
        <p className="text-xs text-default-400">
          📍 {actividad.lat.toFixed(4)}, {actividad.lng.toFixed(4)}
        </p>
      </CardContent>

      <CardFooter className="flex justify-end gap-1">
        {onEdit && (
          <Button size="sm" variant="secondary" onPress={() => onEdit(actividad)}>
            Editar
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="danger"
            onPress={() => onDelete(actividad)}
          >
            Eliminar
          </Button>
        )}
      </CardFooter>
      {lightbox && (
        <PhotoLightbox
          urls={actividad.fotos.map((f) => f.url)}
          alt={actividad.nombre}
          onClose={() => setLightbox(false)}
        />
      )}
    </Card>
  );
}

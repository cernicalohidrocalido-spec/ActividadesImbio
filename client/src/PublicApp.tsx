import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import {
  Spinner,
  EmptyState,
  Avatar,
} from '@heroui/react';
import ActivityCard from './components/ActivityCard';
import AppNavbar from './components/Navbar';
import { listActividadesPublico } from './lib/api';
import { error } from './lib/toast';
import type { Actividad, ListFilters } from './lib/types';
import { currentMonth, groupByWeek } from './lib/format';

const MapView = lazy(() => import('./components/MapView'));

type ViewMode = 'cards' | 'map';

export default function PublicApp() {
  const [filters, setFilters] = useState<ListFilters>({ mes: currentMonth() });
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('cards');

  async function reload() {
    setLoading(true);
    try {
      const data = await listActividadesPublico(filters);
      setActividades(data);
    } catch (e) {
      error('Error al cargar', e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.mes, filters.tipo, filters.q, filters.desde, filters.hasta]);

  const weeks = useMemo(
    () => groupByWeek(actividades, (a) => a.fecha),
    [actividades]
  );

  const empty = !loading && actividades.length === 0;

  return (
    <div className="min-h-screen bg-[#f0f4fa]">
      <AppNavbar
        publicMode
        view={view}
        onViewChange={setView}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <main className="p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-default-500">Cargando actividades...</p>
            </div>
          ) : view === 'map' ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-16">
                  <Spinner />
                </div>
              }
            >
              <MapView actividades={actividades} />
            </Suspense>
          ) : empty ? (
            <EmptyState className="py-16">
              <div className="text-center flex flex-col items-center gap-3">
                <Avatar size="lg" variant="soft" className="shrink-0">
                  <Avatar.Fallback className="text-4xl bg-[#E8F1FB]">📭</Avatar.Fallback>
                </Avatar>
                <h3 className="text-xl font-semibold text-[#002A5C]">
                  No hay actividades en este periodo
                </h3>
                <p className="text-sm text-[#4b5563]">
                  Prueba otro mes o limpia los filtros para ver el registro público.
                </p>
              </div>
            </EmptyState>
          ) : (
            <div className="space-y-8">
              {weeks.map((week) => (
                <section key={week.key} aria-labelledby={`semana-${week.key}`}>
                  <div className="flex items-end justify-between gap-3 mb-3 border-b border-[#B3CFF0] pb-2">
                    <h2
                      id={`semana-${week.key}`}
                      className="text-base sm:text-lg font-bold text-[#002A5C]"
                    >
                      {week.label}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#4b5563] shrink-0">
                      {week.items.length} actividad
                      {week.items.length === 1 ? '' : 'es'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {week.items.map((a) => (
                      <ActivityCard key={a.id} actividad={a} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
      </main>
    </div>
  );
}

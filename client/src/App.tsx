import { useState, useEffect, lazy, Suspense, Component, type ReactNode } from 'react';
import {
  Chip,
  Card,
  CardContent,
  Button,
  ButtonGroup,
  Spinner,
  EmptyState,
  Avatar,
  Separator,
} from '@heroui/react';
import ActivityCard from './components/ActivityCard';
import ActivityFilters from './components/ActivityFilters';
import ActivityForm from './components/ActivityForm';
import AppNavbar from './components/Navbar';
import { listActividades, deleteActividad, downloadReportePDF, downloadReporteExcel } from './lib/api';
import { success, error, warning } from './lib/toast';
import type { Actividad, ListFilters } from './lib/types';
import { currentMonth } from './lib/format';

const MapView = lazy(() => import('./components/MapView'));

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('ErrorBoundary:', error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-danger-50">
          <Card className="max-w-2xl w-full border border-danger-200">
            <CardContent className="space-y-3">
              <h1 className="text-xl font-bold text-danger">Algo se rompió 💥</h1>
              <p className="text-sm text-foreground">{this.state.error.message}</p>
              <Separator className="my-2" />
              <pre className="text-xs bg-default-100 p-2 rounded overflow-auto max-h-64">
                {this.state.error.stack}
              </pre>
              <Button
                variant="primary"
                onPress={() => this.setState({ error: null })}
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

type ViewMode = 'cards' | 'map';

export default function App() {
  const [filters, setFilters] = useState<ListFilters>({ mes: currentMonth() });
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('cards');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Actividad | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const data = await listActividades(filters);
      setActividades(data);
    } catch (e) {
      error('Error al cargar', e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.mes, filters.tipo, filters.q, filters.desde, filters.hasta]);

  function handleNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(a: Actividad) {
    setEditing(a);
    setFormOpen(true);
  }

  async function handleDelete(a: Actividad) {
    if (!confirm(`¿Eliminar "${a.nombre}"?`)) return;
    try {
      await deleteActividad(a.id);
      success('Actividad eliminada');
      reload();
    } catch (e) {
      error('Error al eliminar', e instanceof Error ? e.message : '');
    }
  }

  function handleSaved() {
    success('Actividad guardada');
    reload();
  }

  function handleDownloadPDF() {
    downloadReportePDF(filters);
  }

  function handleDownloadExcel() {
    downloadReporteExcel(filters);
  }

  const empty = !loading && actividades.length === 0;

  return (
    <ErrorBoundary>
      <AppNavbar />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-emerald-800">
              Registro de actividades
            </h1>
            <p className="text-sm text-default-500">
              {actividades.length} actividad(es) · {filters.mes}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ButtonGroup>
              <Button
                variant={view === 'cards' ? 'primary' : 'secondary'}
                onPress={() => setView('cards')}
              >
                🗂️ Cards
              </Button>
              <Button
                variant={view === 'map' ? 'primary' : 'secondary'}
                onPress={() => setView('map')}
              >
                🗺️ Mapa
              </Button>
            </ButtonGroup>
            <Button variant="primary" onPress={handleNew}>
              + Nueva actividad
            </Button>
          </div>
        </div>

        <Card>
          <CardContent>
            <ActivityFilters
              filters={filters}
              onChange={setFilters}
              onClear={() => setFilters({})}
              onDownloadPDF={handleDownloadPDF}
              onDownloadExcel={handleDownloadExcel}
              total={actividades.length}
            />
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner color="success" size="lg" />
            <p className="text-sm text-default-500">Cargando actividades...</p>
          </div>
        ) : empty ? (
          <EmptyState className="py-16">
            <div className="text-center flex flex-col items-center gap-3">
              <Avatar
                size="lg"
                color="success"
                variant="soft"
                className="shrink-0"
              >
                <Avatar.Fallback className="text-4xl bg-success-100">
                  📭
                </Avatar.Fallback>
              </Avatar>
              <h3 className="text-xl font-semibold">No hay actividades</h3>
              <p className="text-sm text-default-500">
                Ajusta los filtros o registra la primera actividad del periodo.
              </p>
              <Button variant="primary" onPress={handleNew}>
                + Registrar actividad
              </Button>
            </div>
          </EmptyState>
        ) : view === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {actividades.map((a) => (
              <ActivityCard
                key={a.id}
                actividad={a}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16">
                <Spinner color="success" />
              </div>
            }
          >
            <MapView
              actividades={actividades}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Suspense>
        )}
      </div>

      <ActivityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        actividad={editing}
        onSaved={handleSaved}
      />
    </ErrorBoundary>
  );
}

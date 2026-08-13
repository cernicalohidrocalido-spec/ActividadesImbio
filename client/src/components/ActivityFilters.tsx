import { useState, type CSSProperties } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverDialog,
  CheckboxGroup,
  Checkbox,
  Input,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectIndicator,
  SelectPopover,
  ListBox,
  ListBoxItem,
  Separator,
} from '@heroui/react';
import type { ListFilters } from '../lib/types';
import { TIPO_COLOR_HEX } from '../lib/types';
import { useTipos } from '../lib/tipos';

interface Props {
  filters: ListFilters;
  onChange: (f: ListFilters) => void;
  onClear: () => void;
  onDownloadPDF: () => void;
  onDownloadExcel: () => void;
  pdfLoading?: boolean;
  total: number;
}

const TODOS = 'TODOS';

function keyToString(k: unknown): string {
  if (k == null) return '';
  if (typeof k === 'string') return k;
  if (typeof k === 'number') return String(k);
  if (k instanceof Set) {
    const arr = Array.from(k);
    return arr[0] != null ? String(arr[0]) : '';
  }
  if (Array.isArray(k)) {
    return k[0] != null ? String(k[0]) : '';
  }
  return String(k);
}

const COLOR_DOT = TIPO_COLOR_HEX;

export default function ActivityFilters({
  filters,
  onChange,
  onClear,
  onDownloadPDF,
  onDownloadExcel,
  pdfLoading,
  total,
}: Props) {
  const { tipos } = useTipos();
  const set = (patch: Partial<ListFilters>) => onChange({ ...filters, ...patch });

  const meses = [
    { value: TODOS, label: 'Todos los meses' },
    ...Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      const year = new Date().getFullYear();
      return {
        value: `${year}-${m}`,
        label: new Date(year, i, 1).toLocaleDateString('es-MX', { month: 'long' }),
      };
    }),
  ];

  const selectedMes = filters.mes ?? TODOS;
  const tiposActivos = tipos.filter((t) => t.activo);
  const selectedTipoKeys = new Set(filters.tipo ?? []);

  // Estado local del popover de tipos
  const [tiposOpen, setTiposOpen] = useState(false);
  const [tipoSearch, setTipoSearch] = useState('');

  const tiposFiltrados = tiposActivos.filter((t) =>
    t.label.toLowerCase().includes(tipoSearch.toLowerCase())
  );

  function toggleTipo(key: string) {
    const current = new Set(filters.tipo ?? []);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    set({ tipo: current.size > 0 ? Array.from(current) : undefined });
  }

  function clearTipos() {
    set({ tipo: undefined });
    setTipoSearch('');
  }

  // Texto del trigger del multi-select
  const tiposLabel = (() => {
    if (selectedTipoKeys.size === 0) return 'Todos los tipos';
    if (selectedTipoKeys.size === 1) {
      const k = Array.from(selectedTipoKeys)[0];
      return tiposActivos.find((t) => t.key === k)?.label ?? '1 tipo';
    }
    return `${selectedTipoKeys.size} tipos`;
  })();

  const hasFilters =
    (filters.q && filters.q.length > 0) ||
    (filters.tipo && filters.tipo.length > 0) ||
    (filters.mes && filters.mes !== currentYearMonth());

  function currentYearMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Fila de campos: cada filtro ocupa 1/3 del ancho en desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* Búsqueda — 1/3 */}
        <div className="w-full">
          <Input
            type="search"
            placeholder="Buscar por nombre..."
            aria-label="Buscar actividad por nombre"
            value={filters.q ?? ''}
            onChange={(e) =>
              set({ q: (e.target as HTMLInputElement).value || undefined })
            }
          />
        </div>

        {/* Mes — 1/3 */}
        <div className="w-full">
          <Select
            selectedKey={selectedMes}
            onSelectionChange={(k) => {
              const v = keyToString(k);
              set({ mes: v === TODOS ? undefined : v });
            }}
          >
            <SelectTrigger>
              <SelectValue />
              <SelectIndicator />
            </SelectTrigger>
            <SelectPopover>
              <ListBox>
                {meses.map((m) => (
                  <ListBoxItem key={m.value} id={m.value}>
                    {m.label}
                  </ListBoxItem>
                ))}
              </ListBox>
            </SelectPopover>
          </Select>
        </div>

        {/* Tipos — 1/3 */}
        <div className="w-full">
          <Popover
            isOpen={tiposOpen}
            onOpenChange={(open) => {
              setTiposOpen(open);
              if (!open) setTipoSearch('');
            }}
          >
            <PopoverTrigger>
              <button
                type="button"
                className={`w-full h-10 px-3 rounded-field border transition-colors flex items-center justify-between text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-success ${
                  tiposOpen || selectedTipoKeys.size > 0
                    ? 'border-success bg-success-50'
                    : 'border-default-200 bg-default-100 hover:bg-default-200'
                }`}
                aria-label="Filtrar por tipo de intervención"
              >
                <span className="truncate text-left flex-1 flex items-center gap-2">
                  {selectedTipoKeys.size > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-success text-white text-xs font-semibold">
                      {selectedTipoKeys.size}
                    </span>
                  )}
                  {tiposLabel}
                </span>
                <SelectIndicator />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-0 z-[10000]">
              <PopoverDialog>
                {/* Header */}
                <div className="p-3 border-b border-default-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Tipos de intervención</p>
                    <p className="text-xs text-default-500">
                      {selectedTipoKeys.size} de {tiposActivos.length} seleccionados
                    </p>
                  </div>
                  <Input
                    type="search"
                    placeholder="Buscar tipo..."
                    value={tipoSearch}
                    onChange={(e) => setTipoSearch((e.target as HTMLInputElement).value)}
                    aria-label="Buscar tipo"
                  />
                </div>

                {/* Lista */}
                <div className="max-h-72 overflow-y-auto p-1">
                  {tiposFiltrados.length === 0 ? (
                    <p className="text-sm text-default-500 p-4 text-center">
                      {tipoSearch
                        ? `No hay tipos que coincidan con "${tipoSearch}"`
                        : 'No hay tipos activos'}
                    </p>
                  ) : (
                    <CheckboxGroup
                      value={Array.from(selectedTipoKeys)}
                      onChange={(keys) => {
                        set({ tipo: keys.length > 0 ? keys : undefined });
                      }}
                      className="gap-0"
                    >
                      {tiposFiltrados.map((t) => {
                        const isSelected = selectedTipoKeys.has(t.key);
                        const colorHex = COLOR_DOT[t.color] ?? '#6b7280';
                        return (
                          <Checkbox
                            key={t.key}
                            value={t.key}
                            className="group w-full p-2.5 hover:bg-default-100 rounded-md cursor-pointer data-[selected=true]:bg-[color-mix(in_srgb,var(--check-color)_15%,transparent)] flex-row items-center gap-2.5"
                            style={{ '--check-color': colorHex } as CSSProperties}
                          >
                            <Checkbox.Control className="shrink-0 border-2 border-default-300 bg-white group-data-[selected=true]:!bg-[var(--check-color)] group-data-[selected=true]:!border-[var(--check-color)] transition-colors">
                              <Checkbox.Indicator className="text-white" />
                            </Checkbox.Control>
                            <Checkbox.Content className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white"
                                  style={{ backgroundColor: colorHex }}
                                />
                                <span className="text-sm flex-1 truncate">{t.label}</span>
                                {isSelected && (
                                  <span
                                    className="text-xs font-bold"
                                    style={{ color: colorHex }}
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                            </Checkbox.Content>
                          </Checkbox>
                        );
                      })}
                    </CheckboxGroup>
                  )}
                </div>

                {/* Footer */}
                <Separator />
                <div className="p-2.5 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={clearTipos}
                    isDisabled={selectedTipoKeys.size === 0}
                  >
                    Limpiar
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onPress={() => setTiposOpen(false)}
                  >
                    Listo
                  </Button>
                </div>
              </PopoverDialog>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Fila inferior: contador + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-default-500">
          {total} actividad{total === 1 ? '' : 'es'} encontrada{total === 1 ? '' : 's'}
          {(filters.tipo?.length ?? 0) > 0 && (
            <span className="ml-1.5 text-default-400">
              · {filters.tipo!.length} tipo{filters.tipo!.length > 1 ? 's' : ''}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant="secondary"
            onPress={onClear}
            isDisabled={!hasFilters}
          >
            Limpiar filtros
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={onDownloadExcel}
            isDisabled={total === 0}
            className="bg-emerald-50 text-emerald-700 border-emerald-200 data-[hover=true]:bg-emerald-100"
          >
            📊 Excel
          </Button>
          <Button
            size="sm"
            variant="primary"
            isPending={pdfLoading}
            onPress={onDownloadPDF}
            isDisabled={!filters.mes}
            className="bg-emerald-600 data-[hover=true]:bg-emerald-700"
          >
            {pdfLoading ? null : '📄  '}Reporte PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

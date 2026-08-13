import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { listTipos, listTiposPublicos, createTipo, deleteTipo, updateTipo, type TipoInput } from './api';
import type { TipoConfig } from './types';

interface TiposContextValue {
  tipos: TipoConfig[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTipo: (input: TipoInput) => Promise<TipoConfig>;
  removeTipo: (id: number) => Promise<void>;
  editTipo: (id: number, input: Partial<TipoInput & { activo: boolean }>) => Promise<TipoConfig>;
  getLabel: (key: string) => string;
  getColor: (key: string) => TipoConfig['color'];
}

const TiposContext = createContext<TiposContextValue | null>(null);

export function TiposProvider({
  children,
  publicOnly = false,
}: {
  children: ReactNode;
  publicOnly?: boolean;
}) {
  const [tipos, setTipos] = useState<TipoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = publicOnly ? await listTiposPublicos() : await listTipos();
      setTipos(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar tipos');
    } finally {
      setLoading(false);
    }
  }, [publicOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTipo = useCallback(async (input: TipoInput) => {
    const created = await createTipo(input);
    setTipos((prev) =>
      [...prev, created].sort((a, b) => a.order - b.order || a.id - b.id)
    );
    return created;
  }, []);

  const removeTipo = useCallback(async (id: number) => {
    await deleteTipo(id);
    setTipos((prev) => prev.map((t) => (t.id === id ? { ...t, activo: false } : t)));
  }, []);

  const editTipo = useCallback(
    async (id: number, input: Partial<TipoInput & { activo: boolean }>) => {
      const updated = await updateTipo(id, input);
      setTipos((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
      return updated;
    },
    []
  );

  const byKey = new Map(tipos.map((t) => [t.key, t]));

  const getLabel = (key: string) => byKey.get(key)?.label ?? key;
  const getColor = (key: string) => byKey.get(key)?.color ?? 'neutral';

  return (
    <TiposContext.Provider
      value={{ tipos, loading, error, refresh, addTipo, removeTipo, editTipo, getLabel, getColor }}
    >
      {children}
    </TiposContext.Provider>
  );
}

export function useTipos(): TiposContextValue {
  const ctx = useContext(TiposContext);
  if (!ctx) throw new Error('useTipos debe usarse dentro de TiposProvider');
  return ctx;
}

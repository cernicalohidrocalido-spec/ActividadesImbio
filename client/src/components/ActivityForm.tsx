import { useEffect, useState, useRef, useMemo, lazy, Suspense } from 'react';
import {
  Modal,
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading,
  ModalBody,
  ModalFooter,
  TextField,
  TextArea,
  Label,
  Input,
  Description,
  FieldError,
  Button,
  ButtonGroup,
  Separator,
  Spinner,
} from '@heroui/react';
import type { Actividad, ActividadInput, Foto } from '../lib/types';
import { toInputDate } from '../lib/format';
import { createActividad, updateActividad, uploadFotos, deleteFoto, mejorarDescripcion, getHealth } from '../lib/api';
import { success, error as toastError } from '../lib/toast';
import { useTipos } from '../lib/tipos';
import { reverseGeocode } from '../lib/geocode';
import TipoManager from './TipoManager';
import TipoPill from './TipoPill';

const LocationPicker = lazy(() => import('./LocationPicker'));

function extractValue(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'target' in v) {
    return (v as { target: { value?: string } }).target?.value ?? '';
  }
  return String(v ?? '');
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actividad: Actividad | null;
  onSaved: (a: Actividad) => void;
}

interface DireccionPartes {
  calle: string;
  numero: string;
  colonia: string;
  referencia: string;
}

function parseDireccion(d: string): DireccionPartes {
  const partes: DireccionPartes = { calle: d, numero: '', colonia: '', referencia: '' };
  if (!d) return partes;
  const segmentos = d.split(',').map((s) => s.trim());
  if (segmentos[0]) {
    const m = segmentos[0].match(/^(.*?)\s*#?(\S+)$/);
    if (m) {
      partes.calle = m[1].trim();
      partes.numero = m[2].trim();
    } else {
      partes.calle = segmentos[0];
    }
  }
  if (segmentos[1]) {
    const colMatch = segmentos[1].match(/^(?:Col\.|Colonia)\s*(.+)$/i);
    partes.colonia = colMatch ? colMatch[1] : segmentos[1];
  }
  if (segmentos[2]) {
    const refMatch = segmentos[2].match(/^(?:Ref\.|Referencia)\s*(.+)$/i);
    partes.referencia = refMatch ? refMatch[1] : segmentos[2];
  }
  return partes;
}

function buildDireccion(p: DireccionPartes): string {
  const partes: string[] = [];
  const cn = [p.calle, p.numero].filter(Boolean).join(' #').trim();
  if (cn) partes.push(cn);
  if (p.colonia) partes.push(`Col. ${p.colonia}`);
  if (p.referencia) partes.push(`Ref. ${p.referencia}`);
  return partes.join(', ');
}

export default function ActivityForm({ open, onOpenChange, actividad, onSaved }: Props) {
  const isEdit = !!actividad;
  const { tipos: tiposConfig, loading: tiposLoading } = useTipos();
  const [tipoManagerOpen, setTipoManagerOpen] = useState(false);

  const [nombre, setNombre] = useState('');
  const [tipos, setTipos] = useState<string[]>([]);
  const [fecha, setFecha] = useState<string>(toInputDate(new Date().toISOString()));
  const [realizadaPor, setRealizadaPor] = useState('');
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [colonia, setColonia] = useState('');
  const [referencia, setReferencia] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [matlachoBusy, setMatlachoBusy] = useState(false);
  const [matlachoSugerencia, setMatlachoSugerencia] = useState<string | null>(null);
  const [matlachoError, setMatlachoError] = useState<string | null>(null);
  const [fotosReady, setFotosReady] = useState(true);
  const skipNextPosChange = useRef(true);

  // URLs de preview (object URLs) para los archivos pendientes
  const pendingPreviews = useMemo(() => {
    return pendingFiles.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
    }));
  }, [pendingFiles]);
  // Liberar las URLs cuando cambian o al desmontar
  useEffect(() => {
    return () => {
      pendingPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [pendingPreviews]);

  // Solo tipos activos para selección
  const tiposActivos = tiposConfig.filter((t) => t.activo);

  const formKey = actividad?.id ?? 'new';
  const loadedKey = useRef<string | number | null>(null);

  useEffect(() => {
    if (!open) {
      loadedKey.current = null;
      return;
    }
    if (loadedKey.current === formKey) return;
    loadedKey.current = formKey;
    setErrorMsg(null);
    const partes = parseDireccion(actividad?.direccion ?? '');
    setNombre(actividad?.nombre ?? '');
    const fromActividad = actividad?.tiposIntervencion ?? [];
    const filtered = fromActividad.filter((k) =>
      tiposConfig.some((t) => t.key === k && t.activo)
    );
    setTipos(
      filtered.length > 0
        ? filtered
        : tiposConfig.find((t) => t.activo)?.key
          ? [tiposConfig.find((t) => t.activo)!.key]
          : []
    );
    setFecha(actividad ? toInputDate(actividad.fecha) : toInputDate(new Date().toISOString()));
    setRealizadaPor(actividad?.realizadaPor ?? '');
    setCalle(partes.calle);
    setNumero(partes.numero);
    setColonia(partes.colonia);
    setReferencia(partes.referencia);
    setDescripcion(actividad?.descripcion ?? '');
    setPos(actividad ? { lat: actividad.lat, lng: actividad.lng } : null);
    setFotos(actividad?.fotos ?? []);
    setPendingFiles([]);
    setMatlachoSugerencia(null);
    setMatlachoError(null);
    setFotosReady(true);
    void getHealth()
      .then((h) => setFotosReady(h.fotos !== 'none'))
      .catch(() => setFotosReady(true));
    skipNextPosChange.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, formKey, tiposConfig.length]);

  // Auto-rellenar dirección cuando el usuario mueve/selecciona el pin
  useEffect(() => {
    if (!open) return;
    if (skipNextPosChange.current) {
      skipNextPosChange.current = false;
      return;
    }
    if (!pos) return;
    let cancelled = false;
    setGeocoding(true);
    reverseGeocode(pos.lat, pos.lng)
      .then((g) => {
        if (cancelled || !g) return;
        // Solo rellenamos si el usuario aún no ha escrito en esos campos
        // (calle y colonia vacíos) — referencia siempre la respetamos
        setCalle((prev) => (prev.trim() === '' && g.calle ? g.calle : prev));
        setNumero((prev) => (prev.trim() === '' && g.numero ? g.numero : prev));
        setColonia((prev) => (prev.trim() === '' && g.colonia ? g.colonia : prev));
      })
      .finally(() => {
        if (!cancelled) setGeocoding(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pos, open]);

  async function handleSave() {
    setErrorMsg(null);
    if (!nombre.trim()) return setErrorMsg('El nombre es obligatorio');
    if (tipos.length === 0) return setErrorMsg('Selecciona al menos un tipo de intervención');
    if (!realizadaPor.trim()) return setErrorMsg('Indica quién realizó la actividad');
    const direccion = buildDireccion({ calle, numero, colonia, referencia });
    if (!direccion.trim()) return setErrorMsg('La dirección es obligatoria');
    if (!pos) return setErrorMsg('Selecciona la ubicación en el mapa');
    if (!fecha) return setErrorMsg('La fecha es obligatoria');

    setSaving(true);
    try {
      const payload: ActividadInput = {
        nombre: nombre.trim(),
        tiposIntervencion: tipos,
        fecha: new Date(fecha).toISOString(),
        realizadaPor: realizadaPor.trim(),
        direccion,
        descripcion: descripcion.trim(),
        lat: pos.lat,
        lng: pos.lng,
      };
      let saved: Actividad;
      if (isEdit && actividad) {
        saved = await updateActividad(actividad.id, payload);
      } else {
        saved = await createActividad(payload);
      }
      if (pendingFiles.length > 0) {
        try {
          const uploaded = await uploadFotos(saved.id, pendingFiles);
          saved = { ...saved, fotos: [...saved.fotos, ...uploaded] };
          setPendingFiles([]);
          setFotos(saved.fotos);
        } catch (photoErr) {
          const photoMsg =
            photoErr instanceof Error ? photoErr.message : 'No se pudo subir la foto';
          setErrorMsg(`La actividad se guardó, pero la foto no: ${photoMsg}`);
          toastError('Foto no subida', photoMsg);
          return;
        }
      }
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setErrorMsg(msg);
      toastError('Error al guardar', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFoto(fotoId: number) {
    if (!actividad) return;
    try {
      await deleteFoto(fotoId);
      setFotos((prev) => prev.filter((f) => f.id !== fotoId));
      success('Foto eliminada');
    } catch (e) {
      toastError('Error al eliminar foto', e instanceof Error ? e.message : '');
    }
  }

  async function handleMatlacho() {
    const texto = descripcion.trim();
    if (texto.length < 10) {
      setMatlachoSugerencia(null);
      setMatlachoError('Escribe al menos una oración y pulsa de nuevo.');
      return;
    }
    setMatlachoBusy(true);
    setMatlachoError(null);
    setMatlachoSugerencia(null);
    try {
      const tiposLabel = tipos
        .map((k) => tiposConfig.find((t) => t.key === k)?.label ?? k)
        .filter(Boolean);
      const improved = await mejorarDescripcion({
        descripcion: texto,
        tipos: tiposLabel,
        colonia: colonia.trim() || undefined,
        nombre: nombre.trim() || undefined,
      });
      setMatlachoSugerencia(improved);
    } catch (e) {
      setMatlachoError(e instanceof Error ? e.message : 'No se pudo mejorar el texto.');
    } finally {
      setMatlachoBusy(false);
    }
  }

  function toggleTipo(t: string) {
    setTipos((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  return (
    <>
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <ModalBackdrop isDismissable={false} variant="blur" className="z-[9999]">
        <ModalContainer size="full" scroll="inside" placement="center" className="z-[10000]">
          <ModalDialog className="max-w-5xl w-full">
            <ModalHeader>
              <ModalHeading>
                {isEdit ? 'Editar actividad' : 'Nueva actividad'}
              </ModalHeading>
            </ModalHeader>
            <ModalBody className="space-y-4 py-4">
              <Description>
                Completa los datos y selecciona la ubicación en el mapa.
              </Description>

              <div className="space-y-4">
                {/* ===== Nombre ===== */}
                <TextField
                  value={nombre}
                  onChange={(v) => setNombre(extractValue(v))}
                  isRequired
                  fullWidth
                >
                  <Label>Nombre de la actividad o área verde</Label>
                  <Input placeholder="Ej. Limpieza Parque Central" />
                  <Description>Nombre descriptivo para identificar la actividad.</Description>
                </TextField>

                {/* ===== Tipos de intervención ===== */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      Tipos de intervención <span className="text-danger">*</span>
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => setTipoManagerOpen(true)}
                    >
                      ⚙️ Gestionar tipos
                    </Button>
                  </div>
                  {tiposLoading ? (
                    <p className="text-sm text-default-500">Cargando tipos...</p>
                  ) : tiposActivos.length === 0 ? (
                    <div className="text-sm text-default-500 bg-default-50 p-3 rounded">
                      No hay tipos activos. Crea al menos uno con el botón "Gestionar tipos".
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tiposActivos.map((t) => {
                        const active = tipos.includes(t.key);
                        return (
                          <TipoPill
                            key={t.key}
                            color={t.color}
                            label={t.label}
                            size="md"
                            active={active}
                            onClick={() => toggleTipo(t.key)}
                          />
                        );
                      })}
                    </div>
                  )}
                  <Description>
                    Click para activar/desactivar. Puedes elegir varios.
                  </Description>
                </div>

                {/* ===== Equipo / quien realizó + Fecha ===== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    value={realizadaPor}
                    onChange={(v) => setRealizadaPor(extractValue(v))}
                    isRequired
                    fullWidth
                  >
                    <Label>Equipo o nombre de quien realizó la actividad</Label>
                    <Input placeholder="Ej. Cuadrilla de deshierbe / Ana Karen" />
                  </TextField>
                  <TextField
                    value={fecha}
                    onChange={(v) => setFecha(extractValue(v))}
                    isRequired
                    fullWidth
                  >
                    <Label>Fecha de la actividad</Label>
                    <Input type="date" />
                    <Description>Día en que se realizó la actividad.</Description>
                  </TextField>
                </div>

                {/* ===== Dirección: Calle + Número ===== */}
                <div>
                  <p className="text-sm font-medium mb-2">Dirección</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      value={calle}
                      onChange={(v) => setCalle(extractValue(v))}
                      isRequired
                      fullWidth
                    >
                      <Label>Calle</Label>
                      <Input placeholder="Av. Hidalgo" />
                    </TextField>
                    <TextField
                      value={numero}
                      onChange={(v) => setNumero(extractValue(v))}
                      fullWidth
                    >
                      <Label>Número</Label>
                      <Input placeholder="123 o s/n" />
                    </TextField>
                  </div>
                </div>

                {/* ===== Dirección: Colonia + Referencia ===== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    value={colonia}
                    onChange={(v) => setColonia(extractValue(v))}
                    fullWidth
                  >
                    <Label>Colonia</Label>
                    <Input placeholder="Centro" />
                  </TextField>
                  <TextField
                    value={referencia}
                    onChange={(v) => setReferencia(extractValue(v))}
                    fullWidth
                  >
                    <Label>Referencia</Label>
                    <Input placeholder="Frente al kiosko" />
                  </TextField>
                </div>

                {/* ===== Descripción ===== */}
                <div>
                  <TextField fullWidth>
                    <Label>Descripción</Label>
                    <TextArea
                      placeholder="Detalles de la actividad..."
                      value={descripcion}
                      onChange={(v) => setDescripcion(extractValue(v))}
                      rows={3}
                    />
                  </TextField>
                  <button
                    type="button"
                    onClick={() => void handleMatlacho()}
                    disabled={matlachoBusy}
                    className="mt-2.5 w-full py-3 px-3 rounded-[11px] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                    style={{ background: 'linear-gradient(135deg,#003B7A,#0057B8)' }}
                  >
                    {matlachoBusy ? '⏳ Matlacho está mejorando tu texto…' : '🐭 Matlacho — Mejorar mi descripción'}
                  </button>
                  {matlachoError ? (
                    <p className="mt-2 text-sm text-[#991b1b] bg-[#fee2e2] border border-[#fca5a5] rounded-lg px-3 py-2">
                      {matlachoError}
                    </p>
                  ) : null}
                  {matlachoSugerencia ? (
                    <div className="mt-2 text-sm text-[#1a3a5c] bg-[#E8F1FB] border border-[#B3CFF0] rounded-lg px-3 py-3">
                      <p className="font-semibold mb-1">🐭 Matlacho sugiere:</p>
                      <p className="leading-relaxed">{matlachoSugerencia}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-md bg-[#003B7A] text-white text-xs font-bold"
                          onClick={() => {
                            setDescripcion(matlachoSugerencia);
                            setMatlachoSugerencia(null);
                          }}
                        >
                          ✅ Aplicar
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-md bg-[#e5e7eb] text-[#374151] text-xs"
                          onClick={() => setMatlachoSugerencia(null)}
                        >
                          ✕ Cerrar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* ===== Ubicación (mapa) ===== */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">
                      Ubicación <span className="text-danger">*</span>
                    </p>
                    {geocoding && (
                      <span className="text-xs text-default-500 flex items-center gap-1">
                        <Spinner size="sm" /> Detectando dirección...
                      </span>
                    )}
                  </div>
                  <Description className="mb-2">
                    Haz click en el mapa o arrastra el pin para ajustar la posición.
                    La dirección se auto-rellena, pero puedes editarla.
                  </Description>
                  <Suspense
                    fallback={
                      <div
                        className="rounded-lg border border-default-200 flex items-center justify-center text-sm text-default-500"
                        style={{ height: 500 }}
                      >
                        Cargando mapa...
                      </div>
                    }
                  >
                    <LocationPicker value={pos} onChange={setPos} height={500} />
                  </Suspense>
                  {pos && (
                    <p className="text-xs text-default-500 mt-1">
                      📍 {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                    </p>
                  )}
                </div>

                <Separator className="my-2" />

                {/* ===== Fotografías ===== */}
                <div>
                  <p className="text-sm font-medium mb-2">Fotografías</p>
                  {isEdit && fotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {fotos.map((f) => (
                        <div key={f.id} className="relative group">
                          <img
                            src={f.url}
                            alt="foto"
                            loading="lazy"
                            decoding="async"
                            className="rounded-md object-contain w-24 h-24 bg-[#f0f4fa] border border-default-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteFoto(f.id)}
                            className="absolute -top-1 -right-1 bg-danger text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!fotosReady && (
                    <p className="text-sm bg-warning-50 text-warning-800 border border-warning-200 rounded-md p-2 mb-3">
                      Falta configurar Cloudinary. En Render → Environment, CLOUDINARY_URL debe
                      ser <code className="text-xs">cloudinary://API_KEY:API_SECRET@CLOUD_NAME</code>{' '}
                      (Dashboard de Cloudinary → API Keys). Sin eso la foto no se guarda.
                    </p>
                  )}
                  <label className="block">
                    <span className="text-sm font-medium text-default-700 block mb-1">
                      Agregar fotografías
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const target = e.target as HTMLInputElement;
                        const files = Array.from(target.files ?? []);
                        target.value = '';
                        if (files.length === 0) return;
                        if (isEdit && actividad) {
                          setErrorMsg(null);
                          setSaving(true);
                          void uploadFotos(actividad.id, files)
                            .then((uploaded) => {
                              setFotos((prev) => [...prev, ...uploaded]);
                              success('Foto guardada');
                            })
                            .catch((err) => {
                              const msg =
                                err instanceof Error ? err.message : 'No se pudo subir la foto';
                              setErrorMsg(msg);
                              toastError('Foto no subida', msg);
                            })
                            .finally(() => setSaving(false));
                          return;
                        }
                        setPendingFiles((prev) => [...prev, ...files]);
                      }}
                      className="mt-1 block w-full text-sm text-default-700
                        file:mr-3 file:py-1.5 file:px-3
                        file:rounded-md file:border-0
                        file:text-sm file:font-medium
                        file:bg-[#E8F1FB] file:text-[#003B7A]
                        hover:file:bg-[#d6e7f8]
                        cursor-pointer"
                    />
                    <span className="text-xs text-default-500 mt-1 block">
                      {pendingFiles.length > 0
                        ? `${pendingFiles.length} archivo(s) pendiente(s) — se subirán al guardar`
                        : isEdit
                          ? 'La foto se guarda al elegirla. JPG, PNG o WebP.'
                          : 'JPG, PNG o WebP. Se subirán al crear la actividad.'}
                    </span>
                  </label>

                  {pendingPreviews.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-default-600 mb-1.5">
                        Vista previa (se subirán al guardar):
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {pendingPreviews.map((p, i) => (
                          <div
                            key={i}
                            className="relative group rounded-md overflow-hidden border border-default-200 bg-[#f0f4fa] aspect-square"
                          >
                            <img
                              src={p.url}
                              alt={p.file.name}
                              loading="lazy"
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] px-1.5 py-1 truncate">
                              {p.file.name}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingFiles((prev) =>
                                  prev.filter((_, idx) => idx !== i)
                                )
                              }
                              className="absolute top-1 right-1 bg-danger text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                              aria-label={`Quitar ${p.file.name}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <FieldError className="bg-danger-50 text-danger p-2 rounded">
                  {errorMsg}
                </FieldError>
              )}
            </ModalBody>
            <ModalFooter>
              <ButtonGroup>
                <Button variant="secondary" onPress={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" onPress={handleSave} isPending={saving}>
                  {saving
                    ? pendingFiles.length > 0
                      ? 'Subiendo foto…'
                      : 'Guardando…'
                    : isEdit
                      ? 'Guardar cambios'
                      : 'Crear actividad'}
                </Button>
              </ButtonGroup>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
    <TipoManager open={tipoManagerOpen} onOpenChange={setTipoManagerOpen} />
    </>
  );
}

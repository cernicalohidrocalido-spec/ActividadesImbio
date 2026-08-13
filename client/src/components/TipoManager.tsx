import { useState } from 'react';
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
  Label,
  Input,
  Description,
  Button,
  ButtonGroup,
  Chip,
  ChipLabel,
  Separator,
} from '@heroui/react';
import { useTipos } from '../lib/tipos';
import { TIPO_COLORS, TIPO_COLOR_HEX } from '../lib/types';
import type { TipoColor, TipoConfig } from '../lib/types';
import { success, error as toastError } from '../lib/toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function TipoManager({ open, onOpenChange }: Props) {
  const { tipos, addTipo, removeTipo, editTipo, refresh } = useTipos();
  const [nuevoLabel, setNuevoLabel] = useState('');
  const [nuevoColor, setNuevoColor] = useState<TipoColor>('neutral');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado de edición
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState<TipoColor>('neutral');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function reset() {
    setNuevoLabel('');
    setNuevoColor('neutral');
    setErrorMsg(null);
  }

  function startEdit(t: TipoConfig) {
    setEditingId(t.id);
    setEditLabel(t.label);
    setEditColor(t.color);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLabel('');
    setEditColor('neutral');
    setEditError(null);
  }

  async function handleAdd() {
    setErrorMsg(null);
    const label = nuevoLabel.trim();
    if (!label) return setErrorMsg('Escribe un nombre para el tipo');
    if (tipos.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      return setErrorMsg('Ya existe un tipo con ese nombre');
    }
    setSaving(true);
    try {
      await addTipo({ label, color: nuevoColor });
      success('Tipo creado', `"${label}" agregado correctamente`);
      reset();
    } catch (e) {
      toastError('Error al crear tipo', e instanceof Error ? e.message : '');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(t: TipoConfig) {
    setEditError(null);
    const label = editLabel.trim();
    if (!label) return setEditError('El nombre es obligatorio');
    if (
      tipos.some(
        (x) => x.id !== t.id && x.label.toLowerCase() === label.toLowerCase()
      )
    ) {
      return setEditError('Ya existe otro tipo con ese nombre');
    }
    setSavingEdit(true);
    try {
      await editTipo(t.id, { label, color: editColor });
      success('Tipo actualizado', `"${label}" guardado correctamente`);
      cancelEdit();
    } catch (e) {
      toastError('Error al actualizar', e instanceof Error ? e.message : '');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleActivo(t: TipoConfig) {
    try {
      await editTipo(t.id, { activo: !t.activo });
    } catch (e) {
      toastError('Error al actualizar', e instanceof Error ? e.message : '');
    }
  }

  async function handleDelete(t: TipoConfig) {
    if (!confirm(`¿Desactivar "${t.label}"?\nSe conserva en actividades históricas.`)) return;
    try {
      await removeTipo(t.id);
      success('Tipo desactivado');
    } catch (e) {
      toastError('Error al desactivar', e instanceof Error ? e.message : '');
    }
  }

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <ModalBackdrop isDismissable={true} variant="blur" className="z-[9999]">
        <ModalContainer size="lg" placement="center" className="z-[10000]">
          <ModalDialog>
            <ModalHeader>
              <ModalHeading>Tipos de intervención</ModalHeading>
            </ModalHeader>
            <ModalBody className="space-y-4 py-2">
              <Description>
                Crea, edita o desactiva tipos. Los tipos desactivados se conservan en
                actividades pasadas pero no aparecen al crear nuevas.
              </Description>

              {/* ===== Lista actual ===== */}
              <div>
                <p className="text-sm font-medium mb-2">Actuales ({tipos.length})</p>
                {tipos.length === 0 ? (
                  <p className="text-xs text-default-500">No hay tipos todavía.</p>
                ) : (
                  <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                    {tipos.map((t) => {
                      const isEditing = editingId === t.id;
                      return (
                        <li
                          key={t.id}
                          className="p-2 rounded-md border border-default-200 bg-content1"
                        >
                          {isEditing ? (
                            // ===== Modo edición =====
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-default-200"
                                  style={{ backgroundColor: TIPO_COLOR_HEX[editColor] }}
                                />
                                <Input
                                  value={editLabel}
                                  onChange={(v) =>
                                    setEditLabel(
                                      typeof v === 'string'
                                        ? v
                                        : (v as { target: { value: string } }).target?.value ?? ''
                                    )
                                  }
                                  aria-label="Nombre del tipo"
                                />
                              </div>
                              <div>
                                <p className="text-xs text-default-500 mb-1.5">Color</p>
                                <div className="flex flex-wrap gap-2">
                                  {TIPO_COLORS.map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setEditColor(c)}
                                      title={c}
                                      aria-label={`Color ${c}`}
                                      className={`w-6 h-6 rounded-full transition border-2 ${
                                        editColor === c
                                          ? 'border-foreground scale-110'
                                          : 'border-transparent hover:scale-105'
                                      }`}
                                      style={{ backgroundColor: TIPO_COLOR_HEX[c] }}
                                    />
                                  ))}
                                </div>
                              </div>
                              {editError && (
                                <p className="text-xs text-danger bg-danger-50 p-2 rounded">
                                  {editError}
                                </p>
                              )}
                              <div className="flex items-center gap-2 justify-end pt-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onPress={cancelEdit}
                                  isDisabled={savingEdit}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onPress={() => handleSaveEdit(t)}
                                  isPending={savingEdit}
                                >
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // ===== Modo display =====
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: TIPO_COLOR_HEX[t.color] }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{t.label}</p>
                                <p className="text-[10px] text-default-400 font-mono">
                                  {t.key}
                                </p>
                              </div>
                              <Chip
                                size="sm"
                                variant="soft"
                                color={t.activo ? 'success' : 'default'}
                              >
                                <ChipLabel>{t.activo ? 'Activo' : 'Inactivo'}</ChipLabel>
                              </Chip>
                              <Button
                                size="sm"
                                variant="ghost"
                                onPress={() => startEdit(t)}
                                aria-label="Editar"
                                isDisabled={editingId !== null}
                              >
                                ✏️
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onPress={() => handleToggleActivo(t)}
                                aria-label={t.activo ? 'Desactivar' : 'Activar'}
                                isDisabled={editingId !== null}
                              >
                                {t.activo ? '⏸' : '▶'}
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onPress={() => handleDelete(t)}
                                aria-label="Eliminar"
                                isDisabled={editingId !== null}
                              >
                                🗑
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <Separator />

              {/* ===== Crear nuevo ===== */}
              <div>
                <p className="text-sm font-medium mb-2">Agregar nuevo tipo</p>
                <div className="space-y-3">
                  <TextField
                    value={nuevoLabel}
                    onChange={(v) =>
                      setNuevoLabel(
                        typeof v === 'string' ? v : (v as { target: { value: string } }).target?.value ?? ''
                      )
                    }
                    isRequired
                    fullWidth
                  >
                    <Label>Nombre</Label>
                    <Input placeholder="Ej. Limpieza de canales" />
                    <Description>
                      El identificador (key) se genera automáticamente.
                    </Description>
                  </TextField>

                  <div>
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2.5 mt-1.5">
                      {TIPO_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNuevoColor(c)}
                          title={c}
                          aria-label={`Color ${c}`}
                          className={`w-7 h-7 rounded-full transition border-2 ${
                            nuevoColor === c
                              ? 'border-foreground scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: TIPO_COLOR_HEX[c] }}
                        />
                      ))}
                    </div>
                  </div>

                  {errorMsg && (
                    <p className="text-sm text-danger bg-danger-50 p-2 rounded">
                      {errorMsg}
                    </p>
                  )}
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="flex justify-between">
              <Button variant="secondary" onPress={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <ButtonGroup>
                <Button variant="ghost" onPress={refresh}>
                  🔄 Recargar
                </Button>
                <Button variant="primary" onPress={handleAdd} isPending={saving}>
                  + Agregar
                </Button>
              </ButtonGroup>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}

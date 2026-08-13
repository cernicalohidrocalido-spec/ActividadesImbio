import { ToastQueue } from '@heroui/react';

export const toastQueue = new ToastQueue({
  maxVisibleToasts: 4,
});

export type ToastVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export function notify(input: {
  title: string;
  description?: string;
  variant?: ToastVariant;
}) {
  toastQueue.add({
    title: input.title,
    description: input.description,
    variant: input.variant ?? 'default',
  });
}

export const success = (title: string, description?: string) =>
  notify({ title, description, variant: 'success' });
export const error = (title: string, description?: string) =>
  notify({ title, description, variant: 'danger' });
export const warning = (title: string, description?: string) =>
  notify({ title, description, variant: 'warning' });

function cleanPath(pathname = window.location.pathname): string {
  return pathname.replace(/\/+$/, '') || '/';
}

/** Siempre panel público, aunque el personal esté logueado. */
export function isPublicPanelPath(pathname = window.location.pathname): boolean {
  const p = cleanPath(pathname);
  return p === '/consulta' || p === '/publico';
}

export function isLoginPath(pathname = window.location.pathname): boolean {
  return cleanPath(pathname) === '/login';
}

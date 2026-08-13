export function isPublicPanelPath(pathname = window.location.pathname): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return p === '/consulta' || p === '/publico';
}

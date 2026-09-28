// Registers the service worker, then reloads once so the page runs with the
// COOP/COEP headers (crossOriginIsolated) it adds.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => {
    if (window.crossOriginIsolated) {
      sessionStorage.removeItem('ssReloaded');
      return;
    }
    const reloadOnce = () => {
      if (sessionStorage.getItem('ssReloaded')) return; // avoid a reload loop if it fails
      sessionStorage.setItem('ssReloaded', '1');
      location.reload();
    };
    if (navigator.serviceWorker.controller) reloadOnce();
    else navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
  });
}

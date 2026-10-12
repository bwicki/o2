/* EDS O2-Planung — Laufzeitkonfiguration (kein Modul, wird vor der App geladen).
 * apiBase: Adresse des Cloudflare Workers, der die Berechnungen unter ihrem Kurzcode speichert.
 * Leer = lokaler Modus: Berechnungen liegen nur auf dem Gerät, der Link trägt den Stand selbst mit.
 * Die Adresse zeigt der Workflow «O2 worker» im Repository bwicki/briefing nach dem Deploy (siehe SETUP.md).
 */
window.O2_CONFIG = {
  apiBase: 'https://o2-api.balthasar.workers.dev',
};

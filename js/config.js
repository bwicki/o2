/* EDS O2-Planung — Laufzeitkonfiguration (kein Modul, wird vor der App geladen).
 * apiBase: Adresse des Cloudflare Workers, der die Berechnungen unter ihrem Kurzcode speichert.
 * Leer = lokaler Modus: Berechnungen liegen nur auf dem Gerät, der Link trägt den Stand selbst mit.
 * Der Workflow «Setup worker» trägt die Adresse nach dem Deployment hier ein (siehe SETUP.md).
 */
window.O2_CONFIG = {
  apiBase: '',
};

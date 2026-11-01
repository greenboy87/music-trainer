/* Theme-Umschaltung wie im School-Tool. Dunkel ist der Standard; die Wahl
   bleibt gespeichert. Wird im <head> geladen, damit die Seite gleich richtig
   gefärbt aufbaut. */
const Theme = {
  KEY: 'musiktrainer-theme',

  current() {
    try { return localStorage.getItem(this.KEY) === 'light' ? 'light' : 'dark'; }
    catch { return 'dark'; }
  },

  apply(mode) {
    if (mode === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
  },

  toggle() {
    const mode = this.current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(this.KEY, mode); } catch { /* privates Fenster */ }
    this.apply(mode);
    this.updateButton();
  },

  updateButton() {
    const btn = document.getElementById('btn-theme');
    if (!btn) return;
    const dark = this.current() === 'dark';
    btn.innerHTML = Icons.raw(dark ? 'sun' : 'moon') + (dark ? 'Hell' : 'Dunkel');
    btn.title = dark ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln';
  },
};

Theme.apply(Theme.current());

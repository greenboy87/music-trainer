/* Icon-Satz wie im School-Tool: schlanke Strich-Symbole (24×24), die die
   Textfarbe übernehmen.

   Verwendung im HTML:  <button data-icon="play">Start</button>
   Verwendung im JS:    el.innerHTML = Icons.raw('star') + 'Text';          */
const Icons = {
  set: {
    ear:       '<path d="M6 8.5a6 6 0 1 1 12 0c0 3-2 4.2-3 5.5-.9 1.2-.8 2.4-1.3 3.6A3.2 3.2 0 0 1 8 16.5"/><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.8c-.7.7-1.3 1.2-1.3 2.2"/>',
    music:     '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    play:      '<path d="M6 3.5 20 12 6 20.5z"/>',
    check:     '<path d="M20 6 9 17l-5-5"/>',
    x:         '<path d="M18 6 6 18M6 6l12 12"/>',
    timer:     '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/>',
    target:    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    volume:    '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5.5a10 10 0 0 1 0 13"/>',
    reset:     '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    back:      '<path d="m15 18-6-6 6-6"/>',
    next:      '<path d="m9 18 6-6-6-6"/>',
    star:      '<path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z"/>',
    trophy:    '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    piano:     '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M8 20v-6M12 20v-6M16 20v-6"/><path d="M6.5 4v10h3V4M14.5 4v10h3V4" fill="currentColor" stroke="none" opacity=".8"/>',
    drum:      '<ellipse cx="12" cy="8" rx="8" ry="3"/><path d="M4 8v8c0 1.7 3.6 3 8 3s8-1.3 8-3V8"/><path d="m4 3 6 5M20 3l-6 5"/>',
    wave:      '<path d="M2 12h2l2-6 3 12 3-15 3 15 3-12 2 6h2"/>',
    stairs:    '<path d="M3 20h5v-5h5v-5h5V5h3"/>',
    sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon:      '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    user:      '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    sparkles:  '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    pen:       '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    hand:      '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5"/><path d="M14 10.5V5.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L3.6 15.6a1.6 1.6 0 0 1 2.5-2L8 15.5"/>',
  },

  raw(name, extraClass = '') {
    const paths = this.set[name];
    if (!paths) return '';
    return `<svg class="icon ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  },

  /* Alle Elemente mit data-icon im Dokument bestücken */
  hydrate(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => {
      if (el.querySelector(':scope > svg.icon')) return;
      el.insertAdjacentHTML('afterbegin', this.raw(el.dataset.icon));
    });
  },
};

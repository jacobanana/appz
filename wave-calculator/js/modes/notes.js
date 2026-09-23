/* Note lengths — every note value at the current tempo, straight, dotted and
 * triplet, in milliseconds, samples or hertz. */
(function (WC) {
  'use strict';
  const { block, seg, table, row } = WC.ui;
  const f = WC.fmt;

  const ROWS = ['2bar', '1bar', '1/1', '1/2', '1/4', '1/8', '1/16', '1/32', '1/64', '1/128'];
  const UNITS = {
    ms: { label: 'ms', cell: (t, ms) => f.ms(ms) },
    samples: { label: 'Samples', cell: (t, ms) => f.samples(t.samples(ms)) },
    hz: { label: 'Hz', cell: (t, ms) => f.hz(t.hz(ms)) },
  };

  WC.modes.register({
    id: 'notes',
    title: 'Note lengths',
    prefs: { unit: 'ms' },
    clean: (p, d) => ({ unit: UNITS[p.unit] ? p.unit : d.unit }),

    mount(root, { prefs }) {
      const main = block('Note lengths');
      const unitSeg = seg({ label: 'Unit', value: prefs.get().unit, onChange: (v) => prefs.set({ unit: v }),
        options: Object.entries(UNITS).map(([v, u]) => ({ value: v, label: u.label })) });
      const tbl = table([{ label: 'Note', width: '25%' }, 'Straight', 'Dotted', 'Triplet']);
      main.append(unitSeg.el, tbl.el);
      root.append(main);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function render(t) {
        lastT = t;
        const u = UNITS[prefs.get().unit];
        tbl.rows(ROWS.map((id) => {
          const isBar = /bar$/.test(id);
          const cells = [WC.notes.label(id)];
          ['', 'd', 't'].forEach((feel) => {
            cells.push(isBar && feel ? '<span class="dim">—</span>' : u.cell(t, t.note(isBar ? id : id + feel)));
          });
          return row(cells, id === '1/4' ? 'hl' : '');
        }));
      }

      return { render };
    },
  });
})(window.WC);

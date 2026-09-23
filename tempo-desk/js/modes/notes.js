/* Note lengths — every note value at the current tempo, straight, dotted and
 * triplet, as milliseconds, samples or a rate in hertz (for LFOs and
 * tremolo). Plus where a swung off-beat lands. */
(function (TD) {
  'use strict';
  const { h, block, field, fields, seg, table, row, verdict, number, select } = TD.ui;
  const f = TD.fmt;

  const ROWS = ['2bar', '1bar', '1/1', '1/2', '1/4', '1/8', '1/16', '1/32', '1/64', '1/128'];
  const UNITS = {
    ms: { label: 'Milliseconds', cell: (t, ms) => f.ms(ms) },
    samples: { label: 'Samples', cell: (t, ms) => f.samples(t.samples(ms)) },
    hz: { label: 'Hertz', cell: (t, ms) => f.hz(t.hz(ms)) },
  };

  TD.modes.register({
    id: 'notes',
    title: 'Note lengths',
    summary: 'Every note value in ms, samples or Hz — straight, dotted and triplet.',
    prefs: { unit: 'ms', swingGrid: '1/16', swing: 58 },
    clean: (p, d) => ({
      unit: UNITS[p.unit] ? p.unit : d.unit,
      swingGrid: ['1/8', '1/16'].includes(p.swingGrid) ? p.swingGrid : d.swingGrid,
      swing: +p.swing >= 50 && +p.swing <= 90 ? +p.swing : d.swing,
    }),

    mount(root, { prefs }) {
      const p = () => prefs.get();
      const set = (k) => (v) => prefs.set({ [k]: v });

      const main = block('Note lengths at this tempo',
        'Hertz is one cycle per note — the rate to type into an LFO that isn’t tempo-synced.');
      const unitSeg = seg({ label: 'Show as', value: p().unit, onChange: set('unit'),
        options: Object.entries(UNITS).map(([v, u]) => ({ value: v, label: u.label })) });
      const tbl = table(['Note', 'Straight', 'Dotted', 'Triplet']);
      main.append(unitSeg.el, tbl.el);

      const swing = block('Swing', 'How late the swung note lands. 50% is straight; 66.7% is a full triplet shuffle.');
      const swingOut = verdict();
      swing.append(
        fields(
          field('Swing the', select({ options: [{ value: '1/8', label: '8th notes' }, { value: '1/16', label: '16th notes' }],
            value: p().swingGrid, onChange: set('swingGrid') })),
          field('Amount', number({ value: p().swing, min: 50, max: 90, step: 1, onChange: set('swing') }), '%')),
        swingOut);

      root.append(main, swing);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function render(t) {
        lastT = t;
        const s = p();
        const u = UNITS[s.unit];
        const unitSuffix = s.unit === 'ms' ? ' ms' : s.unit === 'hz' ? ' Hz' : '';
        tbl.rows(ROWS.map((id) => {
          const isBar = /bar$/.test(id);
          const cells = [TD.notes.label(id) + (id === '1/4' ? ' <span class="tag">beat</span>' : '')];
          ['', 'd', 't'].forEach((feel) => {
            if (isBar && feel) { cells.push('<span class="dim">—</span>'); return; }
            cells.push(u.cell(t, t.note(isBar ? id : id + feel)) + unitSuffix);
          });
          return row(cells, id === '1/4' ? 'hl' : '');
        }));

        const pair = t.note(s.swingGrid) * 2;
        const late = pair * (s.swing / 100 - 0.5);
        swingOut.innerHTML =
          'At ' + f.trim(s.swing, 1) + '% the off-beat ' + TD.notes.label(s.swingGrid) + ' lands <b>' + f.ms(late) + ' ms late</b> — ' +
          f.ms(pair * s.swing / 100) + ' ms after the on-beat instead of ' + f.ms(pair / 2) + ' ms ' +
          '(' + f.samples(t.samples(late)) + ' samples). The on-beat note is ' + f.ms(pair * s.swing / 100) +
          ' ms long, the off-beat ' + f.ms(pair * (1 - s.swing / 100)) + ' ms.';
      }

      return { render };
    },
  });
})(window.TD);

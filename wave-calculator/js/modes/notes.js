/* Note lengths — every note value at the current tempo in milliseconds,
 * samples and hertz, straight, dotted or triplet. */
(function (WC) {
  'use strict';
  const { block, seg, table, row, FEELS } = WC.ui;
  const f = WC.fmt;

  const ROWS = ['2bar', '1bar', '1/1', '1/2', '1/4', '1/8', '1/16', '1/32', '1/64', '1/128'];
  const dash = '<span class="dim">—</span>';

  WC.modes.register({
    id: 'notes',
    title: 'Note lengths',
    prefs: { feel: '' },
    clean: (p, d) => ({ feel: FEELS.some((o) => o.value === p.feel) ? p.feel : d.feel }),

    mount(root, { prefs }) {
      const main = block('Note lengths');
      const feelSeg = seg({ options: FEELS, value: prefs.get().feel, onChange: (v) => prefs.set({ feel: v }) });
      const tbl = table([{ label: 'Note', width: '32%' }, 'ms', 'Samples', 'Hz']);
      main.append(feelSeg.el, tbl.el);
      root.append(main);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function render(t) {
        lastT = t;
        const feel = prefs.get().feel;
        tbl.rows(ROWS.map((id) => {
          // Whole bars have no dotted or triplet form.
          if (/bar$/.test(id) && feel) return row([WC.notes.label(id), dash, dash, dash]);
          const ms = t.note(WC.notes.join(id, feel));
          return row([WC.notes.label(WC.notes.join(id, feel)), f.ms(ms), f.samples(t.samples(ms)), f.hz(t.hz(ms))],
            id === '1/4' ? 'hl' : '');
        }));
      }

      return { render };
    },
  });
})(window.WC);

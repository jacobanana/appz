/* Delay — the delay time for a note value. */
(function (WC) {
  'use strict';
  const { block, field, fields, noteValue, pairs } = WC.ui;
  const f = WC.fmt;

  const NOTE = { divisions: [1, 2, 4, 8, 16, 32, 64], bars: [1] };

  WC.modes.register({
    id: 'delay',
    title: 'Delay',
    prefs: { note: '1/8d' },
    clean: (p, d) => ({ note: WC.notes.allowed(p.note, NOTE) ? p.note : d.note }),

    mount(root, { prefs }) {
      const main = block('Delay time');
      main.append(fields(field('Note value',
        noteValue(Object.assign({ value: prefs.get().note, onChange: (v) => prefs.set({ note: v }) }, NOTE)).el)));
      const out = pairs();
      main.append(out.el);
      root.append(main);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function render(t) {
        lastT = t;
        const ms = t.note(prefs.get().note);
        out.set([['Delay', f.ms(ms) + ' ms', 'main'], ['Samples', f.samples(t.samples(ms))]]);
      }

      return { render };
    },
  });
})(window.WC);

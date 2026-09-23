/* Delay — the delay time for a note value. */
(function (WC) {
  'use strict';
  const { block, field, fields, noteValue, pairs } = WC.ui;
  const f = WC.fmt;

  const NOTE = { divisions: [1, 2, 4, 8, 16, 32, 64], bars: [1] };

  WC.modes.register({
    id: 'delay',
    title: 'Delay',
    tint: ['#8D7BFF', '#4430B5'],
    icon: '<g fill="#fff"><rect x="8" y="10" width="5" height="30" rx="2.5"/><rect x="17.5" y="18" width="5" height="22" rx="2.5" opacity=".8"/><rect x="27" y="25" width="5" height="15" rx="2.5" opacity=".6"/><rect x="36.5" y="31" width="5" height="9" rx="2.5" opacity=".4"/></g>',
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

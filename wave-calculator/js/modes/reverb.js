/* Reverb — pre-delay plus decay (RT60) that add up to a note value, so the
 * tail has faded by −60 dB when that note ends. */
(function (WC) {
  'use strict';
  const { block, field, fields, noteValue, pairs } = WC.ui;
  const f = WC.fmt;

  const LENGTH = { divisions: [1, 2, 4, 8, 16], bars: [4, 2, 1] };
  const PRE = { divisions: [16, 32, 64, 128, 256] };

  WC.modes.register({
    id: 'reverb',
    title: 'Reverb',
    prefs: { length: '1/2', pre: '1/64' },
    clean: (p, d) => ({
      length: WC.notes.allowed(p.length, LENGTH) ? p.length : d.length,
      pre: WC.notes.allowed(p.pre, PRE) ? p.pre : d.pre,
    }),

    mount(root, { prefs }) {
      const set = (k) => (v) => prefs.set({ [k]: v });
      const main = block('Reverb time');
      main.append(fields(
        field('Total length', noteValue(Object.assign({ value: prefs.get().length, onChange: set('length') }, LENGTH)).el),
        field('Pre-delay', noteValue(Object.assign({ value: prefs.get().pre, onChange: set('pre') }, PRE)).el)));
      const out = pairs();
      main.append(out.el);
      root.append(main);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function render(t) {
        lastT = t;
        const s = prefs.get();
        const total = t.note(s.length), pre = t.note(s.pre), decay = total - pre;
        out.set([
          ['Pre-delay', f.ms(pre) + ' ms', 'main'],
          ['Decay (RT60)', decay > 0 ? f.ms(decay) + ' ms' : '<span class="warn">Pre-delay ≥ total length</span>', 'main'],
          ['Total', f.ms(total) + ' ms'],
        ]);
      }

      return { render };
    },
  });
})(window.WC);

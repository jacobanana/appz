/* Tempo change — from the current tempo to a target, as time-stretch and as
 * varispeed pitch. Type the target tempo or the pitch shift; the other
 * follows. Swap makes the target the current tempo. */
(function (WC) {
  'use strict';
  const { h, block, field, number, bpm, conv, plain, pairs } = WC.ui;
  const f = WC.fmt;

  const signed = (x, dp) => (x > 0 ? '+' : x < 0 ? '−' : '') + f.num(Math.abs(x), dp);
  const validSemis = (x) => Number.isFinite(x) && Math.abs(x) <= 48;

  WC.modes.register({
    id: 'retempo',
    title: 'Tempo change',
    icon: '<path d="M9 34 A15 15 0 1 1 39 34"/><path d="M24 14 V17 M13.4 18.4 L15.5 20.5 M34.6 18.4 L32.5 20.5 M24 30 L32 21"/><circle cx="24" cy="30" r="2"/>',
    // `hold` is the side last typed in: it stays put when the current tempo moves.
    prefs: { target: 128, semis: 1, hold: 'target' },
    clean: (p, d) => ({
      target: WC.validBpm(+p.target) ? +p.target : d.target,
      semis: validSemis(+p.semis) ? +p.semis : d.semis,
      hold: p.hold === 'semis' ? 'semis' : 'target',
    }),

    mount(root, { prefs, tempo }) {
      let target = NaN, semis = NaN;

      const tgtIn = number({ value: () => plain(target, 3), valid: WC.validBpm,
        onChange: (v) => prefs.set({ target: v, hold: 'target' }) });
      const stIn = number({ value: () => plain(semis, 2), step: 1, valid: validSemis,
        onChange: (v) => prefs.set({ semis: v, hold: 'semis' }) });
      const swap = h('button', { type: 'button', class: 'conv-op swap', title: 'Swap: the target becomes the current tempo',
        'aria-label': 'Swap current and target tempo',
        onclick: () => {
          if (!WC.validBpm(target)) return;
          const was = tempo.get().bpm;
          tempo.set({ bpm: plain(target, 3) });
          prefs.set({ target: was, hold: 'target' });
        } }, '⇄');

      const main = block('Tempo change');
      const out = pairs();
      main.append(
        conv([field('Current', bpm(tempo), 'BPM')], swap,
          [field('Target', tgtIn, 'BPM'), field('Varispeed pitch', stIn, 'st')]),
        out.el);
      root.append(main);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function render(t) {
        lastT = t;
        const s = prefs.get();
        target = s.hold === 'semis' ? t.bpm * Math.pow(2, s.semis / 12) : s.target;
        const ratio = target / t.bpm;
        semis = s.hold === 'semis' ? s.semis : 12 * Math.log2(ratio);
        const ok = WC.validBpm(target);
        tgtIn.show(ok ? plain(target, 3) : NaN);
        stIn.show(plain(semis, 2));
        swap.disabled = !ok;
        out.set(ok ? [
          ['Time-stretch', f.num(100 / ratio, 2) + '%', 'main'],
          ['Length change', signed((1 / ratio - 1) * 100, 2) + '%'],
          ['Speed ratio', '×' + f.num(ratio, 4)],
        ] : [['Time-stretch', '<span class="warn">Target tempo out of range</span>', 'main']]);
      }

      return { render };
    },
  });
})(window.WC);

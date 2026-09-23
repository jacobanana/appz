/* Tempo change — stretch and varispeed pitch between two tempos, and the
 * tempo a varispeed pitch shift lands on. */
(function (WC) {
  'use strict';
  const { h, block, field, fields, number, pairs } = WC.ui;
  const f = WC.fmt;

  const signed = (x, dp) => (x > 0 ? '+' : x < 0 ? '−' : '') + f.num(Math.abs(x), dp);

  WC.modes.register({
    id: 'retempo',
    title: 'Tempo change',
    prefs: { target: 128, semis: 1 },
    clean: (p, d) => ({
      target: WC.validBpm(+p.target) ? +p.target : d.target,
      semis: Number.isFinite(+p.semis) && Math.abs(+p.semis) <= 48 ? +p.semis : d.semis,
    }),

    mount(root, { prefs, tempo }) {
      const p = () => prefs.get();

      const toBpm = block('Tempo to tempo');
      const toOut = pairs();
      const toUse = h('div', { class: 'actions' });
      toBpm.append(fields(field('Target tempo', number({ value: p().target, min: WC.BPM_MIN, max: WC.BPM_MAX, onChange: (v) => prefs.set({ target: v }) }), 'BPM')),
        toOut.el, toUse);

      const pitch = block('Pitch to tempo (varispeed)');
      const pitchOut = pairs();
      const pitchUse = h('div', { class: 'actions' });
      pitch.append(fields(field('Pitch shift', number({ value: p().semis, min: -48, max: 48, step: 1, onChange: (v) => prefs.set({ semis: v }) }), 'semitones')),
        pitchOut.el, pitchUse);

      root.append(toBpm, pitch);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      const useBtn = (bpm) => {
        const b = Math.round(bpm * 1000) / 1000;
        return h('button', { type: 'button', class: 'btn', onclick: () => tempo.set({ bpm: b }) }, 'Set ' + f.bpm(b) + ' BPM');
      };

      function render(t) {
        lastT = t;
        const s = p();

        const ratio = s.target / t.bpm;
        toOut.set([
          ['Time-stretch', f.num(100 / ratio, 2) + '%', 'main'],
          ['Length change', signed((1 / ratio - 1) * 100, 2) + '%'],
          ['Speed ratio', '×' + f.num(ratio, 4)],
          ['Varispeed pitch', signed(12 * Math.log2(ratio), 2) + ' st'],
        ]);
        toUse.replaceChildren(...(Math.abs(ratio - 1) > 1e-9 ? [useBtn(s.target)] : []));

        const r = Math.pow(2, s.semis / 12);
        const bpm = t.bpm * r;
        pitchOut.set([
          ['Tempo', WC.validBpm(bpm) ? f.num(bpm, 2) + ' BPM' : '–', 'main'],
          ['Speed ratio', '×' + f.num(r, 4)],
          ['Length change', signed((1 / r - 1) * 100, 2) + '%'],
        ]);
        pitchUse.replaceChildren(...(WC.validBpm(bpm) && s.semis !== 0 ? [useBtn(bpm)] : []));
      }

      return { render };
    },
  });
})(window.WC);

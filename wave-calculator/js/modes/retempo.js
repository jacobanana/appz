/* Retempo — move material from the current tempo to another: how much it
 * stretches if you keep the pitch, how far the pitch moves if you just speed
 * the tape up (varispeed), and the tempo a pitch shift lands you on. */
(function (WC) {
  'use strict';
  const { h, block, field, fields, number, answer, verdict } = WC.ui;
  const f = WC.fmt;

  const signed = (x, dp) => (x > 0 ? '+' : x < 0 ? '−' : '±') + f.num(Math.abs(x), dp);

  WC.modes.register({
    id: 'retempo',
    title: 'Change tempo',
    summary: 'Stretch, varispeed pitch and new tempo when moving between BPMs.',
    prefs: { target: 128, semis: 1 },
    clean: (p, d) => ({
      target: WC.validBpm(+p.target) ? +p.target : d.target,
      semis: Number.isFinite(+p.semis) && Math.abs(+p.semis) <= 48 ? +p.semis : d.semis,
    }),

    mount(root, { prefs, tempo }) {
      const p = () => prefs.get();

      const to = block('From this tempo to another', 'The tempo bar is where you start; type where you are going.');
      const toAns = answer();
      const toNote = verdict();
      to.append(fields(field('New tempo', number({ value: p().target, min: WC.BPM_MIN, max: WC.BPM_MAX, onChange: (v) => prefs.set({ target: v }) }), 'BPM')),
        toAns.el, toNote);

      const pitch = block('Pitch it instead', 'Varispeed: shift the pitch and the tempo follows, like speeding up a tape.');
      const pitchAns = answer();
      const pitchNote = verdict();
      pitch.append(fields(field('Shift by', number({ value: p().semis, min: -48, max: 48, step: 1, onChange: (v) => prefs.set({ semis: v }) }), 'semitones')),
        pitchAns.el, pitchNote);

      root.append(to, pitch);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function useBtn(bpm) {
        const b = Math.round(bpm * 1000) / 1000;
        return h('button', { type: 'button', class: 'btn', onclick: () => tempo.set({ bpm: b }) }, 'Use ' + f.bpm(b) + ' BPM');
      }

      function render(t) {
        lastT = t;
        const s = p();

        const ratio = s.target / t.bpm;           // speed factor
        const semis = 12 * Math.log2(ratio);
        toAns.set([
          { label: 'Length', value: signed((1 / ratio - 1) * 100, 2), unit: '%' },
          { label: 'Varispeed pitch', value: signed(semis, 2), unit: 'st' },
        ],
        'Speed ×<b>' + f.num(ratio, 4) + '</b>: a bar goes from ' + f.ms(t.barMs) + ' to <b>' + f.ms(t.barMs / ratio) + ' ms</b>. ' +
        'Keep the pitch and stretch to <b>' + f.num(100 / ratio, 2) + '%</b> of the length; or speed it like tape and it moves ' +
        signed(semis * 100, 0) + ' cents.');
        toNote.replaceChildren(Math.abs(ratio - 1) > 1e-9 ? useBtn(s.target) : 'That is the tempo you are at.');

        const r = Math.pow(2, s.semis / 12);
        const bpm = t.bpm * r;
        pitchAns.set([{ label: 'New tempo', value: WC.validBpm(bpm) ? f.num(bpm, 2) : '–', unit: 'BPM' }],
          'Speed ×<b>' + f.num(r, 4) + '</b>; length ' + signed((1 / r - 1) * 100, 2) + '%.');
        pitchNote.replaceChildren(WC.validBpm(bpm) && s.semis !== 0 ? useBtn(bpm) : '');
      }

      return { render };
    },
  });
})(window.WC);

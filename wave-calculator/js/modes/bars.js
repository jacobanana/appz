/* Bars & time — bars to seconds, seconds to bars, and the tempo that makes a
 * number of bars last a given time. */
(function (WC) {
  'use strict';
  const { h, block, field, fields, number, pairs } = WC.ui;
  const f = WC.fmt;
  const nonNeg = (x) => Number.isFinite(x) && x >= 0;

  WC.modes.register({
    id: 'bars',
    title: 'Bars & time',
    prefs: { bars: 8, beats: 0, min: 0, sec: 30, fitBars: 16, fitMin: 0, fitSec: 30 },
    clean: (p, d) => {
      const out = {};
      Object.keys(d).forEach((k) => { out[k] = nonNeg(+p[k]) ? +p[k] : d[k]; });
      return out;
    },

    mount(root, { prefs, tempo }) {
      const p = () => prefs.get();
      const num = (k, step) => number({ value: p()[k], min: 0, step, valid: nonNeg, onChange: (v) => prefs.set({ [k]: v }) });

      const toTime = block('Bars to seconds');
      const toTimeOut = pairs();
      toTime.append(fields(field('Bars', num('bars', 1)), field('Beats', num('beats', 1))), toTimeOut.el);

      const toBars = block('Seconds to bars');
      const toBarsOut = pairs();
      toBars.append(fields(field('Minutes', num('min', 1)), field('Seconds', num('sec', 0.1))), toBarsOut.el);

      const fit = block('Length to tempo');
      const fitOut = pairs();
      const use = h('div', { class: 'actions' });
      fit.append(fields(field('Bars', num('fitBars', 1)), field('Minutes', num('fitMin', 1)), field('Seconds', num('fitSec', 0.1))),
        fitOut.el, use);

      root.append(toTime, toBars, fit);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function render(t) {
        lastT = t;
        const s = p();

        const ms = s.bars * t.barMs + s.beats * t.beatMs;
        toTimeOut.set([
          ['Seconds', f.num(ms / 1000, 3) + ' s', 'main'],
          ['Minutes', f.clock(ms)],
          ['Samples', f.samples(t.samples(ms))],
        ]);

        const dur = (s.min * 60 + s.sec) * 1000;
        const exact = dur / t.barMs;
        const whole = Math.floor(exact + 1e-9);
        const beats = (dur - whole * t.barMs) / t.beatMs;
        const wholeBeats = Math.floor(beats + 1e-9);
        toBarsOut.set([
          ['Bars', f.num(exact, 3), 'main'],
          ['Bars + beats', whole + ' bars ' + wholeBeats + ' beats'],
          ['Remainder', f.ms((beats - wholeBeats) * t.beatMs) + ' ms'],
        ]);

        const fitDur = (s.fitMin * 60 + s.fitSec) * 1000;
        const bpm = s.fitBars > 0 && fitDur > 0 ? (60000 * s.fitBars * t.barQuarters) / fitDur : NaN;
        use.replaceChildren();
        if (!WC.validBpm(bpm)) {
          fitOut.set([['Tempo', '–', 'main'], ['Rounded', '–'], ['Length when rounded', '–']]);
          return;
        }
        const round = Math.round(bpm);
        const roundDur = (60000 * s.fitBars * t.barQuarters) / round;
        fitOut.set([
          ['Tempo', f.trim(bpm, 3) + ' BPM', 'main'],
          ['Rounded', round + ' BPM'],
          ['Length when rounded', f.clock(roundDur)],
        ]);
        const exactBpm = Math.round(bpm * 1000) / 1000;
        [exactBpm, round].filter((b, i, a) => a.indexOf(b) === i && b !== t.bpm).forEach((b) =>
          use.append(h('button', { type: 'button', class: 'btn', onclick: () => tempo.set({ bpm: b }) }, 'Set ' + f.bpm(b) + ' BPM')));
      }

      return { render };
    },
  });
})(window.WC);

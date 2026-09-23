/* Bars & time — how long a passage is, how many bars fit a duration, and the
 * tempo that makes N bars last exactly as long as you need. */
(function (WC) {
  'use strict';
  const { h, block, field, fields, number, answer, verdict } = WC.ui;
  const f = WC.fmt;
  const nonNeg = (x) => Number.isFinite(x) && x >= 0;

  WC.modes.register({
    id: 'bars',
    title: 'Bars & time',
    summary: 'Bars to minutes and back, and the tempo that fits a length.',
    prefs: { bars: 8, beats: 0, min: 0, sec: 30, fitBars: 16, fitMin: 0, fitSec: 30 },
    clean: (p, d) => {
      const out = {};
      Object.keys(d).forEach((k) => { out[k] = nonNeg(+p[k]) ? +p[k] : d[k]; });
      return out;
    },

    mount(root, { prefs, tempo }) {
      const p = () => prefs.get();
      const num = (k, opts) => number(Object.assign({ value: p()[k], min: 0, valid: nonNeg, onChange: (v) => prefs.set({ [k]: v }) }, opts));

      const long = block('How long is it?');
      const longAns = answer();
      long.append(fields(field('Bars', num('bars', { step: 1 })), field('Beats', num('beats', { step: 1 }))), longAns.el);

      const many = block('How many bars is it?');
      const manyAns = answer();
      many.append(fields(field('Minutes', num('min', { step: 1 })), field('Seconds', num('sec', { step: 0.1 }))), manyAns.el);

      const fit = block('What tempo fits?', 'The tempo that makes a number of bars last exactly this long.');
      const fitAns = answer();
      const fitNote = verdict();
      fit.append(
        fields(field('Bars', num('fitBars', { step: 1 })), field('Minutes', num('fitMin', { step: 1 })), field('Seconds', num('fitSec', { step: 0.1 }))),
        fitAns.el, fitNote);

      root.append(long, many, fit);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function render(t) {
        lastT = t;
        const s = p();
        const sig = t.sigNum + '/' + t.sigDen;

        const ms = s.bars * t.barMs + s.beats * t.beatMs;
        longAns.set([{ value: f.clock(ms), unit: '' }],
          '<b>' + f.num(ms / 1000, 3) + '</b> s · <b>' + f.samples(t.samples(ms)) + '</b> samples<br>' +
          f.trim(s.bars, 2) + ' bars of ' + sig + (s.beats ? ' and ' + f.trim(s.beats, 2) + ' beats' : '') + ' at ' + f.bpm(t.bpm) + ' BPM');

        const dur = (s.min * 60 + s.sec) * 1000;
        const barsExact = dur / t.barMs;
        const whole = Math.floor(barsExact + 1e-9);
        const restMs = dur - whole * t.barMs;
        const beats = restMs / t.beatMs;
        const wholeBeats = Math.floor(beats + 1e-9);
        manyAns.set([{ value: f.num(barsExact, 2), unit: 'bars' }],
          '<b>' + whole + '</b> bars, <b>' + wholeBeats + '</b> beats' +
          (beats - wholeBeats > 1e-6 ? ' and <b>' + f.ms((beats - wholeBeats) * t.beatMs) + '</b> ms' : '') +
          '<br>' + f.num(dur / t.quarterMs, 2) + ' quarter notes in ' + sig);

        const fitDur = (s.fitMin * 60 + s.fitSec) * 1000;
        const bpm = s.fitBars > 0 && fitDur > 0 ? (60000 * s.fitBars * t.barQuarters) / fitDur : NaN;
        fitNote.replaceChildren();
        if (!WC.validBpm(bpm)) {
          fitAns.set([{ value: '–', unit: 'BPM' }], 'Enter a number of bars and a length that gives a tempo between ' + WC.BPM_MIN + ' and ' + WC.BPM_MAX + '.');
          return;
        }
        const round = Math.round(bpm);
        const roundDur = (60000 * s.fitBars * t.barQuarters) / round;
        fitAns.set([{ value: f.trim(bpm, 3), unit: 'BPM' }],
          'Rounded to <b>' + round + ' BPM</b> it lasts ' + f.clock(roundDur) + ' (' + (roundDur >= fitDur ? '+' : '−') +
          f.ms(Math.abs(roundDur - fitDur)) + ' ms).');
        if (Math.abs(bpm - t.bpm) > 1e-6) {
          const exact = Math.round(bpm * 1000) / 1000;
          const use = (b) => h('button', { type: 'button', class: 'btn', onclick: () => tempo.set({ bpm: b }) }, 'Use ' + f.bpm(b) + ' BPM');
          fitNote.append(use(exact));
          if (round !== exact) fitNote.append(' ', use(round));
        } else fitNote.textContent = 'That is the tempo you are at.';
      }

      return { render };
    },
  });
})(window.WC);

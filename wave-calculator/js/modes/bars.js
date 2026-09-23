/* Bars & time — bars to time and back (type on either side), and the tempo
 * that makes a number of bars last a given time. */
(function (WC) {
  'use strict';
  const { field, number, conv, views, clock, plain, pairs } = WC.ui;
  const f = WC.fmt;
  const nonNeg = (x) => Number.isFinite(x) && x >= 0;
  const VIEWS = ['convert', 'fit'];

  WC.modes.register({
    id: 'bars',
    title: 'Bars & time',
    tint: ['#A6D855', '#378A36'],
    icon: '<path d="M13 40 L19.5 8 H28.5 L35 40 Z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M15 32 H33" stroke="#fff" stroke-width="3"/><path d="M24 32 L35 11" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="31" cy="18.6" r="3.3" fill="#fff"/>',
    // `from` is the side last typed in: it stays put when the tempo changes.
    prefs: { view: 'convert', from: 'bars', bars: 8, beats: 0, min: 0, sec: 16, fitBars: 16, fitMin: 0, fitSec: 30 },
    clean: (p, d) => {
      const out = {};
      Object.keys(d).forEach((k) => { if (typeof d[k] === 'number') out[k] = nonNeg(+p[k]) ? +p[k] : d[k]; });
      out.view = VIEWS.includes(p.view) ? p.view : d.view;
      out.from = p.from === 'time' ? 'time' : 'bars';
      return out;
    },

    mount(root, { prefs, tempo }) {
      const p = () => prefs.get();
      const shown = {};
      const num = (k, step, from) => number({ value: () => shown[k] ?? p()[k], min: 0, step, valid: nonNeg,
        onChange: (v) => prefs.set(Object.assign({ [k]: v }, from && { from })) });

      const box = { bars: num('bars', 1, 'bars'), beats: num('beats', 1, 'bars'), min: num('min', 1, 'time'), sec: num('sec', 0.1, 'time') };
      const convOut = pairs();
      const convert = [
        conv([field('Bars', box.bars), field('Beats', box.beats)], '=',
          [field('Time', clock(box.min, box.sec), 'm:s')]),
        convOut.el,
      ];

      // Set-tempo buttons sit in the results, next to the tempo they set.
      const fitOut = pairs();
      fitOut.el.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-bpm]');
        if (b) tempo.set({ bpm: +b.dataset.bpm });
      });
      const fit = [
        conv([field('Bars', num('fitBars', 1))], '=', [field('Length', clock(num('fitMin', 1), num('fitSec', 0.1)), 'm:s')]),
        fitOut.el,
      ];

      root.append(views(prefs, [
        { value: 'convert', label: 'Bars ⇄ time', content: convert },
        { value: 'fit', label: 'Length → tempo', content: fit },
      ]));

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function render(t) {
        lastT = t;
        const s = p();

        let ms;
        if (s.from === 'bars') {
          ms = s.bars * t.barMs + s.beats * t.beatMs;
          let min = Math.floor(ms / 60000 + 1e-9), sec = plain((ms - min * 60000) / 1000, 3);
          if (sec >= 60) { min += 1; sec = 0; }
          Object.assign(shown, { bars: s.bars, beats: s.beats, min, sec });
        } else {
          ms = (s.min * 60 + s.sec) * 1000;
          let bars = Math.floor(ms / t.barMs + 1e-9), beats = plain((ms - bars * t.barMs) / t.beatMs, 3);
          if (beats >= t.sigNum) { bars += 1; beats = 0; }
          Object.assign(shown, { bars, beats, min: s.min, sec: s.sec });
        }
        Object.keys(box).forEach((k) => box[k].show(shown[k]));
        convOut.set([
          ['Bars', f.num(ms / t.barMs, 3), 'main'],
          ['Seconds', f.num(ms / 1000, 3)],
          ['Samples', f.samples(t.samples(ms))],
        ]);

        const fitDur = (s.fitMin * 60 + s.fitSec) * 1000;
        const bpm = s.fitBars > 0 && fitDur > 0 ? (60000 * s.fitBars * t.barQuarters) / fitDur : NaN;
        if (!WC.validBpm(bpm)) {
          fitOut.set([['Tempo', '–', 'main'], ['Rounded', '–'], ['Length when rounded', '–']]);
          return;
        }
        const round = Math.round(bpm);
        const roundDur = (60000 * s.fitBars * t.barQuarters) / round;
        const setBtn = (b) => (b === t.bpm ? '' :
          ' <button type="button" class="btn btn-set" data-bpm="' + b + '" aria-label="Set tempo to ' + f.bpm(b) + ' BPM">Set</button>');
        fitOut.set([
          ['Tempo', f.trim(bpm, 3) + ' BPM' + setBtn(plain(bpm, 3)), 'main'],
          ['Rounded', round + ' BPM' + (round === plain(bpm, 3) ? '' : setBtn(round))],
          ['Length when rounded', f.clock(roundDur)],
        ]);
      }

      return { render };
    },
  });
})(window.WC);

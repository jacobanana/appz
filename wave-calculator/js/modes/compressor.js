/* Compressor — attack and release as time constants from note values.
 *
 * Values are time constants (τ), the convention most DAW compressors use for
 * their attack and release knobs: the envelope covers 63% of the change in τ.
 * The plot runs that envelope over a train of hits to steady state.
 */
(function (WC) {
  'use strict';
  const { h, block, field, fields, noteValue, table, row, pairs } = WC.ui;
  const f = WC.fmt;

  // Each hit holds the detector over threshold for this share of the gap.
  const HIT_SHARE = 0.25;

  const HITS = { divisions: [1, 2, 4, 8, 16, 32], bars: [1] };
  const ATTACK = { divisions: [16, 32, 64, 128, 256] };
  const RELEASE = { divisions: [1, 2, 4, 8, 16, 32, 64], bars: [2, 1] };

  WC.modes.register({
    id: 'compressor',
    title: 'Compressor',
    icon: '<path d="M8 40 L24 24 L40 17"/><path d="M24 24 L40 8" stroke-dasharray="2 3"/>',
    prefs: { hits: '1/4', attack: '1/128', release: '1/8' },
    clean: (p, d) => ({
      hits: WC.notes.allowed(p.hits, HITS) ? p.hits : d.hits,
      attack: WC.notes.allowed(p.attack, ATTACK) ? p.attack : d.attack,
      release: WC.notes.allowed(p.release, RELEASE) ? p.release : d.release,
    }),

    mount(root, { prefs }) {
      const p = () => prefs.get();
      const set = (k) => (v) => prefs.set({ [k]: v });

      const main = block('Attack and release');
      main.append(fields(
        field('Attack', noteValue(Object.assign({ value: p().attack, onChange: set('attack') }, ATTACK)).el),
        field('Release', noteValue(Object.assign({ value: p().release, onChange: set('release') }, RELEASE)).el)));

      const times = table([{ label: '', width: '25%' }, 'Note', 'τ ms', 'Samples']);

      // The hit interval only drives the plot, so it lives on the plot.
      const hits = noteValue(Object.assign({ value: p().hits, onChange: set('hits') }, HITS));
      const hitSel = hits.el.querySelector('select');
      hitSel.id = WC.ui.nextId('hits');
      const gapOut = h('span', { class: 'plot-gap' });
      const plot = h('div', { class: 'plot', role: 'img' });
      const stats = pairs();
      main.append(times.el,
        h('p', { class: 'note' }, 'τ: time to 63% of the gain change (the usual DAW convention).'),
        h('div', { class: 'plot-head' }, h('label', { for: hitSel.id }, 'Hits'), hits.el, gapOut),
        plot,
        h('p', { class: 'caption' },
          h('span', { class: 'key key-hit' }), 'hit (¼ of the interval)',
          h('span', { class: 'key key-gr' }), 'gain reduction'),
        stats.el);

      root.append(main);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));
      window.addEventListener('resize', () => lastT && root.offsetParent && drawPlot(lastT));

      function calc(t) {
        const s = p();
        const gap = t.note(s.hits);
        const body = gap * HIT_SHARE;
        const tauA = t.note(s.attack), tauR = t.note(s.release);
        return {
          s, gap, body, tauA, tauR,
          recovered: 1 - Math.exp(-(gap - body) / tauR),
          grabbed: 1 - Math.exp(-body / tauA),
        };
      }

      function render(t) {
        lastT = t;
        const c = calc(t);
        times.rows([
          row(['Attack', WC.notes.label(c.s.attack), f.ms(c.tauA), f.samples(t.samples(c.tauA))]),
          row(['Release', WC.notes.label(c.s.release), f.ms(c.tauR), f.samples(t.samples(c.tauR))]),
        ]);
        gapOut.textContent = f.ms(c.gap) + ' ms';
        stats.set([
          ['Reduction reached during a hit', f.pct(c.grabbed)],
          ['Gain recovered before the next hit', f.pct(c.recovered)],
        ]);
        drawPlot(t);
      }

      /* Gain reduction over a bar (or two intervals, if the hits are sparse),
       * simulated to steady state and drawn hanging from the top like a meter. */
      function drawPlot(t) {
        const c = calc(t);
        const W = Math.max(280, plot.clientWidth || 600), H = W < 500 ? 110 : 150;
        const L = 1, R = 1, T = 4, B = 20, PH = H - T - B, PW = W - L - R;
        const span = c.gap * 2 <= t.barMs ? t.barMs : c.gap * 2;
        const x = (ms) => L + (ms / span) * PW;
        const y = (e) => T + e * PH;

        const steps = Math.min(4000, Math.ceil(PW * 2));
        const dt = span / steps;
        const warm = Math.ceil((6 * c.gap) / dt) * dt;
        const aA = 1 - Math.exp(-dt / c.tauA), aR = 1 - Math.exp(-dt / c.tauR);
        let e = 0;
        const pts = [];
        for (let i = 0, n = Math.round((warm + span) / dt); i <= n; i++) {
          const time = i * dt - warm;
          const target = ((time % c.gap) + c.gap) % c.gap < c.body ? 1 : 0;
          e += (target - e) * (target > e ? aA : aR);
          if (time >= 0) pts.push([x(time), y(e)]);
        }

        let hits = '';
        for (let at = 0; at < span - 1e-6; at += c.gap) {
          hits += '<rect class="p-hit" x="' + x(at) + '" y="' + T + '" width="' + (x(at + c.body) - x(at)) + '" height="' + PH + '"/>';
        }
        let grid = '';
        for (let q = 0, i = 0; q <= t.quarters(span) + 1e-6; q += t.barQuarters / t.sigNum, i++) {
          const xx = x(t.ms(q));
          grid += '<line class="' + (i % t.sigNum === 0 ? 'p-bar' : 'p-beat') + '" x1="' + xx + '" x2="' + xx + '" y1="' + T + '" y2="' + (T + PH) + '"/>';
          if (xx < W - 20) grid += '<text class="p-lbl" x="' + (xx + 3) + '" y="' + (H - 5) + '">' +
            (Math.floor(i / t.sigNum) + 1) + '.' + ((i % t.sigNum) + 1) + '</text>';
        }
        const line = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
        plot.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + grid +
          '<path class="p-area" d="' + line + 'L' + x(span) + ' ' + T + 'L' + L + ' ' + T + 'Z"/>' + hits +
          '<path class="p-line" d="' + line + '"/></svg>';
        plot.setAttribute('aria-label', 'Gain reduction with a hit every ' + WC.notes.label(c.s.hits) +
          '; ' + f.pct(c.recovered) + ' recovered before each new hit.');
      }

      return { render };
    },
  });
})(window.WC);

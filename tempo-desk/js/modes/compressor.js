/* Compressor — attack and release as time constants that fit the beat.
 *
 * A compressor's envelope is a one-pole filter: after a step it covers 63% of
 * the way in one time constant τ, 95% in 3τ, 99% in about 5τ. So "be back by
 * the next 8th" means τ = (length of an 8th) ÷ (how many τ "back" takes), and
 * the number to dial is τ times whatever the knob itself is calibrated to.
 */
(function (TD) {
  'use strict';
  const { h, block, field, fields, noteSelect, seg, answer, table, row, verdict, number } = TD.ui;
  const f = TD.fmt;

  // How many τ count as "settled".
  const SETTLE = {
    1: { label: '63% · 1τ', pct: 1 - Math.exp(-1) },
    3: { label: '95% · 3τ', pct: 1 - Math.exp(-3) },
    5: { label: '99% · 5τ', pct: 1 - Math.exp(-5) },
  };
  // What the knob's number means, as a multiple of τ.
  const KNOB = {
    tau: { label: 'τ (63%)', k: 1, title: 'The number on the knob is the time constant — most plugins and analog designs' },
    t90: { label: 'Time to 90%', k: Math.LN10 },
    t99: { label: 'Time to 99%', k: 2 * Math.LN10 },
  };
  // Each hit holds the detector over threshold for this share of the gap.
  const HIT_SHARE = 0.25;

  const HIT_IDS = TD.notes.list({ longest: 1, shortest: 32, bars: [1] });
  const ATTACK_IDS = TD.notes.list({ longest: 16, shortest: 256 });
  const RELEASE_IDS = TD.notes.list({ longest: 1, shortest: 64, bars: [2, 1] });
  const TABLE_IDS = ['1/32', '1/16t', '1/16', '1/16d', '1/8t', '1/8', '1/8d', '1/4t', '1/4', '1/4d', '1/2', '1bar'];

  TD.modes.register({
    id: 'compressor',
    title: 'Compressor',
    summary: 'Attack and release that breathe with the beat.',
    prefs: { hits: '1/4', attack: '1/128', release: '1/8', settle: '3', knob: 'tau', check: 150 },
    clean: (p, d) => ({
      hits: HIT_IDS.includes(p.hits) ? p.hits : d.hits,
      attack: ATTACK_IDS.includes(p.attack) ? p.attack : d.attack,
      release: RELEASE_IDS.includes(p.release) ? p.release : d.release,
      settle: SETTLE[p.settle] ? String(p.settle) : d.settle,
      knob: KNOB[p.knob] ? String(p.knob) : d.knob,
      check: Number.isFinite(+p.check) && +p.check > 0 ? +p.check : d.check,
    }),

    mount(root, { prefs }) {
      const p = () => prefs.get();
      const set = (k) => (v) => prefs.set({ [k]: v });

      // --- Set it to the groove
      const main = block('Time it to the groove',
        'Pick how often the hits come and how quickly the compressor should grab and let go, in note values. ' +
        'Release is counted from the moment a hit lets go.');
      main.append(
        fields(
          field('Hits land every', noteSelect({ ids: HIT_IDS, value: p().hits, onChange: set('hits') })),
          field('Attack grabs within', noteSelect({ ids: ATTACK_IDS, value: p().attack, onChange: set('attack') })),
          field('Release lets go within', noteSelect({ ids: RELEASE_IDS, value: p().release, onChange: set('release') }))),
        h('div', { class: 'seg-row' },
          seg({ label: '“Within” means', value: p().settle, onChange: set('settle'),
            options: Object.entries(SETTLE).map(([v, s]) => ({ value: v, label: s.label })) }).el,
          seg({ label: 'Your knob shows', value: p().knob, onChange: set('knob'),
            options: Object.entries(KNOB).map(([v, s]) => ({ value: v, label: s.label, title: s.title })) }).el));
      const ans = answer();
      const say = verdict();
      const plot = h('div', { class: 'plot', role: 'img' });
      const caption = h('p', { class: 'caption' },
        h('span', { class: 'key key-hit' }), 'a hit, held over the threshold for a quarter of the gap  ',
        h('span', { class: 'key key-gr' }), 'gain reduction — deeper is more. Simulated at steady state.');
      main.append(ans.el, say, plot, caption);

      // --- Check an existing setting
      const checkBlock = block('Check a release you already have');
      const checkOut = verdict();
      checkBlock.append(
        fields(field('Release on the knob', number({ value: p().check, min: 0.01, onChange: set('check') }), 'ms')),
        checkOut);

      // --- Table
      const tblBlock = block('Release by note value',
        'What to dial so the release has let go by the end of each note value.');
      const tbl = table(['Let go within', 'Note length', 'Dial for 63%', 'Dial for 95%', 'Dial for 99%']);
      tblBlock.append(tbl.el);

      root.append(main, checkBlock, tblBlock);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));
      window.addEventListener('resize', () => lastT && root.offsetParent && drawPlot(lastT));

      function calc(t) {
        const s = p();
        const settleK = +s.settle, knobK = KNOB[s.knob].k;
        const gap = t.note(s.hits);
        const body = gap * HIT_SHARE;
        const attackWin = t.note(s.attack), releaseWin = t.note(s.release);
        const tauA = attackWin / settleK, tauR = releaseWin / settleK;
        return {
          s, settleK, knobK, gap, body, attackWin, releaseWin, tauA, tauR,
          dialA: tauA * knobK, dialR: tauR * knobK,
          // Share of the gain reduction given back by the time the next hit lands.
          recovered: 1 - Math.exp(-(gap - body) / tauR),
          // Share of full reduction reached before the hit lets go.
          grabbed: 1 - Math.exp(-body / tauA),
        };
      }

      function render(t) {
        lastT = t;
        const c = calc(t);
        const knobName = c.s.knob === 'tau' ? 'τ' : KNOB[c.s.knob].label.toLowerCase();

        ans.set([
          { label: 'Attack', value: f.ms(c.dialA), unit: 'ms', sub: f.samples(t.samples(c.dialA)) + ' samples' },
          { label: 'Release', value: f.ms(c.dialR), unit: 'ms', sub: f.samples(t.samples(c.dialR)) + ' samples' },
        ],
        'Time constants: attack τ <b>' + f.ms(c.tauA) + ' ms</b>, release τ <b>' + f.ms(c.tauR) + ' ms</b>.<br>' +
        'A ' + TD.notes.label(c.s.attack) + ' is ' + f.ms(c.attackWin) + ' ms and a ' + TD.notes.label(c.s.release) +
        ' is ' + f.ms(c.releaseWin) + ' ms at ' + f.bpm(t.bpm) + ' BPM' +
        (c.s.knob === 'tau' ? '.' : '; values shown as ' + knobName + '.'));

        const every = TD.notes.label(c.s.hits);
        let text;
        if (c.releaseWin > c.gap - c.body) {
          text = 'The release window is longer than the gap between hits, so it never gets there: ';
        } else text = '';
        const rec = f.pct(c.recovered);
        if (c.recovered >= 0.98) {
          text += 'Between hits it lets go completely — the gaps play at full level, so you hear it pump on every ' + every + '.';
        } else if (c.recovered >= 0.6) {
          text += 'It is <b>' + rec + '</b> recovered when the next hit lands: a steady breathing on every ' + every + ', still held down a little.';
        } else {
          text += 'Only <b>' + rec + '</b> recovered by the next hit: it barely lets go, so it will sound squashed rather than pumping. Shorten the release or space the hits out.';
        }
        if (c.grabbed < 0.9) {
          text += ' The attack only reaches <b>' + f.pct(c.grabbed) + '</b> of full reduction before each hit lets go, so the transients come through.';
        }
        say.innerHTML = text;

        drawPlot(t);

        const tauR = +p().check / c.knobK;
        const settleMs = tauR * c.settleK;
        const near = TD.notes.nearest(settleMs, t, RELEASE_IDS);
        const recAtHit = 1 - Math.exp(-(c.gap - c.body) / tauR);
        checkOut.innerHTML =
          'That is τ = <b>' + f.ms(tauR) + ' ms</b>, so it is ' + SETTLE[c.s.settle].label.split(' ')[0] + ' back after <b>' + f.ms(settleMs) + ' ms</b> — ' +
          'closest to a <b>' + TD.notes.label(near) + '</b> (' + f.ms(t.note(near)) + ' ms). ' +
          'With hits every ' + every + ' it is <b>' + f.pct(recAtHit) + '</b> recovered when the next one lands.';

        tbl.rows(TABLE_IDS.map((id) => {
          const ms = t.note(id);
          return row([TD.notes.label(id), f.ms(ms) + ' ms'].concat(
            [1, 3, 5].map((k) => f.ms((ms / k) * c.knobK) + ' ms')), id === c.s.release ? 'hl' : '');
        }));
      }

      /* Gain reduction over a bar (or two gaps, if the hits are sparse),
       * simulated to steady state and drawn hanging from the top like a meter. */
      function drawPlot(t) {
        const c = calc(t);
        const W = Math.max(280, plot.clientWidth || 600), H = 190;
        const L = 8, R = 8, T = 26, B = 26, PH = H - T - B, PW = W - L - R;
        const span = c.gap * 2 <= t.barMs ? t.barMs : c.gap * 2;
        const x = (ms) => L + (ms / span) * PW;
        const y = (e) => T + e * PH;

        // Warm up for a few gaps, then record one span.
        const steps = Math.min(4000, Math.ceil(PW * 2));
        const dt = span / steps;
        const warm = Math.ceil((6 * c.gap) / dt) * dt;
        const aA = 1 - Math.exp(-dt / c.tauA), aR = 1 - Math.exp(-dt / c.tauR);
        let e = 0;
        const pts = [];
        for (let i = 0, n = Math.round((warm + span) / dt); i <= n; i++) {
          const time = i * dt - warm;
          const inHit = ((time % c.gap) + c.gap) % c.gap < c.body;
          const target = inHit ? 1 : 0;
          e += (target - e) * (target > e ? aA : aR);
          if (time >= 0) pts.push([x(time), y(e)]);
        }

        let svg = '';
        // Hits (drawn over the area so they stay visible)
        let hits = '';
        for (let at = 0; at < span - 1e-6; at += c.gap) {
          hits += '<rect class="p-hit" x="' + x(at) + '" y="' + T + '" width="' + (x(at + c.body) - x(at)) + '" height="' + PH + '"/>';
        }
        // Beat and bar lines
        for (let q = 0, i = 0; q <= t.quarters(span) + 1e-6; q += t.barQuarters / t.sigNum, i++) {
          const bar = i % t.sigNum === 0;
          const xx = x(t.ms(q));
          svg += '<line class="' + (bar ? 'p-bar' : 'p-beat') + '" x1="' + xx + '" x2="' + xx + '" y1="' + T + '" y2="' + (T + PH) + '"/>';
          if (xx < W - 20) svg += '<text class="p-lbl" x="' + (xx + 3) + '" y="' + (H - 8) + '">' +
            (Math.floor(i / t.sigNum) + 1) + '.' + ((i % t.sigNum) + 1) + '</text>';
        }
        // Curve
        const line = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
        svg += '<path class="p-area" d="' + line + 'L' + x(span) + ' ' + T + 'L' + L + ' ' + T + 'Z"/>';
        svg += hits;
        svg += '<path class="p-line" d="' + line + '"/>';
        // Where the release was asked to be done
        const due = c.body + c.releaseWin;
        if (due < span) {
          const xd = x(due);
          svg += '<line class="p-due" x1="' + xd + '" x2="' + xd + '" y1="' + (T - 6) + '" y2="' + (T + PH) + '"/>';
          svg += '<text class="p-due-lbl" x="' + xd + '" y="' + (T - 10) + '" text-anchor="' + (xd > W - 90 ? 'end' : 'middle') + '">let go by here</text>';
        }

        plot.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + svg + '</svg>';
        plot.setAttribute('aria-label',
          'Gain reduction over ' + f.ms(span) + ' ms with a hit every ' + TD.notes.label(c.s.hits) +
          '; ' + f.pct(c.recovered) + ' recovered before each new hit.');
      }

      return { render };
    },
  });
})(window.TD);

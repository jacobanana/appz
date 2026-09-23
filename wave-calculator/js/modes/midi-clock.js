/* MIDI clock — how long a clock tick is, and how many ticks to shift the clock
 * by to line up audio that arrives late. MIDI clock sends 24 ticks per quarter
 * note, so a tick's length depends only on tempo. */
(function (WC) {
  'use strict';
  const { h, block, field, fields, number, select, seg, answer, table, row, verdict } = WC.ui;
  const f = WC.fmt;

  const PPQN = [24, 48, 96, 480, 960];
  const COMP = {
    only: { label: 'Delay only', target: (d) => d },
    minus: { label: 'Delay − latency', target: (d, l) => Math.max(0, d - l) },
    plus: { label: 'Delay + latency', target: (d, l) => d + l },
  };
  const NOTE_ROWS = ['1/32', '1/16', '1/8t', '1/8', '1/4', '1/2', '1bar'];

  WC.modes.register({
    id: 'midi-clock',
    title: 'MIDI clock',
    summary: 'Tick lengths, and how many ticks line up a late signal.',
    prefs: { n: 1, ppqn: 24, delay: 53, lat: 3, comp: 'only' },
    clean: (p, d) => ({
      n: +p.n >= 0 ? +p.n : d.n,
      ppqn: PPQN.includes(+p.ppqn) ? +p.ppqn : d.ppqn,
      delay: +p.delay >= 0 ? +p.delay : d.delay,
      lat: +p.lat >= 0 ? +p.lat : d.lat,
      comp: COMP[p.comp] ? p.comp : d.comp,
    }),

    mount(root, { prefs }) {
      const p = () => prefs.get();
      const set = (k, cast) => (v) => prefs.set({ [k]: cast ? cast(v) : v });

      // --- N ticks
      const len = block('How long is N ticks?', 'Tick length in ms = 60,000 ÷ (BPM × ticks per quarter note).');
      const lenAns = answer();
      len.append(fields(
        field('Number of ticks', number({ value: p().n, min: 0, step: 1, onChange: set('n') })),
        field('Ticks per quarter note', select({
          options: PPQN.map((v) => ({ value: v, label: v === 24 ? '24 (MIDI clock)' : String(v) })),
          value: p().ppqn, onChange: set('ppqn', Number) }))),
      lenAns.el);

      // --- Delay → ticks
      const shift = block('Turn a delay into ticks');
      shift.append(
        fields(
          field('Measured audio delay', number({ value: p().delay, min: 0, step: 0.1, onChange: set('delay') }), 'ms'),
          field('Roundtrip latency', number({ value: p().lat, min: 0, step: 0.1, onChange: set('lat') }), 'ms')),
        seg({ label: 'Delay to compensate', value: p().comp, onChange: set('comp'),
          options: Object.entries(COMP).map(([v, c]) => ({ value: v, label: c.label })) }).el);
      const say = verdict();
      const ruler = h('div', { class: 'ruler', role: 'img' });
      const opts = table(['Shift the clock by', 'Equals', 'What is left over']);
      shift.append(say, h('div', { class: 'ruler-scroll' }, ruler), h('div', { class: 'options' }, opts.el));

      // --- Notes in ticks
      const notes = block('Note lengths in ticks');
      const notesTbl = table(['Note', 'Ticks', 'Milliseconds', 'Samples']);
      notes.append(notesTbl.el);

      root.append(len, shift, notes);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      const plural = (n, w) => f.trim(n, 2) + ' ' + w + (n === 1 ? '' : 's');
      const leftover = (ms) => Math.abs(ms) < 0.005 ? 'Nothing, it lines up exactly'
        : ms > 0 ? 'Audio still ' + f.num(ms, 2) + ' ms late' : 'Audio ' + f.num(-ms, 2) + ' ms early';

      function render(t) {
        lastT = t;
        const s = p();
        const tickMs = t.quarterMs / s.ppqn;

        lenAns.set([{ value: f.num(s.n * tickMs, 2), unit: 'ms' }],
          plural(s.n, 'tick') + ' at ' + f.bpm(t.bpm) + ' BPM, ' + f.num(t.samples(s.n * tickMs), 1) + ' samples.<br>' +
          'One tick is <b>' + f.num(tickMs, 3) + '</b> ms, or <b>' + f.num(t.samples(tickMs), 1) + '</b> samples.');

        const target = COMP[s.comp].target(s.delay, s.lat);
        const dt = target / tickMs;
        let lo = Math.floor(dt), hi = Math.ceil(dt);
        if (lo === hi) hi = lo + 1;
        const nearest = Math.round(dt);
        const res = target - nearest * tickMs;
        say.innerHTML = '<span class="t">' + f.trim(target, 2) + ' ms</span> is <b>' + f.num(dt, 2) + ' ticks</b>. ' +
          'Shift the clock by <b>' + plural(nearest, 'tick') + '</b> (' + f.num(nearest * tickMs, 2) + ' ms) and ' +
          (Math.abs(res) < 0.005 ? 'it lines up exactly.' : 'the audio lands ' + f.num(Math.abs(res), 2) + ' ms ' + (res > 0 ? 'late' : 'early') + '.');

        drawRuler(s.ppqn, target, dt, nearest);

        opts.rows([lo, hi].map((k) => row([plural(k, 'tick'), f.num(k * tickMs, 2) + ' ms', leftover(target - k * tickMs)],
          k === nearest ? 'hl closest' : '')));

        notesTbl.rows(['tick'].concat(NOTE_ROWS).map((id) => {
          const q = id === 'tick' ? 1 / s.ppqn : WC.notes.quarters(id, t);
          const ticks = q * s.ppqn, ms = t.ms(q);
          return row([id === 'tick' ? 'One tick' : WC.notes.label(id), f.trim(ticks, 2), f.num(ms, 2), f.samples(t.samples(ms))]);
        }));
      }

      function drawRuler(ppqn, delayMs, dt, nearest) {
        const total = Math.max(6, Math.ceil(dt) + 2);
        const step = total <= 48 ? 1 : total <= 288 ? 6 : 24;
        const labelEvery = total <= 12 ? 1 : total <= 48 ? 6 : total <= 288 ? 24 : 96;
        const beat = ppqn / 4; // a 16th, marked taller
        const pos = (i) => (i / total) * 100 + '%';
        let html = '<div class="base"></div><div class="span" style="width:' + (Math.min(dt, total) / total) * 100 + '%"></div>';
        for (let i = 0; i <= total; i += step) {
          html += '<div class="mark' + (i % beat === 0 ? ' beat' : '') + (i === nearest ? ' near' : '') + '" style="left:' + pos(i) + '"></div>';
          if (i % labelEvery === 0 || i === nearest) {
            html += '<div class="mark-label' + (i === nearest ? ' near' : '') + '" style="left:' + pos(i) + '">' + i + '</div>';
          }
        }
        if (step > 1 && nearest % step !== 0 && nearest <= total) {
          html += '<div class="mark near" style="left:' + pos(nearest) + '"></div>';
        }
        const dl = pos(Math.min(dt, total));
        html += '<div class="delay" style="left:' + dl + '"></div>';
        html += '<div class="delay-flag" style="left:' + dl + '">' + f.trim(delayMs, 2) + ' ms</div>';
        html += '<div class="ruler-caption">ticks</div>';
        ruler.innerHTML = html;
        ruler.setAttribute('aria-label', 'Tick ruler: the delay of ' + f.num(delayMs, 2) + ' ms falls at ' + f.num(dt, 2) +
          ' ticks; the nearest whole tick is ' + nearest + '.');
      }

      return { render };
    },
  });
})(window.WC);

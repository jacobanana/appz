/* MIDI clock — how long a clock tick is, or how many ticks to shift the clock
 * by to line up audio that arrives late (one at a time, from a toggle). MIDI clock sends 24 ticks per quarter
 * note, so a tick's length depends only on tempo. */
(function (WC) {
  'use strict';
  const { h, field, fields, number, select, seg, views, table, row, pairs } = WC.ui;
  const f = WC.fmt;

  const PPQN = [24, 48, 96, 480, 960];
  const COMP = {
    only: { label: 'Delay', target: (d) => d },
    minus: { label: 'Delay − latency', target: (d, l) => Math.max(0, d - l) },
    plus: { label: 'Delay + latency', target: (d, l) => d + l },
  };
  const VIEWS = ['ticks', 'delay'];

  WC.modes.register({
    id: 'midi-clock',
    title: 'MIDI clock',
    prefs: { view: 'ticks', n: 1, ppqn: 24, delay: 53, lat: 3, comp: 'only' },
    clean: (p, d) => ({
      view: VIEWS.includes(p.view) ? p.view : d.view,
      n: +p.n >= 0 ? +p.n : d.n,
      ppqn: PPQN.includes(+p.ppqn) ? +p.ppqn : d.ppqn,
      delay: +p.delay >= 0 ? +p.delay : d.delay,
      lat: +p.lat >= 0 ? +p.lat : d.lat,
      comp: COMP[p.comp] ? p.comp : d.comp,
    }),

    mount(root, { prefs }) {
      const p = () => prefs.get();
      const set = (k, cast) => (v) => prefs.set({ [k]: cast ? cast(v) : v });

      // --- Ticks → time
      const lenOut = pairs();
      const len = [fields(
        field('Ticks', number({ value: p().n, min: 0, step: 1, onChange: set('n') })),
        field('Ticks per quarter note', select({
          options: PPQN.map((v) => ({ value: v, label: v === 24 ? '24 (MIDI clock)' : String(v) })),
          value: p().ppqn, onChange: set('ppqn', Number) }))),
      lenOut.el];

      // --- Delay → ticks
      const shiftTbl = table([{ label: '', width: '30%' }, 'Ticks', 'ms', 'Late (+) ms']);
      const ruler = h('div', { class: 'ruler', role: 'img' });
      const shift = [
        fields(
          field('Measured delay', number({ value: p().delay, min: 0, step: 0.1, onChange: set('delay') }), 'ms'),
          field('Roundtrip latency', number({ value: p().lat, min: 0, step: 0.1, onChange: set('lat') }), 'ms')),
        seg({ label: 'Compensate', value: p().comp, onChange: set('comp'),
          options: Object.entries(COMP).map(([v, c]) => ({ value: v, label: c.label })) }).el,
        shiftTbl.el, h('div', { class: 'ruler-wrap' }, ruler)];

      root.append(views(prefs, [
        { value: 'ticks', label: 'Ticks → time', content: len },
        { value: 'delay', label: 'Delay → ticks', content: shift },
      ]));

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      // Audio still late (+) or now early (−) after the shift.
      const offset = (ms) => Math.abs(ms) < 0.005 ? '0' : (ms > 0 ? '+' : '−') + f.num(Math.abs(ms), 2);

      function render(t) {
        lastT = t;
        const s = p();
        const tickMs = t.quarterMs / s.ppqn;

        lenOut.set([
          ['Time', f.num(s.n * tickMs, 2) + ' ms', 'main'],
          ['Samples', f.num(t.samples(s.n * tickMs), 1)],
          ['1 tick', f.num(tickMs, 3) + ' ms'],
          ['1 tick in samples', f.num(t.samples(tickMs), 1)],
        ]);

        const target = COMP[s.comp].target(s.delay, s.lat);
        const dt = target / tickMs;
        let lo = Math.floor(dt), hi = Math.ceil(dt);
        if (lo === hi) hi = lo + 1;
        const nearest = Math.round(dt);
        shiftTbl.rows([
          row(['Delay', f.num(dt, 2), f.num(target, 2), '<span class="dim">—</span>']),
          row(['Round down', lo, f.num(lo * tickMs, 2), offset(target - lo * tickMs)], lo === nearest ? 'hl' : ''),
          row(['Round up', hi, f.num(hi * tickMs, 2), offset(target - hi * tickMs)], hi === nearest ? 'hl' : ''),
        ]);

        drawRuler(s.ppqn, target, dt, nearest);
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
        ruler.innerHTML = html;
        ruler.setAttribute('aria-label', 'Tick ruler: the delay of ' + f.num(delayMs, 2) + ' ms falls at ' + f.num(dt, 2) +
          ' ticks; the nearest whole tick is ' + nearest + '.');
      }

      return { render };
    },
  });
})(window.WC);

/* Delay & reverb — echo times on the grid, and a reverb whose pre-delay plus
 * decay ends exactly on a note value so the tail clears before the next one. */
(function (WC) {
  'use strict';
  const { h, block, field, fields, noteSelect, answer, table, row, verdict } = WC.ui;
  const f = WC.fmt;

  const DELAY_IDS = WC.notes.list({ longest: 1, shortest: 64, bars: [1] });
  const COMMON = ['1/4', '1/8d', '1/8', '1/4t', '1/8t', '1/16'];
  const TAIL_IDS = WC.notes.list({ longest: 1, shortest: 16, feels: ['', 'd'], bars: [4, 2, 1] });
  const PRE_IDS = WC.notes.list({ longest: 16, shortest: 256, feels: ['', 't'] });
  const SIZES = [
    ['Ambience', '1/8', '1/256'],
    ['Room', '1/4', '1/128'],
    ['Plate', '1/2', '1/64'],
    ['Hall', '1bar', '1/32'],
    ['Big hall', '2bar', '1/32'],
  ];

  WC.modes.register({
    id: 'space',
    title: 'Delay & reverb',
    summary: 'Echo times on the grid, and reverb tails that end on a note.',
    prefs: { delay: '1/8d', tail: '1/2', pre: '1/64' },
    clean: (p, d) => ({
      delay: DELAY_IDS.includes(p.delay) ? p.delay : d.delay,
      tail: TAIL_IDS.includes(p.tail) ? p.tail : d.tail,
      pre: PRE_IDS.includes(p.pre) ? p.pre : d.pre,
    }),

    mount(root, { prefs }) {
      const p = () => prefs.get();
      const set = (k) => (v) => prefs.set({ [k]: v });

      // --- Delay
      const delay = block('Delay time');
      const delaySel = noteSelect({ ids: DELAY_IDS, value: p().delay, onChange: set('delay') });
      const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Common delay times' });
      const delayAns = answer();
      const echoes = verdict();
      delay.append(fields(field('Echo every', delaySel)), chips, delayAns.el, echoes);

      // --- Reverb
      const verb = block('Reverb that fits',
        'Pre-delay keeps the dry hit clear of the reverb; the decay (RT60) is what is left of the note after it, ' +
        'so the tail has faded by −60 dB when the next note arrives.');
      const tailSel = noteSelect({ ids: TAIL_IDS, value: p().tail, onChange: set('tail') });
      const preSel = noteSelect({ ids: PRE_IDS, value: p().pre, onChange: set('pre') });
      verb.append(fields(field('Tail gone within', tailSel), field('Pre-delay', preSel)));
      const verbAns = answer();
      const sizes = table(['Space', 'Tail', 'Pre-delay', 'Decay']);
      sizes.body.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-tail]');
        if (b) prefs.set({ tail: b.dataset.tail, pre: b.dataset.pre });
      });
      verb.append(verbAns.el, h('h3', {}, 'Starting points'), sizes.el);

      root.append(delay, verb);

      let lastT = null;
      prefs.subscribe(() => lastT && render(lastT));

      function render(t) {
        lastT = t;
        const s = p();
        delaySel.value = s.delay;
        tailSel.value = s.tail;
        preSel.value = s.pre;

        chips.replaceChildren(...COMMON.map((id) => h('button', {
          type: 'button', class: 'chip', 'aria-pressed': String(id === s.delay),
          onclick: () => prefs.set({ delay: id }),
        }, h('b', {}, WC.notes.label(id)), ' ', f.ms(t.note(id)) + ' ms')));

        const d = t.note(s.delay);
        delayAns.set([{ value: f.ms(d), unit: 'ms' }],
          '<b>' + f.samples(t.samples(d)) + '</b> samples · <b>' + f.hz(t.hz(d)) + '</b> Hz');
        echoes.innerHTML = 'Repeats land at ' + [1, 2, 3, 4].map((n) => '<b>' + f.ms(n * d) + '</b>').join(', ') + ' ms' +
          (d * 4 > t.barMs ? '' : ' — ' + f.trim(t.barMs / d, 2) + ' echoes per bar') + '.';

        const tail = t.note(s.tail), pre = t.note(s.pre);
        const decay = tail - pre;
        verbAns.set([
          { label: 'Pre-delay', value: f.ms(pre), unit: 'ms' },
          { label: 'Decay', value: decay > 0 ? f.ms(decay) : '–', unit: 'ms' },
        ], decay > 0
          ? 'Together they end on the ' + WC.notes.label(s.tail) + ' at <b>' + f.ms(tail) + ' ms</b>.'
          : '<span class="warn">The pre-delay is as long as the whole tail — pick a shorter one.</span>');

        sizes.rows(SIZES.map(([name, tl, pr]) => {
          const a = t.note(tl), b = t.note(pr);
          return row(['<button type="button" class="link" data-tail="' + tl + '" data-pre="' + pr + '">' + name + '</button>', WC.notes.label(tl), WC.notes.label(pr) + ' · ' + f.ms(b) + ' ms', f.ms(a - b) + ' ms'],
            tl === s.tail && pr === s.pre ? 'hl' : '');
        }));
      }

      return { render };
    },
  });
})(window.WC);

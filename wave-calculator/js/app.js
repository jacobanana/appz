/* Wave Calculator — the shell.
 *
 * Wires the one tempo bar to WC.tempo, lays the registered modes out as a
 * grid of app icons, mounts each mode the first time it is opened and
 * re-renders the open one whenever the tempo changes. Modes never touch the bar and the bar never
 * knows what modes exist.
 */
(function (WC) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const f = WC.fmt;
  const tempo = WC.tempo;

  // ------------------------------------------------------------ tempo bar

  const bpmIn = $('bpm');
  const round = (x) => Math.round(x * 1000) / 1000;
  const setBpm = (x) => { if (WC.validBpm(x)) tempo.set({ bpm: round(x) }); };
  const nudge = (d) => setBpm(tempo.get().bpm + d);

  bpmIn.min = WC.BPM_MIN;
  bpmIn.max = WC.BPM_MAX;
  bpmIn.addEventListener('input', () => {
    const x = parseFloat(bpmIn.value);
    const ok = WC.validBpm(x);
    if (ok) { bpmIn.removeAttribute('aria-invalid'); setBpm(x); } else bpmIn.setAttribute('aria-invalid', 'true');
  });
  bpmIn.addEventListener('blur', () => { bpmIn.removeAttribute('aria-invalid'); bpmIn.value = tempo.get().bpm; });
  // Arrows step by whole BPM (the input's own step is 0.001 so typing any value is valid).
  bpmIn.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const d = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    nudge(e.key === 'ArrowUp' ? d : -d);
  });
  $('bpmDown').addEventListener('click', (e) => nudge(e.shiftKey ? -0.1 : -1));
  $('bpmUp').addEventListener('click', (e) => nudge(e.shiftKey ? 0.1 : 1));
  $('half').addEventListener('click', () => setBpm(tempo.get().bpm / 2));
  $('double').addEventListener('click', () => setBpm(tempo.get().bpm * 2));

  // Tap tempo: average of the last few intervals; a pause of 2 s starts over.
  const tapBtn = $('tap');
  let taps = [];
  function tap() {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now);
    if (taps.length > 9) taps.shift();
    tapBtn.dataset.count = taps.length;
    tapBtn.classList.remove('flash'); void tapBtn.offsetWidth; tapBtn.classList.add('flash');
    if (taps.length >= 2) setBpm(Math.round((60000 * (taps.length - 1)) / (now - taps[0]) * 10) / 10);
  }
  tapBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
  tapBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey &&
        !e.target.closest('input,select,textarea,[contenteditable]')) tap();
  });

  const sigNum = $('sigNum'), sigDen = $('sigDen'), rate = $('rate');
  for (let n = 1; n <= 16; n++) sigNum.append(new Option(n, n));
  WC.SIG_DENOMINATORS.forEach((d) => sigDen.append(new Option(d, d)));
  WC.SAMPLE_RATES.forEach((r) => rate.append(new Option(f.num(r / 1000, r % 1000 ? 1 : 0) + ' kHz', r)));
  sigNum.addEventListener('change', () => tempo.set({ sigNum: +sigNum.value }));
  sigDen.addEventListener('change', () => tempo.set({ sigDen: +sigDen.value }));
  rate.addEventListener('change', () => tempo.set({ sampleRate: +rate.value }));

  function paintBar(s) {
    if (document.activeElement !== bpmIn || parseFloat(bpmIn.value) !== s.bpm) bpmIn.value = s.bpm;
    sigNum.value = s.sigNum;
    sigDen.value = s.sigDen;
    rate.value = s.sampleRate;
  }
  // Paint now, so the bar works even if a calculator below fails to build.
  paintBar(tempo.get());

  // ------------------------------------------------------------ modes

  const { h } = WC.ui;
  const modes = WC.modes.all();
  const home = $('home'), appbar = $('appbar'), host = $('modes');
  const mounted = new Map(); // id → { panel, view }

  /** A mode's app icon: its line glyph on a plain tile. */
  function icon(m, cls) {
    return h('span', { class: 'icon ' + (cls || ''), 'aria-hidden': 'true',
      html: '<svg viewBox="0 0 48 48" focusable="false">' + (m.icon || '') + '</svg>' });
  }

  const grid = h('ul', { class: 'apps' }, modes.map((m) =>
    h('li', {}, h('a', { href: '#' + m.id, class: 'app', 'data-mode': m.id }, icon(m), h('span', { class: 'app-name' }, m.title)))));
  home.append(h('h2', { class: 'visually-hidden' }, 'Calculators'), grid);

  const barIcon = $('appIcon'), barTitle = $('appTitle');

  function mount(m) {
    const panel = document.createElement('div');
    panel.className = 'mode';
    panel.id = 'mode-' + m.id;
    host.append(panel);
    const prefs = WC.store('mode:' + m.id, m.prefs || {}, m.clean);
    const view = m.mount(panel, { prefs, tempo });
    const entry = { panel, view };
    mounted.set(m.id, entry);
    return entry;
  }

  let current = null;
  /** Open a mode by id, or the app grid for anything else. */
  function show(id) {
    const m = WC.modes.get(id);
    const was = current;
    current = m ? m.id : null;
    home.hidden = !!m;
    appbar.hidden = !m;
    document.body.classList.toggle('in-app', !!m);
    if (!m) {
      mounted.forEach((e) => { e.panel.hidden = true; });
      document.title = 'Wave Calculator';
      // Back on the grid, focus the app we just left so keyboard users keep their place.
      const last = was && grid.querySelector('[data-mode="' + was + '"]');
      if (last && document.activeElement && document.activeElement.closest('#appbar')) last.focus();
      return;
    }
    barIcon.replaceChildren(icon(m, 'small'));
    barTitle.textContent = m.title;
    const entry = mounted.get(m.id) || mount(m);
    mounted.forEach((e) => { e.panel.hidden = e !== entry; });
    entry.panel.classList.remove('opening'); void entry.panel.offsetWidth; entry.panel.classList.add('opening');
    document.title = m.title + ' · Wave Calculator';
    entry.view.render(WC.timing(tempo.get()));
    window.scrollTo(0, 0);
  }

  tempo.subscribe((s) => {
    paintBar(s);
    const entry = current && mounted.get(current);
    if (entry) entry.view.render(WC.timing(s));
  });

  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  // Escape leaves an app for the grid, unless it's closing something inside it.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && current && !e.defaultPrevented &&
        !e.target.closest('input,select,textarea,[contenteditable]')) location.hash = '';
  });

  show(location.hash.slice(1));
})(window.WC);

/* Tempo Desk — the shell.
 *
 * Wires the one tempo bar to TD.tempo, builds a tab per registered mode,
 * mounts each mode the first time it is shown and re-renders the visible one
 * whenever the tempo changes. Modes never touch the bar and the bar never
 * knows what modes exist.
 */
(function (TD) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const f = TD.fmt;
  const tempo = TD.tempo;
  const app = TD.store('app', { mode: '' });

  // ------------------------------------------------------------ tempo bar

  const bpmIn = $('bpm');
  const round = (x) => Math.round(x * 1000) / 1000;
  const setBpm = (x) => { if (TD.validBpm(x)) tempo.set({ bpm: round(x) }); };
  const nudge = (d) => setBpm(tempo.get().bpm + d);

  bpmIn.min = TD.BPM_MIN;
  bpmIn.max = TD.BPM_MAX;
  bpmIn.addEventListener('input', () => {
    const x = parseFloat(bpmIn.value);
    const ok = TD.validBpm(x);
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
  TD.SIG_DENOMINATORS.forEach((d) => sigDen.append(new Option(d, d)));
  TD.SAMPLE_RATES.forEach((r) => rate.append(new Option(f.num(r / 1000, r % 1000 ? 1 : 0) + ' kHz', r)));
  sigNum.addEventListener('change', () => tempo.set({ sigNum: +sigNum.value }));
  sigDen.addEventListener('change', () => tempo.set({ sigDen: +sigDen.value }));
  rate.addEventListener('change', () => tempo.set({ sampleRate: +rate.value }));

  function paintBar(s) {
    if (document.activeElement !== bpmIn || parseFloat(bpmIn.value) !== s.bpm) bpmIn.value = s.bpm;
    sigNum.value = s.sigNum;
    sigDen.value = s.sigDen;
    rate.value = s.sampleRate;
    const t = TD.timing(s);
    $('readout').innerHTML =
      '<span>Beat <b>' + f.ms(t.beatMs) + '</b> ms</span>' +
      '<span>Bar <b>' + f.ms(t.barMs) + '</b> ms</span>' +
      '<span>16th <b>' + f.ms(t.note('1/16')) + '</b> ms</span>';
  }

  // ------------------------------------------------------------ modes

  const modes = TD.modes.all();
  const tabs = $('tabs'), host = $('modes'), summary = $('summary');
  const mounted = new Map(); // id → { panel, view }

  modes.forEach((m) => {
    const a = document.createElement('a');
    a.href = '#' + m.id;
    a.textContent = m.title;
    a.dataset.mode = m.id;
    tabs.append(a);
  });

  function mount(m) {
    const panel = document.createElement('div');
    panel.className = 'mode';
    panel.id = 'mode-' + m.id;
    host.append(panel);
    const prefs = TD.store('mode:' + m.id, m.prefs || {}, m.clean);
    const view = m.mount(panel, { prefs, tempo });
    const entry = { panel, view };
    mounted.set(m.id, entry);
    return entry;
  }

  let current = null;
  function show(id) {
    const m = TD.modes.get(id) || modes[0];
    current = m.id;
    tabs.querySelectorAll('a').forEach((a) => {
      if (a.dataset.mode === m.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const entry = mounted.get(m.id) || mount(m);
    mounted.forEach((e) => { e.panel.hidden = e !== entry; });
    summary.textContent = m.summary || '';
    document.title = m.title + ' · Tempo Desk';
    entry.view.render(TD.timing(tempo.get()));
    app.set({ mode: m.id });
    const active = tabs.querySelector('[aria-current]');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  tempo.subscribe((s) => {
    paintBar(s);
    const entry = current && mounted.get(current);
    if (entry) entry.view.render(TD.timing(s));
  });

  window.addEventListener('hashchange', () => show(location.hash.slice(1)));

  paintBar(tempo.get());
  const start = location.hash.slice(1);
  show(TD.modes.get(start) ? start : app.get().mode);
  if (!location.hash) history.replaceState(null, '', '#' + current);
})(window.TD);

/* Wave Calculator — core.
 *
 * Everything every mode shares and nothing that touches the page:
 *   WC.store    a tiny observable, persisted to localStorage
 *   WC.tempo    the one shared tempo (BPM, time signature, sample rate)
 *   WC.timing   turns the tempo into milliseconds, samples and hertz
 *   WC.notes    note values ('1/8', '1/8d', '1/8t', '2bar') and their lengths
 *   WC.fmt      number formatting
 *   WC.modes    the registry the modes add themselves to
 */
(function (global) {
  'use strict';
  const WC = (global.WC = global.WC || {});

  // ---------------------------------------------------------------- storage

  const PREFIX = 'wave-calculator:';

  function load(key) {
    try { return JSON.parse(localStorage.getItem(PREFIX + key) || 'null'); } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* private window */ }
  }

  /**
   * An observable object persisted under `key`. `clean(next, defaults)` runs on
   * every write (and on load), so a store never holds a value its readers
   * would have to guard against.
   */
  function store(key, defaults, clean) {
    clean = clean || ((s) => s);
    let state = clean(Object.assign({}, defaults, load(key) || {}), defaults);
    const subs = new Set();
    return {
      get: () => state,
      set(patch) {
        if (typeof patch === 'function') patch = patch(state);
        const next = clean(Object.assign({}, state, patch), defaults);
        if (Object.keys(next).every((k) => next[k] === state[k])) return;
        state = next;
        save(key, state);
        subs.forEach((fn) => fn(state));
      },
      subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    };
  }
  WC.store = store;

  // ---------------------------------------------------------------- tempo

  const SAMPLE_RATES = [44100, 48000, 88200, 96000, 192000];
  const SIG_DENOMINATORS = [2, 4, 8, 16];
  const BPM_MIN = 1, BPM_MAX = 999;

  WC.SAMPLE_RATES = SAMPLE_RATES;
  WC.SIG_DENOMINATORS = SIG_DENOMINATORS;
  WC.BPM_MIN = BPM_MIN;
  WC.BPM_MAX = BPM_MAX;
  WC.validBpm = (x) => Number.isFinite(x) && x >= BPM_MIN && x <= BPM_MAX;

  /** The single shared tempo. Every mode reads it; only the tempo bar (and the
   *  odd "use this tempo" button) writes it. */
  WC.tempo = store(
    'tempo',
    { bpm: 120, sigNum: 4, sigDen: 4, sampleRate: 48000 },
    (s, d) => ({
      bpm: WC.validBpm(+s.bpm) ? Math.round(+s.bpm * 1000) / 1000 : d.bpm,
      sigNum: Number.isInteger(+s.sigNum) && +s.sigNum >= 1 && +s.sigNum <= 32 ? +s.sigNum : d.sigNum,
      sigDen: SIG_DENOMINATORS.includes(+s.sigDen) ? +s.sigDen : d.sigDen,
      sampleRate: SAMPLE_RATES.includes(+s.sampleRate) ? +s.sampleRate : d.sampleRate,
    })
  );

  /**
   * Derived timing for one tempo state. BPM always counts quarter notes, so a
   * bar of 6/8 is three quarters long whatever the tempo.
   */
  WC.timing = function (s) {
    const quarterMs = 60000 / s.bpm;
    const barQuarters = (s.sigNum * 4) / s.sigDen;
    const t = {
      bpm: s.bpm,
      sigNum: s.sigNum,
      sigDen: s.sigDen,
      sampleRate: s.sampleRate,
      quarterMs,
      barQuarters,
      barMs: barQuarters * quarterMs,
      beatMs: (4 / s.sigDen) * quarterMs,
      ms: (quarters) => quarters * quarterMs,
      quarters: (ms) => ms / quarterMs,
      samples: (ms) => (ms * s.sampleRate) / 1000,
      hz: (ms) => 1000 / ms,
      /** Length of a note value (see WC.notes) in ms. */
      note: (id) => WC.notes.quarters(id, t) * quarterMs,
    };
    return t;
  };

  // ---------------------------------------------------------------- notes

  /*
   * A note value is a short id: '1/8' straight, '1/8d' dotted, '1/8t' triplet,
   * or '1bar' / '2bar' for whole bars (which depend on the time signature).
   */
  const FEEL = { '': 1, d: 1.5, t: 2 / 3 };
  const FEEL_NAME = { '': '', d: 'dotted', t: 'triplet' };
  const DENOMS = [1, 2, 4, 8, 16, 32, 64, 128, 256];

  function parse(id) {
    const bar = /^(\d+)bar$/.exec(id);
    if (bar) return { bars: +bar[1] };
    const m = /^1\/(\d+)([dt]?)$/.exec(id);
    if (!m) throw new Error('Unknown note value: ' + id);
    return { den: +m[1], feel: m[2] };
  }

  WC.notes = {
    DENOMS,
    parse,
    /** Length in quarter notes. Bars need the timing for their size. */
    quarters(id, t) {
      const p = parse(id);
      if (p.bars) return p.bars * (t ? t.barQuarters : 4);
      return (4 / p.den) * FEEL[p.feel];
    },
    label(id) {
      const p = parse(id);
      if (p.bars) return p.bars + (p.bars === 1 ? ' bar' : ' bars');
      return ('1/' + p.den + ' ' + FEEL_NAME[p.feel]).trim();
    },
    /** '1/8d' → {base: '1/8', feel: 'd'}; '2bar' → {base: '2bar', feel: ''} */
    split(id) {
      const p = parse(id);
      return p.bars ? { base: id, feel: '' } : { base: '1/' + p.den, feel: p.feel };
    },
    join: (base, feel) => (/bar$/.test(base) ? base : base + (feel || '')),
    /** Whether `id` is one of these divisions / bars (and, if not, a straight one). */
    allowed(id, { divisions = [], bars = [], feels = true } = {}) {
      try {
        const p = parse(id);
        if (p.bars) return bars.includes(p.bars);
        return divisions.includes(p.den) && (feels || !p.feel);
      } catch (e) { return false; }
    },
    /** Every id from `longest` denominator down to `shortest`, in each feel,
     *  longest first, with optional whole-bar values ahead of them. */
    list({ longest = 1, shortest = 256, feels = ['', 'd', 't'], bars = [] } = {}) {
      const ids = bars.slice().sort((a, b) => b - a).map((n) => n + 'bar');
      DENOMS.filter((d) => d >= longest && d <= shortest).forEach((d) => {
        // Dotted is longer than straight, triplet shorter: keep that order.
        ['d', '', 't'].filter((f) => feels.includes(f)).forEach((f) => ids.push('1/' + d + f));
      });
      return ids;
    },
    /** The id in `ids` whose length is closest to `ms` (by ratio, so 10 ms
     *  away matters more for a 16th than for a bar). */
    nearest(ms, t, ids) {
      let best = null, bestErr = Infinity;
      ids.forEach((id) => {
        const err = Math.abs(Math.log(t.note(id) / ms));
        if (err < bestErr) { bestErr = err; best = id; }
      });
      return best;
    },
  };

  // ---------------------------------------------------------------- format

  function num(x, dp) {
    if (!Number.isFinite(x)) return '–';
    return x.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  /** Up to `dp` decimals, trailing zeros dropped (120, 93.5, 128.25). */
  function trim(x, dp) {
    if (!Number.isFinite(x)) return '–';
    return x.toLocaleString('en-US', { maximumFractionDigits: dp });
  }

  WC.fmt = {
    num,
    trim,
    bpm: (x) => trim(x, 2),
    /** Milliseconds with precision that suits their size. */
    ms: (x) => num(x, Math.abs(x) < 100 ? 2 : Math.abs(x) < 10000 ? 1 : 0),
    samples: (x) => num(x, 0),
    hz: (x) => num(x, x < 1 ? 3 : x < 10 ? 2 : 1),
    pct: (x, dp = 0) => num(x * 100, dp) + '%',
    /** 83 456 ms → '1:23.456' */
    clock(ms) {
      if (!Number.isFinite(ms)) return '–';
      const neg = ms < 0; ms = Math.abs(ms);
      const total = Math.round(ms);
      const m = Math.floor(total / 60000);
      const s = (total % 60000) / 1000;
      return (neg ? '−' : '') + m + ':' + s.toFixed(3).padStart(6, '0');
    },
  };

  // ---------------------------------------------------------------- modes

  /*
   * A mode is one calculator. It registers itself with:
   *
   *   WC.modes.register({
   *     id: 'compressor',            // URL hash and storage key
   *     title: 'Compressor',         // label under its icon
   *     icon: '<path …/>',           // line glyph on a 48×48 grid; the
   *                                  // tile sets stroke, so no styling
   *     prefs: { ... },              // its own inputs' defaults, persisted
   *     mount(root, ctx) {           // build the DOM once, into `root`
   *       return { render(t) {} };   // redraw for a WC.timing; called on
   *     },                           // every tempo change while visible
   *   });
   *
   * ctx gives it { prefs: a WC.store of its own inputs, tempo: WC.tempo }.
   * Icons appear in registration order, i.e. the order of the script tags.
   */
  const registry = [];
  WC.modes = {
    register(mode) {
      if (!mode.id || !mode.mount) throw new Error('A mode needs an id and a mount()');
      if (registry.some((m) => m.id === mode.id)) throw new Error('Duplicate mode: ' + mode.id);
      registry.push(mode);
    },
    all: () => registry.slice(),
    get: (id) => registry.find((m) => m.id === id),
  };
})(window);

/* Wave Calculator — UI kit.
 *
 * Small DOM builders the modes share. Every mode is laid out the same way:
 * a block per calculation, inputs on top, a results table underneath.
 */
(function (WC) {
  'use strict';

  let uid = 0;
  const nextId = (p) => 'wc-' + (p || 'x') + '-' + ++uid;

  /** h('div', {class: 'x', onclick: fn}, child, 'text', [more]) */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    children.flat(Infinity).forEach((c) => {
      if (c == null || c === false) return;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return el;
  }

  /** A titled card. Returns the <section>; append inputs and results to it. */
  function block(title) {
    const id = nextId('h');
    return h('section', { class: 'block', 'aria-labelledby': id }, h('h2', { id }, title));
  }

  /** Label + control, stacked. `unit` is shown beside the label. */
  function field(label, control, unit) {
    const target = control.matches('input,select') ? control : control.querySelector('input,select');
    if (target && !target.id) target.id = nextId('f');
    return h('div', { class: 'field' },
      h('label', { for: target && target.id }, label, unit && h('span', { class: 'unit' }, ' ' + unit)),
      control);
  }

  function fields(...children) {
    return h('div', { class: 'fields' }, children);
  }

  /**
   * A number box that only reports values that pass `valid`, so a half-typed
   * "" or "-" never reaches the mode. The box goes amber while invalid.
   */
  function number({ value, min, max, step = 'any', valid, onChange }) {
    valid = valid || ((x) => Number.isFinite(x) && (min == null || x >= min) && (max == null || x <= max));
    // `value` may be a getter, so leaving a bad entry restores the live value.
    const current = typeof value === 'function' ? value : () => value;
    const el = h('input', { type: 'number', inputmode: 'decimal', min, max, step });
    el.value = current();
    el.addEventListener('input', () => {
      const x = parseFloat(el.value);
      const ok = valid(x);
      if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
      if (ok) onChange(x);
    });
    el.addEventListener('blur', () => {
      if (el.hasAttribute('aria-invalid')) { el.value = current(); el.removeAttribute('aria-invalid'); }
    });
    return el;
  }

  /** <select> from [{value, label}] or plain values. */
  function select({ options, value, onChange }) {
    const el = h('select', {},
      options.map((o) => {
        const opt = typeof o === 'object' ? o : { value: o, label: String(o) };
        return h('option', { value: opt.value }, opt.label);
      }));
    el.value = String(value);
    el.addEventListener('change', () => onChange(el.value));
    return el;
  }

  /** Segmented buttons. Returns {el, set(value), disable(bool)}. */
  function seg({ label, options, value, onChange }) {
    const id = nextId('seg');
    const buttons = options.map((o) =>
      h('button', { type: 'button', 'data-value': o.value,
        onclick: () => { set(o.value); onChange(o.value); } }, o.label));
    const group = h('div', { class: 'seg', role: 'group', 'aria-labelledby': label ? id : null }, buttons);
    const el = label ? h('div', { class: 'seg-wrap' }, h('span', { class: 'seg-label', id }, label), group) : group;
    function set(v) {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === String(v))));
    }
    set(value);
    return { el, set, disable(off) { buttons.forEach((b) => { b.disabled = off; }); } };
  }

  const FEELS = [
    { value: '', label: 'Straight' },
    { value: 'd', label: 'Dotted' },
    { value: 't', label: 'Triplet' },
  ];

  /**
   * A note value as two plain controls: the division, then straight / dotted /
   * triplet. Reports one id ('1/8', '1/8d', '2bar'). Whole bars have no feel.
   */
  function noteValue({ value, divisions, bars = [], feels = true, onChange }) {
    let { base, feel } = WC.notes.split(value);
    const sel = select({
      options: bars.map((n) => ({ value: n + 'bar', label: WC.notes.label(n + 'bar') }))
        .concat(divisions.map((d) => ({ value: '1/' + d, label: '1/' + d }))),
      value: base,
      onChange: (v) => { base = v; emit(); },
    });
    const feelSeg = feels && seg({ options: FEELS, value: feel, onChange: (v) => { feel = v; emit(); } });
    function sync() { if (feelSeg) feelSeg.disable(/bar$/.test(base)); }
    function emit() { sync(); onChange(WC.notes.join(base, feels ? feel : '')); }
    sync();
    return {
      el: h('div', { class: 'note-value' }, sel, feelSeg && feelSeg.el),
      set(id) { ({ base, feel } = WC.notes.split(id)); sel.value = base; if (feelSeg) feelSeg.set(feel); sync(); },
    };
  }

  /**
   * A results table with fixed columns, so switching units or values never
   * shifts the layout. `cols` is [{label, width?, align?}] or plain labels.
   */
  function table(cols) {
    cols = cols.map((c) => (typeof c === 'object' ? c : { label: c }));
    const body = h('tbody');
    const el = h('div', { class: 'results' },
      h('table', {},
        h('colgroup', {}, cols.map((c) => h('col', { style: c.width ? 'width:' + c.width : null }))),
        h('thead', {}, h('tr', {}, cols.map((c) => h('th', {}, c.label)))),
        body));
    return { el, body, rows(html) { body.innerHTML = html.join(''); } };
  }

  function row(cells, cls) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' + cells.map((c) => '<td>' + c + '</td>').join('') + '</tr>';
  }

  /** Label / value pairs in a two-column results table. */
  function pairs() {
    const body = h('tbody');
    const el = h('div', { class: 'results' },
      h('table', { class: 'pairs' }, h('colgroup', {}, h('col'), h('col', { style: 'width:50%' })), body));
    return {
      el,
      set(list) {
        body.innerHTML = list.map(([k, v, cls]) =>
          '<tr' + (cls ? ' class="' + cls + '"' : '') + '><th scope="row">' + k + '</th><td>' + v + '</td></tr>').join('');
      },
    };
  }

  WC.ui = { h, block, field, fields, number, select, seg, noteValue, table, row, pairs, nextId };
})(window.WC);

/* Wave Calculator — UI kit.
 *
 * Small DOM builders the modes share, so a mode is mostly "which inputs, and
 * what to print". Each control takes a value and an onChange and hands back
 * its element (plus a setter where a mode needs to push a value in).
 */
(function (WC) {
  'use strict';

  let uid = 0;
  const nextId = (p) => 'td-' + (p || 'x') + '-' + ++uid;

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

  /** A titled card. Returns the <section>; append the mode's pieces to it. */
  function block(title, lede) {
    const id = nextId('h');
    return h('section', { class: 'block', 'aria-labelledby': id },
      h('h2', { id }, title),
      lede && h('p', { class: 'lede' }, lede));
  }

  /** Label + control, stacked. `hint` is a unit shown beside the label. */
  function field(label, control, hint) {
    const target = control.matches('input,select') ? control : control.querySelector('input,select');
    if (target && !target.id) target.id = nextId('f');
    return h('div', { class: 'field' },
      h('label', { for: target && target.id }, label, hint && h('span', { class: 'unit' }, ' ' + hint)),
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

  /** A select of note values (ids from WC.notes.list). */
  function noteSelect({ ids, value, onChange }) {
    const el = select({
      options: ids.map((id) => ({ value: id, label: WC.notes.label(id) })),
      value: ids.includes(value) ? value : ids[0],
      onChange,
    });
    el.classList.add('note-select');
    return el;
  }

  /** Segmented buttons. Returns {el, set(value)}. */
  function seg({ label, options, value, onChange }) {
    const id = nextId('seg');
    const buttons = options.map((o) =>
      h('button', { type: 'button', 'data-value': o.value, title: o.title,
        onclick: () => { set(o.value); onChange(o.value); } }, o.label));
    const el = h('div', { class: 'seg-wrap' },
      label && h('span', { class: 'seg-label', id }, label),
      h('div', { class: 'seg', role: 'group', 'aria-labelledby': label ? id : null }, buttons));
    function set(v) {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === String(v))));
    }
    set(value);
    return { el, set };
  }

  /** The big answer line: [{value, unit, label}] + a side note element. */
  function answer() {
    const figures = h('div', { class: 'figures' });
    const side = h('div', { class: 'side' });
    const el = h('div', { class: 'answer', 'aria-live': 'polite' }, figures, side);
    return {
      el,
      set(items, sideHtml) {
        figures.innerHTML = items.map((it) =>
          '<div class="figure">' +
            (it.label ? '<span class="fig-label">' + it.label + '</span>' : '') +
            '<span class="big">' + it.value + (it.unit ? '<span class="unit">' + it.unit + '</span>' : '') + '</span>' +
            (it.sub ? '<span class="fig-sub">' + it.sub + '</span>' : '') +
          '</div>').join('');
        side.innerHTML = sideHtml || '';
      },
    };
  }

  /** A scrolling table. Returns {el, rows(htmlRows)}. */
  function table(headers) {
    const body = h('tbody');
    const el = h('div', { class: 'table-scroll' },
      h('table', {}, h('thead', {}, h('tr', {}, headers.map((x) => h('th', {}, x)))), body));
    return { el, body, rows(html) { body.innerHTML = html.join(''); } };
  }

  function row(cells, cls) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' + cells.map((c) => '<td>' + c + '</td>').join('') + '</tr>';
  }

  /** Text that reads out when it changes. */
  function verdict() {
    return h('p', { class: 'verdict', 'aria-live': 'polite' });
  }

  WC.ui = { h, block, field, fields, number, select, noteSelect, seg, answer, table, row, verdict, nextId };
})(window.WC);

/*
 * editor.js — 例題設定エディタ（国・財の数、名前、数値表）
 * トップの「例題設定」とシミュレーションの「表を編集」で共用。
 */
(function (root) {
  'use strict';
  var TS = root.TS, M = TS.model, ui = TS.ui, h = ui.h;
  var uid = 0;

  /**
   * opts.onChange(sc)：入力が全部正しいときだけ呼ばれる
   * opts.layout：'home'（参考画像の3列配置）| 'stack'
   * opts.side：右側に置くノード（ボタン群など）
   */
  function ScenarioEditor(initial, opts) {
    opts = opts || {};
    var self = this;
    var id = 'ed' + (++uid);
    var draft = M.cloneScenario(initial);
    draft.table = draft.table.map(function (r) { return r.map(String); });
    var cellErr = {}; // "i,j" -> msg
    var el = h('div', { class: 'editor editor-' + (opts.layout || 'stack') });
    var errBox = h('div', { class: 'form-errors', role: 'status', 'aria-live': 'polite' });
    var headRefs = { prod: [], goods: [] };

    function toScenario() {
      var sc = M.cloneScenario(draft);
      sc.producers = sc.producers.map(function (s) { return s.trim(); });
      sc.goods = sc.goods.map(function (s) { return s.trim(); });
      sc.table = draft.table.map(function (r) { return r.map(function (v) { var p = M.parseCell(v); return p.ok ? p.value : v; }); });
      return sc;
    }
    function validate() {
      var sc = toScenario();
      var v = M.validateScenario(sc);
      ui.clear(errBox);
      if (!v.ok) errBox.appendChild(h('ul', null, v.errors.slice(0, 5).map(function (e) { return h('li', null, e); })));
      el.classList.toggle('has-error', !v.ok);
      if (opts.onValidity) opts.onValidity(v.ok);
      return v.ok ? sc : null;
    }
    function changed() {
      var sc = validate();
      if (sc && opts.onChange) opts.onChange(sc);
    }

    function sizeSelect(label, iconName, value, onPick) {
      var sid = id + '-' + iconName;
      var sel = h('select', { id: sid, class: 'select', on: { change: function () { onPick(Number(sel.value)); } } },
        [2, 3, 4].map(function (n) { return h('option', { value: String(n), selected: n === value }, String(n)); }));
      return h('div', { class: 'field-inline' }, ui.icon(iconName, 'ico-field'), h('label', { for: sid }, label), sel);
    }

    function nameRow(label, iconName, arr, key) {
      var inputs = arr.map(function (name, k) {
        var inp = h('input', {
          type: 'text', class: 'input', value: name, maxlength: String(M.LIMITS.maxLabel),
          'aria-label': label + (k + 1), autocomplete: 'off',
          on: {
            input: function () {
              draft[key][k] = inp.value;
              var ref = headRefs[key === 'producers' ? 'prod' : 'goods'][k];
              if (ref) ref.textContent = inp.value || '（空欄）';
              changed();
            }
          }
        });
        return inp;
      });
      return h('div', { class: 'name-row' },
        h('div', { class: 'name-label' }, ui.icon(iconName, 'ico-field'), h('span', null, label)),
        h('div', { class: 'name-inputs n' + arr.length }, inputs));
    }

    function tableEditor() {
      headRefs = { prod: [], goods: [] };
      var trh = h('tr', null, h('th', { class: 'corner', scope: 'col' }));
      draft.goods.forEach(function (g) { var th = h('th', { scope: 'col' }, g); headRefs.goods.push(th); trh.appendChild(th); });
      var tb = h('tbody');
      draft.producers.forEach(function (p, i) {
        var th = h('th', { scope: 'row' }, p); headRefs.prod.push(th);
        var tr = h('tr', null, th);
        draft.goods.forEach(function (g, j) {
          var inp = h('input', {
            type: 'text', inputmode: 'decimal', class: 'cell-input', value: String(draft.table[i][j]),
            'aria-label': function () { return draft.producers[i] + 'の' + draft.goods[j]; }(),
            on: {
              input: function () {
                draft.table[i][j] = inp.value;
                var r = M.parseCell(inp.value);
                inp.setAttribute('aria-invalid', r.ok ? 'false' : 'true');
                inp.classList.toggle('bad', !r.ok);
                changed();
              },
              focus: function () { inp.select(); }
            }
          });
          tr.appendChild(h('td', null, inp));
        });
        tb.appendChild(tr);
      });
      return h('div', { class: 'table-wrap' }, h('table', { class: 'data-table edit-table' },
        h('caption', { class: 'sr-only' }, '同じ労働量で作れる量の表（編集できます）'),
        h('thead', null, trh), tb));
    }

    function render() {
      ui.clear(el);
      var form = h('div', { class: 'ed-form' },
        h('div', { class: 'size-row' },
          sizeSelect('国・生産者の数', 'people', draft.producers.length, function (m) { resize(m, draft.goods.length); }),
          sizeSelect('生産物の数', 'cube', draft.goods.length, function (n) { resize(draft.producers.length, n); })),
        nameRow(draft.kind === 'countries' ? '国名' : '国・生産者名', 'pencil', draft.producers, 'producers'),
        nameRow('商品名', 'cube', draft.goods, 'goods'));
      var preview = h('div', { class: 'ed-preview' },
        h('div', { class: 'preview-label' }, h('strong', null, '入力イメージ'), h('span', null, '（同じ労働量で作れる量の例）')),
        tableEditor(), h('p', { class: 'muted small edit-hint' }, '表の数字をタップすると書きかえられます。'), errBox);
      el.appendChild(form);
      if (opts.layout === 'home') el.appendChild(h('div', { class: 'ed-divider', 'aria-hidden': 'true' }));
      el.appendChild(preview);
      if (opts.side) el.appendChild(opts.side);
      validate();
    }

    function resize(m, n) {
      var sc = toScenario();
      sc.table = draft.table;
      draft = M.resizeScenario(sc, m, n);
      draft.table = draft.table.map(function (r) { return r.map(String); });
      render();
      changed();
    }

    self.el = el;
    self.load = function (sc) {
      draft = M.cloneScenario(sc);
      draft.table = draft.table.map(function (r) { return r.map(String); });
      render();
      changed();
    };
    self.get = function () { return validate(); };
    self.draft = function () { return draft; };
    self.setMeta = function (meta) { Object.keys(meta).forEach(function (k) { draft[k] = meta[k]; }); changed(); };
    render();
  }

  TS.ScenarioEditor = ScenarioEditor;
})(window);

/*
 * page-misc.js — 学習結果
 */
(function (root) {
  'use strict';
  var TS = root.TS, ui = TS.ui, h = ui.h, Q = TS.quiz;

  function results(app) {
    var r = ui.store.get('results', null);
    // 壊れた保存データは使わない
    if (!r || typeof r !== 'object' || typeof r.title !== 'string' || !Array.isArray(r.records || [])) r = null;
    app.appendChild(ui.pageHead('学習結果', [{ text: '学習結果' }]));
    if (!r) {
      app.appendChild(h('div', { class: 'panel' }, h('p', null, 'まだ学習結果はありません。'),
        h('div', { class: 'inline wrap' }, h('a', { class: 'btn btn-primary', href: '#/study' }, '自習モードへ'), h('a', { class: 'btn btn-outline', href: '#/practice' }, '演習問題へ'))));
      return { title: '学習結果' };
    }
    var s = Q.summarize(r.records || []);
    var cs = r.checks ? Q.summarize(r.checks) : null;
    var terms = s.terms.slice();
    if (cs) cs.terms.forEach(function (t) { if (terms.indexOf(t) < 0) terms.push(t); });

    function stat(label, val, sub) { return h('div', { class: 'stat' }, h('span', { class: 'stat-label' }, label), h('span', { class: 'stat-val' }, val), sub ? h('span', { class: 'stat-sub' }, sub) : null); }

    var rows = (r.records || []).filter(function (x) { return x && !x.skipped; }).map(function (x, k) {
      return h('tr', null, h('td', null, String(k + 1)), h('td', null, x.categoryName + (x.similar ? '（にた問題）' : '')),
        h('td', null, Q.recordLabel(x)), h('td', null, String(x.hints || 0)), h('td', { class: 'prompt-cell' }, x.prompt));
    });

    var text = [];
    text.push('【学習結果】' + r.title + '　' + r.date);
    if (cs) text.push('確認問題：' + cs.answered + '問中 1回目で正解 ' + cs.firstTry + '問');
    text.push('演習：' + s.answered + '問　1回目で正解 ' + s.firstTry + '問／ヒント使用 ' + s.hints + '回／再挑戦 ' + s.retries + '回／解説で確認 ' + s.revealed + '問' + (s.similar ? '／にた問題 ' + s.similar + '問' : ''));
    Object.keys(s.byCat).forEach(function (c) { text.push('  ' + c + '：' + s.byCat[c].n + '問中 1回目で正解 ' + s.byCat[c].first + '問'); });
    if (r.experiment) text.push('実験：両方ふやす配分 ' + (r.experiment.goal ? 'できた' : '未') + '／完全分業の確認 ' + (r.experiment.spec ? 'した' : '未'));
    if (r.predictions && r.predictions.q1) text.push('予想：分担の意味は「' + r.predictions.q1 + '」、Aさんの担当は「' + (r.predictions.q2 || '') + '」');
    text.push('学んだ用語：' + terms.join('・'));
    if (r.reflection) text.push('最後の問いへの答え：' + r.reflection);
    if (r.seed) text.push('問題番号：' + r.seed);

    ui.append(app, [
      h('div', { class: 'panel result-panel' },
        h('p', { class: 'result-title' }, r.title, h('span', { class: 'muted small' }, '　' + r.date + (r.minutes >= 1 && r.minutes <= 120 ? '・約' + r.minutes + '分' : ''))),
        cs ? h('div', { class: 'stats' },
          stat('確認問題', cs.answered + '問', '1回目で正解 ' + cs.firstTry + '問'),
          r.experiment ? stat('配分の実験', r.experiment.goal ? 'できた' : 'まだ', r.experiment.spec ? '完全分業も確認' : '') : null) : null,
        h('div', { class: 'stats' },
          stat('解いた問題', s.answered + '問', s.similar ? 'うち、にた問題 ' + s.similar + '問' : null),
          stat('1回目で正解', s.firstTry + '問'),
          stat('ヒントを見た', s.hints + '回'),
          stat('再挑戦', s.retries + '回'),
          stat('解説で確認', s.revealed + '問')),
        h('p', { class: 'muted small' }, '「最終的に全部できたか」だけでなく、どこでヒントを使ったかも大事な記録です。ヒントや解説を使って理解できたなら、それで十分です。'),
        rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table rec-table' },
          h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, '分野'), h('th', null, '結果'), h('th', null, 'ヒント'), h('th', null, '問題'))),
          h('tbody', null, rows))) : null,
        h('p', null, h('strong', null, '学んだ用語：'), terms.join('・') || '—'),
        r.reflection ? h('div', { class: 'study-card info' }, h('p', null, h('strong', null, '最後の問いへの自分の答え：')), h('p', null, r.reflection)) : null),
      h('div', { class: 'inline wrap next-row no-print' },
        h('button', { type: 'button', class: 'btn btn-primary', on: { click: ui.printPage } }, ui.icon('print'), '印刷・PDFで保存'),
        h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { ui.copyText(text.join('\n')); } } }, ui.icon('copy'), 'テキストをコピー'),
        r.retry ? h('a', { class: 'btn btn-outline', href: r.retry }, ui.icon('reset'), 'もう一度') : null,
        h('a', { class: 'btn btn-ghost', href: '#/' }, ui.icon('home'), 'ホームへ')),
      h('p', { class: 'muted small no-print' }, '提出が必要なときは「印刷・PDFで保存」でPDFにして、学校の提出システム（Classroomなど）にアップロードしてください。このアプリから先生に自動で送られることはありません。結果はこの端末にだけ保存されます。')
    ]);
    return { title: '学習結果' };
  }

  TS.pages = TS.pages || {};
  TS.pages.results = results;
})(window);

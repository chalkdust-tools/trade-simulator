/*
 * page-misc.js — 学習結果／使い方
 */
(function (root) {
  'use strict';
  var TS = root.TS, ui = TS.ui, h = ui.h, Q = TS.quiz;

  function results(app) {
    var r = ui.store.get('results', null);
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
      return h('tr', null, h('td', null, String(k + 1)), h('td', null, x.categoryName + (x.similar ? '（類題）' : '')),
        h('td', null, Q.recordLabel(x)), h('td', null, String(x.hints || 0)), h('td', { class: 'prompt-cell' }, x.prompt));
    });

    var text = [];
    text.push('【学習結果】' + r.title + '　' + r.date);
    if (cs) text.push('確認問題：' + cs.answered + '問中 1回目で正解 ' + cs.firstTry + '問');
    text.push('演習：' + s.answered + '問　1回目で正解 ' + s.firstTry + '問／ヒント使用 ' + s.hints + '回／再挑戦 ' + s.retries + '回／解説で確認 ' + s.revealed + '問' + (s.similar ? '／類題 ' + s.similar + '問' : ''));
    Object.keys(s.byCat).forEach(function (c) { text.push('  ' + c + '：' + s.byCat[c].n + '問中 1回目で正解 ' + s.byCat[c].first + '問'); });
    if (r.experiment) text.push('実験：両方ふやす配分 ' + (r.experiment.goal ? 'できた' : '未') + '／完全分業の確認 ' + (r.experiment.spec ? 'した' : '未'));
    if (r.predictions && r.predictions.q1) text.push('予想：分担の意味は「' + r.predictions.q1 + '」、Aさんの担当は「' + (r.predictions.q2 || '') + '」');
    text.push('学んだ用語：' + terms.join('・'));
    if (r.reflection) text.push('最後の問いへの答え：' + r.reflection);
    if (r.seed) text.push('問題番号：' + r.seed);

    ui.append(app, [
      h('div', { class: 'panel result-panel' },
        h('p', { class: 'result-title' }, r.title, h('span', { class: 'muted small' }, '　' + r.date + (r.minutes ? '・約' + r.minutes + '分' : ''))),
        cs ? h('div', { class: 'stats' },
          stat('確認問題', cs.answered + '問', '1回目で正解 ' + cs.firstTry + '問'),
          r.experiment ? stat('配分の実験', r.experiment.goal ? 'できた' : 'まだ', r.experiment.spec ? '完全分業も確認' : '') : null) : null,
        h('div', { class: 'stats' },
          stat('解いた問題', s.answered + '問', s.similar ? 'うち類題 ' + s.similar + '問' : null),
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

  function howto(app) {
    function block(title, items) { return h('div', { class: 'panel howto' }, h('h3', null, title), h('ul', null, items.map(function (i) { return h('li', null, i); }))); }
    ui.append(app, [
      ui.pageHead('使い方', [{ text: '使い方' }]),
      ui.section('生徒のみなさんへ', h('div', null,
        block('はじめて使うとき', ['トップの「はじめる」を押すと、自習モードが始まります。', '入門コース（計算少なめ）か標準コース（機会費用を計算）を選びます。', '画面の問いに答えて「次へ」を押していけば、最後に学習結果が出ます。']),
        block('まちがえたとき', ['まちがえるとヒントが出ます。ヒントを読んでもう一度答えよう。', 'わからないときは「答えと解説を見る」で解説を読んでから進めます。', '「類題でもう一度」で、数字を変えた似た問題に挑戦できます。']),
        block('結果の提出', ['学習結果の画面で「印刷・PDFで保存」を押し、PDFを学校の提出先にアップロードします。', '記録はこの端末のブラウザにだけ残ります。共有の端末では、使い終わったらトップ下の「学習記録を削除」を押してください。']))),
      ui.section('授業での使い方（先生向け）', h('div', null,
        block('導入5分の提示', ['トップの「教師向け設定」→「授業導入5分」で、例題の表・配分スライダー・結果比較を1画面で見せられます。', '「表の左側の人は両方たくさん作れる。それでも分担する意味は？」と予想させてから操作すると効果的です。']),
        block('個人演習・自習課題', ['「おまかせ自習30分」「入門10問」「標準5問」のリンクをそのまま生徒に配れます。', '演習問題は「問題番号」が同じなら同じ問題が出ます。演習問題の画面で、リンクのコピーやA4プリント（問題と解答を別紙）ができます。', '例題（国・財の数、名前、数値）はトップの「例題設定」で変えられます。2×2の例題は、演習問題の「例題設定の表を使う」で問題にできます。']),
        block('知っておいてほしいこと', ['アカウントやログインはありません。生徒の解答が先生に自動で送られることもありません。', '保存はすべてブラウザ内（localStorage）です。別の端末には引き継がれません。', '3か国以上・3財以上では、「どこが何を作るべきか」を自動で1つに決めることはしません（何を最大化するかの条件が必要なため）。2つずつ選んで比べる形にしています。']))),
      ui.section('モデルの前提と、今後の予定', h('div', null,
        block('このアプリの計算モデル', ['表の数値は「同じ労働量をすべてその商品に使ったときに作れる量」です。', '生産性は一定、労働は自由に分けられる、規模に関して収穫一定、という簡略なモデルです。', '機会費用は「1個つくるときにあきらめる別の商品の量」＝（もう一方の生産量）÷（その商品の生産量）で計算し、分数のまま正確に比べています。']),
        block('第2段階・第3段階で追加予定（今は使えません）', ['必要労働時間の表（1個つくるのに何時間か）への切りかえ', '機会費用が同じ場合・逆算・交換比率・貿易後の消費などの問題', '例題の共有リンク・JSONの書き出し／読み込み、復習モード', '賃金・輸送費・関税・為替を加えた発展問題'])))
    ]);
    return { title: '使い方' };
  }

  TS.pages = TS.pages || {};
  TS.pages.results = results;
  TS.pages.howto = howto;
})(window);

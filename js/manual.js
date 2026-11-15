/*
 * manual.js — 使い方マニュアル（生徒向けてびき／先生向けマニュアル）
 *  - 画面表示とA4印刷（PDF保存）で同じ内容を使う
 *  - 文中の［ボタン名］は、本物のボタンに似た見た目で表示する
 *  - 画面写真は img/manual/ にある（tools/manual-shots.js で撮り直せる）
 */
(function (root) {
  'use strict';
  var TS = root.TS, ui = TS.ui, h = ui.h;

  /* ---------- 内容 ---------- */
  var STUDENT = {
    id: 'student',
    title: '生徒向けてびき',
    lead: '先生から配られたリンクを開いて、ひとりで進めるための説明です。',
    parts: [
      {
        heading: 'はじめ方',
        steps: [
          { title: 'リンクを開く', text: ['先生から配られたリンク（Classroomなど）を押すと、アプリの画面が開きます。', 'ログインや名前の入力はいりません。'] },
          { title: '［▶ はじめる］を押す', text: ['トップページのいちばん上にある、青い大きなボタンです。', '先生のリンクによっては、このあとの画面から始まることもあります。'], img: 'top.jpg', alt: 'トップページ。タイトルの下に「はじめる」「例題から始める」「使い方」のボタンがある' },
          { title: 'コースと時間を選ぶ', text: ['先に「時間」（約15分か約30分）を選んでから、コースのボタンを押します。', '［入門コース］…計算は少なめ。選んで答える問題が中心。', '［標準コース］…機会費用を自分で計算します。', '先生から指定があれば、それにしたがってください。'], img: 'course.jpg', alt: 'コースを選ぶ画面。時間の選択と、入門コース・標準コースのボタン' }
        ]
      },
      {
        heading: '進め方',
        steps: [
          { title: '問いに答えて［次へ ›］を押す', text: ['画面の上に「ステップ 3 / 8」のように、今どこまで進んだかが出ます。', '［次へ ›］がうすい色で押せないときは、まだ答えていない問いがあります。ボタンの近くに理由が出ます。'] },
          { title: 'まちがえたときは、ヒントを読む', text: ['まちがえると、黄色い「ヒント」が出ます。読んで、もう一度答えよう。', '何回かまちがえると、正しい答えと解説が出ます。そのまま先に進めます。', 'わからないときは、［答えと解説を見る］を押してもかまいません。', '［にた問題でもう一度］で、数字を変えた問題にもう一度挑戦できます。'], img: 'hint.jpg', alt: '問題でまちがえたあとの画面。選んだ答えに線が引かれ、黄色いヒントが表示されている' },
          { title: '数字で答える問題', text: ['答えは、小数（0.5）でも分数（1/2）でも大丈夫です。', 'スマホやタブレットで「/」が打てないときは、［分数の「/」］ボタンを押します。', '割り切れないときは、分数のまま（2/3）か、小数第2位まで（0.67）で答えます。'] },
          { title: '［学習結果を見る］', text: ['最後まで進むと、学習結果が出ます。何問をどのように解いたかが分かります。', 'ヒントや解説を使ったことは、悪いことではありません。どこでつまずいたかの大切な記録です。'], img: 'results.jpg', alt: '学習結果の画面。解いた問題の数、1回目で正解した数、ヒントを見た回数などが並んでいる' }
        ]
      },
      {
        heading: '提出のしかた（先生に言われたとき）',
        steps: [
          { title: '［印刷・PDFで保存］を押す', text: ['学習結果の画面の下にあるボタンです。', '印刷の画面が出たら、送り先（プリンター）を「PDFに保存」にして保存します。', 'iPadやiPhoneでは、印刷画面で共有ボタンを押すとPDFにできます。'] },
          { title: 'PDFを提出する', text: ['保存したPDFを、Classroomなど先生が指定した場所に出します。', 'このアプリから先生に自動で送られることはありません。'] },
          { title: '［テキストをコピー］も使えます', text: ['結果を文字でコピーできます。Classroomのコメント欄などに貼り付ける（Ctrl＋V）こともできます。'] }
        ]
      },
      {
        heading: '困ったとき',
        steps: [
          { title: '途中でやめた・画面を閉じた', text: ['同じ端末で、もう一度リンクを開くと［続きから］が出ます。', 'ちがう端末（家のスマホなど）には、続きは引きつがれません。'] },
          { title: '画面が動かない・真っ白', text: ['ブラウザの再読み込みボタン（↻）を押してください。進み具合は残っています。'] },
          { title: '最初からやり直したい', text: ['自習モードを開くと出る［最初からやり直す］を押します。'] },
          { title: 'みんなで使う端末のとき', text: ['使い終わったら、トップページのいちばん下の［学習記録を削除］を押してください。'] }
        ]
      }
    ]
  };

  var TEACHER = {
    id: 'teacher',
    title: '先生向けマニュアル',
    lead: '授業で使うための準備と、課題の配り方・プリントの作り方の説明です。操作はすべてクリック（タップ）だけでできます。',
    parts: [
      {
        heading: 'このアプリでできること',
        steps: [
          { title: '3つの使い方', text: ['導入5分の提示：例題の表と、時間の配分を変えるつまみを、大きな画面で見せる。', '自習課題：リンクを配るだけで、生徒がひとりで15〜30分進める（ヒント・解説つき）。', 'プリント：演習問題をA4で印刷する。問題と解答・解説は別の紙になる。'] },
          { title: '知っておいてほしいこと', text: ['アカウント・ログイン・パスワードはありません。生徒の名前も入力しません。', '生徒の解答が先生に自動で送られることはありません。提出はPDFで受け取ります（下の「提出の受け取り方」）。', '記録は、使っているパソコン・タブレットのブラウザの中だけに保存されます。別の端末には引きつがれません。'] }
        ]
      },
      {
        heading: '自習課題・演習プリントをつくる（いちばんかんたんな使い方）',
        steps: [
          { title: '［課題・プリントをつくる］を開く', text: ['トップページの「先生の方へ」にある青いボタンです。「授業での使い方」の帯を押しても開きます。'] },
          { title: '難易度を選ぶ', text: ['［入門］…計算は少なめ。選んで答える問題が中心。', '［標準］…機会費用などの計算あり。迷ったら、まずは入門がおすすめです。'], img: 'teacher.jpg', alt: '課題・プリントをつくる画面。難易度（入門・標準）と、「自習課題をつくる」「演習プリントをつくる」の大きなボタン' },
          { title: '自習課題：［自習課題をつくる］を押すだけ', text: ['押した時点で、課題のリンクがコピーされています（緑の枠に「コピーしました」と出ます）。', 'Classroomの投稿やメッセージの入力欄をクリックして、Ctrl＋V（Macは⌘＋V）で貼り付けて配ります。', '時間が足りないときは［短い版（約15分）にする］を押すと、15分版のリンクがコピーされます。', '配る前に［開いて確かめる］で一度見ておくと安心です。'] },
          { title: '演習プリント：［演習プリントをつくる］を押す', text: ['10問のプリントができます。［問題プリントを印刷］と［解答・解説を印刷］で、別々の紙に印刷できます。', 'PDFにしたいときは、印刷画面の送り先を「PDFに保存」にします。', '［5問］［20問］で問題数を変えられます。［別の問題に作り直す］で、ちがう数字の問題になります。', '同じ問題を画面で解かせたいときは、［リンクをコピー］で配れます（ヒント・解説つき）。'], img: 'sheet.jpg', alt: '演習プリントを作ったあとの画面。問題プリントを印刷、解答・解説を印刷のボタンと、リンクをコピーのボタンがある' }
        ]
      },
      {
        heading: '例題を自分で決める（必要なときだけ）',
        steps: [
          { title: 'トップページの「例題設定」で入力する', text: ['［国・生産者の数］と［生産物の数］で、表の大きさ（2〜4）を選びます。', '国・人の名前、商品名を書きかえます。', '表の数字は、マスを押すと書きかえられます。数字は「時間をすべてその商品に使ったときに作れる量」です。', '赤くなったマスは、入力にまちがいがあります（0やマイナス、文字など）。下に理由が出ます。'], img: 'example.jpg', alt: '例題設定の欄。国・生産者の数、生産物の数、名前の入力欄、数字の表、「この設定で始める」ボタンがある' },
          { title: '［▶ この設定で始める］で、授業で見せる', text: ['シミュレーションの画面に進み、その表で時間の配分を試せます。', '［詳細設定を開く］→［この例題を保存］で、この端末に保存しておけます。［初期値に戻す］で授業プリントのAさん・Bさんに戻ります。'] },
          { title: 'その例題でプリントを作る', text: ['「課題・プリントをつくる」の下の［細かく決めて作る］を開き、「トップで作った例題の表を使う」を選びます（国・商品が2つずつの例題のとき）。', '出題範囲や問題番号も、ここで細かく選べます。'] }
        ]
      },
      {
        heading: '提出の受け取り方',
        steps: [
          { title: '生徒に伝えること', text: ['「最後の学習結果の画面で［印刷・PDFで保存］を押して、PDFをClassroomに出してください」と伝えます。', '生徒向けてびき（このページの上の［生徒向けてびき］）を印刷して配ることもできます。リンクで配る場合は［このページのリンクをコピー］を使います。'] },
          { title: '結果の見方', text: ['解いた問題の数、1回目で正解した数、ヒントを見た回数、再挑戦の回数、解説で確認した問題の数が出ます。', '「最後に全部できたか」だけでなく、どこでヒントを使ったかを見ると、つまずきが分かります。'] }
        ]
      },
      {
        heading: '困ったとき・注意',
        steps: [
          { title: '共有の端末を使うとき', text: ['前の人の記録が残っていることがあります。使い終わったら、トップページのいちばん下の［学習記録を削除］を押してもらいます（作った例題は消えません）。'] },
          { title: '画面がおかしいとき', text: ['再読み込み（↻）を押してください。直らないときは［学習記録を削除］を押してから開き直します。'] },
          { title: '3つ以上の国・商品の例題について', text: ['国や商品が3つ以上のとき、「どこが何を作るのが一番よいか」は、何をどれだけ必要とするかで答えが変わります。そのため、アプリは自動で判定しません。2つの国と2つの商品を選んで比べる形にしています。'] },
          { title: '計算のしくみ', text: ['「作れる量は使った時間に比例する」という単純なルールで計算しています。', '機会費用＝（もう一方の商品の生産量）÷（その商品の生産量）。分数のまま正確に比べています。', '完全に分業しても、両方の商品の合計がかならず増えるとはかぎりません（初期例題では商品Bが4.5個から4個に減ります）。アプリもそのように表示します。'] },
          { title: '今後追加する予定のもの（今は使えません）', text: ['「1個つくるのに何時間かかるか」の表、交換比率・貿易後の消費などの問題、作った例題をリンクで配る機能、賃金・輸送費・関税・為替を加えた発展問題。'] }
        ]
      }
    ]
  };

  /* ---------- 表示 ---------- */
  /** 文中の［…］をボタン風に、それ以外は文字として */
  function rich(text) {
    var out = [];
    var re = /［(.+?)］/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push(h('span', { class: 'btn-chip' }, m[1]));
      last = re.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  function renderManual(doc, opts) {
    opts = opts || {};
    var n = 0;
    var wrap = h('div', { class: 'manual manual-' + doc.id + (opts.print ? ' sheet' : '') });
    if (opts.print) {
      wrap.appendChild(h('header', { class: 'sheet-head' },
        h('p', { class: 'sheet-kicker' }, '比較生産費説シミュレーター'),
        h('h1', null, doc.title),
        h('p', { class: 'sheet-meta' }, doc.lead)));
    } else {
      wrap.appendChild(h('p', { class: 'lead' }, doc.lead));
    }
    doc.parts.forEach(function (part) {
      var sec = h('section', { class: 'man-part' }, h('h2', { class: opts.print ? 'man-h' : 'sec-title' }, part.heading));
      var ol = h('ol', { class: 'man-steps' });
      part.steps.forEach(function (st) {
        n++;
        var li = h('li', { class: 'man-step' + (st.img ? ' has-img' : '') },
          h('div', { class: 'man-text' },
            h('h3', null, h('span', { class: 'num' }, String(n)), h('span', null, rich(st.title))),
            st.text.map(function (t) { return h('p', null, rich(t)); })));
        if (st.img) {
          li.appendChild(h('figure', { class: 'man-fig' },
            h('img', { src: 'img/manual/' + st.img, alt: st.alt || '', loading: opts.print ? 'eager' : 'lazy' })));
        }
        ol.appendChild(li);
      });
      sec.appendChild(ol);
      wrap.appendChild(sec);
    });
    if (opts.print) wrap.appendChild(h('p', { class: 'sheet-foot' }, '画面は作成時のものです。実際の画面と少しちがうことがあります。'));
    return wrap;
  }

  /** 印刷：画像の読み込みを待ってから印刷する */
  function printManual(doc) {
    var node = renderManual(doc, { print: true });
    var imgs = Array.prototype.slice.call(node.querySelectorAll('img'));
    var holder = document.getElementById('print-root');
    ui.clear(holder);
    holder.appendChild(node);
    var waits = imgs.map(function (im) {
      return im.complete ? Promise.resolve() : new Promise(function (r) { im.onload = im.onerror = r; });
    });
    Promise.all(waits).then(function () { ui.printSheet(node); });
  }

  function page(app, params) {
    var tab = params.for === 'teacher' ? 'teacher' : 'student';
    app.appendChild(ui.pageHead('使い方・マニュアル', [{ text: '使い方・マニュアル' }]));
    var tabs = h('div', { class: 'tabs no-print', role: 'tablist', 'aria-label': 'マニュアルの種類' });
    var body = h('div', { role: 'tabpanel' });
    var tools = h('div', { class: 'man-tools no-print' });
    var docs = { student: STUDENT, teacher: TEACHER };

    function draw() {
      ui.clear(tabs); ui.clear(body); ui.clear(tools);
      ['student', 'teacher'].forEach(function (k) {
        tabs.appendChild(h('button', {
          type: 'button', role: 'tab', class: 'tab' + (k === tab ? ' active' : ''), 'aria-selected': k === tab ? 'true' : 'false',
          on: { click: function () { tab = k; history.replaceState(null, '', '#/howto?for=' + k); draw(); } }
        }, k === 'student' ? '生徒向けてびき' : '先生向けマニュアル'));
      });
      var doc = docs[tab];
      ui.append(tools, [
        h('button', { type: 'button', class: 'btn btn-primary', on: { click: function () { printManual(doc); } } }, ui.icon('print'), 'この' + (tab === 'student' ? 'てびき' : 'マニュアル') + 'を印刷・PDFで保存'),
        h('button', { type: 'button', class: 'btn btn-outline', on: { click: function () { ui.copyText(location.href.split('#')[0] + '#/howto?for=' + tab); } } }, ui.icon('copy'), 'このページのリンクをコピー'),
        h('p', { class: 'muted small' }, 'PDFにするときは、印刷画面の送り先（プリンター）を「PDFに保存」にします。A4縦で印刷されます。')
      ]);
      body.appendChild(renderManual(doc));
    }
    draw();
    ui.append(app, [tabs, tools, body]);
    return { title: '使い方・マニュアル' };
  }

  TS.manual = { STUDENT: STUDENT, TEACHER: TEACHER, renderManual: renderManual, printManual: printManual };
  TS.pages = TS.pages || {};
  TS.pages.howto = page;
})(window);

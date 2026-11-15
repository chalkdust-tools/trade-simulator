/*
 * fraction.js — 厳密な分数計算（整数の分子・分母）
 * 1/2 や 2/3 を浮動小数の誤差なしで扱うための小さなクラス。
 * ブラウザでは window.TS.Frac、Node では module.exports で使える。
 */
(function (root) {
  'use strict';

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  function Frac(n, d) {
    if (d === undefined) d = 1;
    if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error('Frac: 整数ではありません ' + n + '/' + d);
    if (d === 0) throw new Error('Frac: 分母が0です');
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1;
    this.n = n / g;
    this.d = d / g;
  }

  /** 数値（小数第4位まで）・分数・整数から Frac を作る */
  Frac.from = function (x) {
    if (x instanceof Frac) return x;
    if (typeof x !== 'number' || !isFinite(x)) throw new Error('Frac.from: 有限の数ではありません');
    if (Number.isInteger(x)) return new Frac(x, 1);
    // 小数：小数点以下の桁数ぶん10倍して整数化（入力は小数第2位までに制限している）
    for (var k = 1; k <= 6; k++) {
      var p = Math.pow(10, k);
      var m = Math.round(x * p);
      if (Math.abs(m / p - x) < 1e-12) return new Frac(m, p);
    }
    var P = 1000000;
    return new Frac(Math.round(x * P), P);
  };

  Frac.prototype.add = function (o) { o = Frac.from(o); return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); };
  Frac.prototype.sub = function (o) { o = Frac.from(o); return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); };
  Frac.prototype.mul = function (o) { o = Frac.from(o); return new Frac(this.n * o.n, this.d * o.d); };
  Frac.prototype.div = function (o) { o = Frac.from(o); return new Frac(this.n * o.d, this.d * o.n); };
  /** -1, 0, 1 */
  Frac.prototype.cmp = function (o) { o = Frac.from(o); var l = this.n * o.d, r = o.n * this.d; return l < r ? -1 : (l > r ? 1 : 0); };
  Frac.prototype.eq = function (o) { return this.cmp(o) === 0; };
  Frac.prototype.isInteger = function () { return this.d === 1; };
  Frac.prototype.toNumber = function () { return this.n / this.d; };
  Frac.prototype.valueOf = function () { return this.n / this.d; };
  /** "1/2"、"3" のような表記 */
  Frac.prototype.toFracString = function () { return this.d === 1 ? String(this.n) : this.n + '/' + this.d; };
  /** 小数第 digits 位までで丸めた表記（末尾の0は省く） */
  Frac.prototype.toDecimalString = function (digits) {
    if (digits === undefined) digits = 2;
    var v = this.toNumber();
    var p = Math.pow(10, digits);
    var r = Math.round(v * p + (v >= 0 ? 1e-9 : -1e-9)) / p;
    var s = r.toFixed(digits);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s;
  };
  /** 小数で割り切れるか（分母が2と5だけ） */
  Frac.prototype.isTerminating = function () {
    var d = this.d;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    return d === 1;
  };
  /**
   * 表示用（丸めた数を、丸めていないように見せない）
   *   整数 → "3"、小数第2位までで割り切れる → "0.5" "8.65"
   *   分母が小さく、それ以上の桁で割り切れる → "1/8（0.125）"
   *   分母が小さく、割り切れない → "2/3（約0.67）"
   *   分母が大きい → "約0.74"
   */
  Frac.prototype.toDisplay = function () {
    if (this.d === 1) return String(this.n);
    var v = this.toNumber();
    var exact2 = this.isTerminating() && Math.abs(Number(this.toDecimalString(2)) - v) < 1e-12;
    if (exact2) return this.toDecimalString(2);
    // 割り切れて、小数第6位までに収まるなら正確な小数（例 0.125、0.004）
    var exactDec = (this.isTerminating() && Math.abs(Number(this.toDecimalString(6)) - v) < 1e-12) ? this.toDecimalString(6) : null;
    // 近似：0.1以上は小数第2位まで。0.1未満は「0」に丸めないよう、0でない数字を2けた（例 約0.0033）
    var approx = Math.abs(v) >= 0.1 ? this.toDecimalString(2) : Number(v.toPrecision(2)).toString();
    if (this.d <= 20 || Math.abs(v) < 0.1) return this.toFracString() + (exactDec ? '（' + exactDec + '）' : '（約' + approx + '）');
    return exactDec || ('約' + approx);
  };
  Frac.prototype.toString = function () { return this.toFracString(); };

  Frac.gcd = gcd;

  if (typeof module !== 'undefined' && module.exports) module.exports = Frac;
  else { root.TS = root.TS || {}; root.TS.Frac = Frac; }
})(typeof window !== 'undefined' ? window : this);

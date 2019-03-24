'use strict';

// Declare the dictionary:
var languages = {
  'eng': {},
  'jpn_h': {},
  'jpn_k': {},
}

// Setup English:
for (let c of 'abcdefghijklmnopqrstuvwxyz') {
  languages['eng'][c] = c;
}

// Setup Japanese romanization:
let jpn_r = [];
for (let cons of ['', ...'kstnhmrgzdbp'])
  for (let vow of 'aiueo')
    jpn_r.push(cons + vow);
jpn_r[11] = 'shi';
jpn_r[16] = 'chi';
jpn_r[17] = 'tsu';
jpn_r[27] = 'fu';
jpn_r[46] = 'ji';
jpn_r[51] = 'ji';
jpn_r[52] = 'zu';
jpn_r.push('ya', 'yu', 'yo', 'wa', 'wo', 'n');
// Setup Japanese Hiragana:
[...'あいうえおかきくけこさしすせそ',
 ...'たちつてとなにぬねのはひふへほ',
 ...'まみむめもらりるれろがぎぐげご',
 ...'ざじずぜぞだぢづでどばびぶべぼ',
 ...'ぱぴぷぺぽやゆよわをん',
 ].forEach((c, i) => languages['jpn_h'][c] = jpn_r[i]);
// Setup Japanese Katakana:
[...'アイウエオカキクケコサシスセソ',
 ...'タチツテトナニヌネノハヒフヘホ',
 ...'マミムメモラリルレロガギグゲゴ',
 ...'ザジズゼゾダヂヅデドバビブベボ',
 ...'パピプペポヤユヨワヲン',
 ].forEach((c, i) => languages['jpn_k'][c] = jpn_r[i]);

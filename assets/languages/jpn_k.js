'use strict';

/* Used to create an instance of the language
 * interpreter defined in this file.
 */
const createLanguageInterpreter = () => {
  return new JapaneseKatakanaInterpreter();
}

/* 
 * 
 */
class JapaneseKatakanaInterpreter {
  constructor() {
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
    
    this.k2s = new Map();
    
    // Setup Japanese Katakana:
    [...'アイウエオカキクケコサシスセソ',
     ...'タチツテトナニヌネノハヒフヘホ',
     ...'マミムメモラリルレロガギグゲゴ',
     ...'ザジズゼゾダヂヅデドバビブベボ',
     ...'パピプペポヤユヨワヲン',
     ].forEach((c, i) => {
        this.k2s.set(c) = jpn_r[i];
      });
  }
  
  /* Takes a character/letter from this language's
   * character set, and returns the sequence of key-
   * board presses required to match that character.
   * May throw an exception if the character argument
   * is not from this language.
   */
  key2seq(key) {
    return this.k2s.get(key);
  }
  
  /* Returns a safe copy of an iterable collection
   * containing all keys from this language.
   */
  allKeys() {
    return null;
  }
}

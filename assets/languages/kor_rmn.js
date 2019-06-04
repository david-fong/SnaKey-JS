'use strict';

/* Used to create an instance of the language
 * interpreter defined in this file.
 */
const createLanguageInterpreter = () => {
  return new KoreanRomanizationInterpreter();
}

/* 
 * 
 */
class KoreanRomanizationInterpreter {
  constructor() {
    
  }
  
  /* Takes a character/letter from this language's
   * character set, and returns the sequence of key-
   * board presses required to match that character.
   * May throw an exception if the character argument
   * is not from this language.
   */
  key2seq(key) {
    let seq = '';
    
    
    
    return seq;
  }
  
  /* Returns a safe copy of an iterable collection
   * containing all keys from this language.
   */
  allKeys() {
    return null;
  }
}

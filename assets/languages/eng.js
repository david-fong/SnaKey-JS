'use strict';

/* 
 * 
 */
class EnglishInterpreter {
  constructor() {
    // Nothing needs to be done!
  }
  
  /* Takes a character/letter from this language's
   * character set, and returns the sequence of key-
   * board presses required to match that character.
   * May throw an exception if the character argument
   * is not from this language.
   */
  key2seq(key) {
    return key;
  }
  
  /* Returns a safe copy of an iterable collection
   * containing all keys from this language.
   */
  allKeys() {
    return [...'abcdefghijklmnopqrstuvwxyz'];
  }
  
  get langName() { return 'English'; }
}

INTERPRETERS.register(EnglishInterpreter);

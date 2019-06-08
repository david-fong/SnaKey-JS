'use strict';

/* Used to track how frequently language characters
 * have been spawned into a game's grid relative to 
 * one another. This information is used to balance
 * the frequency of character spawns.
 */
class Population {
  constructor(game) {
    this.game = game;
    this.restart();
  }
  
  restart() {
    const startPool = this.game.language.allKeys(); // <- can also handle strings
    startPool.sort((a, b) => 0.5 - Math.random());
    this.pools = [startPool, ];
  }
  
  shuffleChoice() {
    
  }
}

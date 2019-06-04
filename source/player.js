'use strict';

/* Object keys:
 * -- game          : Game
 * -- num           : number
 * -- score_        : <span>
 * -- isDead        : boolean
 *
 * -- pos           : Pos
 * -- trail         : array[Pos]
 * -- moveStr       : string
 *
 * -- startTime     : number
 * -- timeDeltas    : array[number]
 */
class Player {
  constructor(game, num) {
    this.game   = game;
    this.num    = num;
    this.trail = new Trail();
    this.score_ = game.makeScoreElement('score' + this.num);
  }
  
  /* Resets all fields including position:
   */
  restart() {
    this.score_.innerHTML = 0;
    this.trail.clear();
    this.moveStr    = '';
    this.startTime  = (new Date()).getSeconds();
    this.timeDeltas = [];
    this.isDead     = false;
    
    // Spawn the player:
    const middle   = Math.floor(this.game.width / 2);
    const spawnPos = new Pos(middle - this.num, middle);
    this.pos       = spawnPos;
    this.moveOnto(spawnPos);
    this.game.tileAt(this.pos).opacity = 1;
  }
  
  /* Handles player input, translating it to movement:
   */
  move(key) {
    if (this.isDead) return;
    
    // If the player wants to backtrack:
    if (Player.backtrackKeys.has(key)) {
      // Fail if the trail is empty or choked by an enemy:
      if (this.trail.empty || this.game.isCharacter(
          this.game.tileAt(this.trail.newest))) { return; }
      this.moveOffOf();
      this.moveOnto(this.trail.backtrack(this.pos));
      return;
    }
    
    // If the player didn't want to backtrack:
    this.moveStr += key;
    if (this.matchEasterEgg()) return;
    const destTiles = this.game.adjacent(this.pos).filter((adjTile) => { 
      return this.moveStr.endsWith(adjTile.seq);
    }, this);
    // Handle if the player typed a sequence
    // corresponding to an adjacent tile:
    if (destTiles.length == 1) {
      this.moveStr = '';
      const date = new Date();
      this.timeDeltas.push(date.getSeconds() - this.startTime);
      this.startTime = date.getSeconds();
      
      this.moveOffOf();
      this.trail.pushNew(this.pos);
      this.moveOnto(destTiles[0].pos);
    }
  }
  
  /* Moves this player off of the grid.
   */
  moveOffOf() {
    let tile = this.game.tileAt(this.pos);
    tile.key = ' ';
    tile.seq = '<br>';
    this.game.shuffle(this.pos);
    tile.coloring = 'trail';
  }
  
  /* Moves the player onto the position of the
   * grid described by the Pos object, dest.
   * Plays approprate sounds based on results.
   */
  moveOnto(dest) {
    const game = this.game;
    const tile = game.tileAt(dest);
    
    // Draw/make the changes:
    game.populations.set(tile.key, game.populations.get(tile.key) - 1);
    this.prevPos  = this.pos;
    this.pos      = dest;
    this.trimTrail();
    
    tile.coloring = 'player';
    tile.key      = Player.playerFace;
    tile.seq      = this.num;
    
    // Play a movement sound:
    SoundEffects.playEffectFrom(Player.moveSounds);
    
    // Check if the player landed on a target:
    for (let i = 0; i < game.targets.length; i++) {
      if (dest.equals(game.targets[i])) {
        this.score += 1;
        if (!this.game.muted) SoundEffects.playEffectFrom(Player.eatSounds);
        game.heat = game.numTargets * Math.sqrt(
          game.heat / game.numTargets + 1);
        
        // Remove this Pos from the targets list:
        game.targets.splice(i, 1);
        game.spawnTargets();
        
        // Restore the oldest corrupted tile:
        if (game.corrupted.length > 0) {
          const restore = game.corrupted.shift();
          game.shuffle(restore);
          game.tileAt(restore).coloring = 'tile';
        }
        break;
      }
    }
    
    this.updateSpotlight();
  }
  
  /* Used to calculate the maximum length of 
   * the player's trail. Call whenever the 
   * inputs to the calculation change.
   */
  updateTrailMaxLength() {
    let net = this.score - (this.game.misses);
    if (net < 0) net = 0;
    this.trail.length = Math.round(net ** 0.35);
  }
  /* Used to un-color the trimmed portion of the trail.
   * Call after every time the player moves, or the trail's
   * maximum length is updated.
   */
  trimTrail() {
    for (const evicted of this.trail.trim()) {
      const endTile = this.game.tileAt(evicted);
      if (endTile.coloring == 'trail') {
        endTile.coloring = 'tile';
      }
    }
  }
  
  /* Moves the player off the grid
   * and disables further movement.
   * Returns position of death.
   */
  die() {
    // TODO: play a death sound-effect here.
    
    // Erase the trail:
    for (const trPos of this.trail.hist) {
      const trTile = this.game.tileAt(trPos);
      if (trTile.coloring == 'trail') {
        trTile.coloring = 'tile';
      }
    }
    
    // Erase player and disable movement:
    this.moveOffOf();
    this.updateSpotlight();
    const deathSite = Pos.copy(this.pos);
    this.pos = undefined;
    this.isDead = true;
    
    return deathSite;
  }
  
  /* Returns average period in the last five moves.
   * Includes current move in calculation.
   * Units of the return value are in seconds.
   */
  avgPeriod() {
    this.timeDeltas = this.timeDeltas.slice(-5);
    let totalTime = this.timeDeltas.reduce((a, b) => a + b, 0) + // TODO: get rid of initial value?
      (new Date()).getSeconds() - this.startTime;
    return totalTime / (this.timeDeltas.length + 1);
  }
  
  /* Updates the opacity of all tiles in this player's vicinity. */
  updateSpotlight() {
    const dirty = this.game.adjacent(this.pos, Game.spotlightRadius);
    dirty.forEach((tile) => {
      this.game.updateTileOpacity(tile);
    }, this);
  }
  
  // Accessors:
  get score()    { return parseInt(this.score_.innerHTML ); }
  set score(val) {
    this.score_.innerHTML = val;
    this.updateTrailMaxLength();
    this.game.updateTrackLevel();
  }
  
  // :O
  matchEasterEgg() {
    let dest = undefined;
    
    // Teleportation:
    if (this.moveStr.split('tp').length > 2) {
      this.moveStr = '';
      do {
        dest = Pos.rand(this.game.width);
      } while(this.game.isCharacter(this.game.tileAt(dest))
        || dest.sub(this.game.chaser).norm() <= 4);
    }
    
    if (dest != undefined) {
      this.moveOffOf();
      this.trail.pushNew(this.pos);
      this.moveOnto(dest);
      return true;
    } else return false;
  }
}
Player.playerFace    = ':|';
Player.backtrackKeys = new Set(['Backspace', ' ', ]);
Player.moveSounds    = SoundEffects.makeVariants('move', 9);
Player.eatSounds     = SoundEffects.makeVariants('eat',  5, 0.3);
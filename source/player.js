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
    this.pos = new Pos();
    const middle = Math.floor(this.game.width / 2);
    this.moveOnto(new Pos(middle - this.num, middle));
    this.prevPos = Pos.copy(this.pos);
  }
  
  /* Handles player input, translating it to movement:
   */
  move(key) {
    if (this.isDead) return;
    
    // If the player wants to backtrack:
    if (key == ' ') {
      // Fail if the trail is empty or choked by an enemy:
      if (this.trail.isEmpty || this.game.isCharacter(
          this.game.tileAt(this.trail.newest))) { return; }
      this.moveOffOf();
      this.moveOnto(this.trail.backtrack(this.pos));
      return;
    }
    
    // If the player didn't want to backtrack:
    this.moveStr += key.toLowerCase();
    const destTiles = this.game.adjacent(this.pos).filter(
      (adjTile) => this.moveStr.endsWith(adjTile.seq)
    );
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
      console.log(this.trail.frameView());
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
    game.populations[tile.key]--;
    this.prevPos  = this.pos;
    this.pos      = dest;
    this.trimTrail(); // TODO: right now the trail cannot get shorter.
    
    tile.coloring = 'player';
    tile.key      = Player.playerFace;
    tile.seq      = this.num;
    
    // Play a movement sound:
    SoundEffects.playEffectFrom(Player.moveSounds);
    
    // Check if the player landed on a target:
    for (let i = 0; i < game.targets.length; i++) {
      
      // If the player landed on a target:
      if (dest.equals(game.targets[i])) {
        this.score += 1;
        
        if (!this.game.muted) {
          SoundEffects.playEffectFrom(Player.eatSounds);
        }
        game.heat = game.numTargets * Math.sqrt(
          game.heat / game.numTargets + 1);
        
        // Remove this Pos from the targets list:
        game.targets.splice(i, 1);
        game.spawnTargets();
        break;
      }
    }
  }
  
  /* Used to moderate the player's trail length.
   * Should be called whenever a target is consumed,
   * or whenever the player moves.
   */
  trimTrail() {
    if (this.trail.isEmpty) {
      return;
    }
    
    const net = this.score - (0.9 * this.game.misses);
    if (net < 0 || this.trail.length > Math.pow(net, 3/7)) {
      const endTile = this.game.tileAt(this.trail.trim());
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
    const trailContents = this.trail.streamContents();
    for (const trPos of trailContents) {
      const trTile = this.game.tileAt(trPos);
      if (trTile.coloring == 'trail') {
        trTile.coloring = 'tile';
      }
    }
    
    // Erase player and disable movement:
    this.moveOffOf();
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
  
  // Accessors:
  get score()    { return parseInt(this.score_.innerHTML ); }
  set score(val) {
    this.score_.innerHTML = val;
    this.game.updateTrackLevel();
  }
}
Player.playerFace = ':|';
Player.moveSounds = SoundEffects.makeVariants('move', 9);
Player.eatSounds  = SoundEffects.makeVariants('eat',  5, 0.3);
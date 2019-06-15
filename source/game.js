'use strict';

/* 
 */
class Tile {
  constructor(parentElem, pos) {
    this.pos = pos;
    
    // This will carry character-specific coloring:
    const tileTypeElem = document.createElement('div');
    tileTypeElem.className = 'tileFace';
    
    this.mouseOffText  = document.createElement('div');
    this.mouseOverText = document.createElement('div');
    
    this.mouseOffText.className  = 'tileText mouseOffText';
    this.mouseOverText.className = 'tileText mouseOverText';
    
    tileTypeElem.appendChild(this.mouseOffText);
    tileTypeElem.appendChild(this.mouseOverText);
    
    parentElem.className = 'tileForm';
    parentElem.appendChild(tileTypeElem);
    this.tileBodyElem = parentElem;
  }
  
  get key()    { return this.mouseOffText.innerHTML; }
  set key(key) { this.mouseOffText.innerHTML = key;  }
  
  get seq()    { return this.mouseOverText.innerHTML; }
  set seq(seq) { this.mouseOverText.innerHTML = seq;  }
  
  get coloring() {
    return this.tileBodyElem.dataset.type;
  }
  set coloring(coloring) {
    this.tileBodyElem.dataset.type = coloring;
  }
  set opacity(opacity) {
    this.mouseOffText.style.opacity  = opacity;
    this.mouseOverText.style.opacity = opacity;
  }
}

// weights is a Map from choices to their weights.
function weightedChoice(weights) {
  let totalWeight = 0;
  weights.forEach(weight => totalWeight += weight);
  let random = Math.random() * totalWeight;
  
  for (let [choice, weight] of weights.entries()) {
    if (random < weight) return choice;
    else random -= weight;
  }
  throw [...weights.values()];
}


/* Object keys:
 * -- width         : number:N
 * -- numTargets    : number:N
 * -- grid          : [Tile, ]
 * -- populations   : Map<string:number> lang character -> kbd sequence
 * -- language      : Map<string:string> lang character -> occurences
 * -- speed         : .ub, .lb, .fullBand
 *
 * -- restartButton : <button>
 * -- pauseButton   : <button>
 * -- progressBar   : <span>
 *
 * -- targets       : [Pos,]
 * -- corrupted     : [Pos,]
 * -- heat          : number:R
 * -- misses        : <span>
 *
 * -- players       : [Player,]
 * -- chaser        : Pos
 * -- nommer        : Pos
 * -- runner        : Pos
 *
 *
 * TODO:
 * somehow move away from balancing populations on shuffle
 *   with such space&computationally costly methods.
 * refactor tiles to have dataset.type attribute for coloring
 *  ^the setter can also set a isCharacter field by checking if it is not 'tile' or 'target'
 * make tile have a bg, coloring overlay set in css file according to data-type, and two text divs that change z-index
 * 
 * fix the broken progress/difficulty bar (broken because of cs selectors)
 * 
 * make game runner_catch and gameover sounds.
 */
class Game {
  constructor(width=Game.defaultWidth, numPlayers=Game.defaultNumPlayers) {
    if (width < Game.minWidth) width = Game.minWidth;
    if (width > Game.maxWidth) width = Game.maxWidth;
    this.grid       = [];
    this.width      = width;
    this.numTargets = Math.pow(this.width, 2) / Game.targetThinness;
    
    const dGrid = document.getElementById('grid');
    dGrid.style.setProperty('--width-in-tiles', width);
    
    // Initialize Table display:
    for (let y = 0; y < width; y++) {
      const row = dGrid.insertRow();
      
      for (let x = 0; x < width; x++) {
        this.grid.push(
          new Tile(
            row.insertCell(),
            new Pos(x, y),
          )
        );
      }
    }
    // Initialize background music with all 12 tracks:
    this.backgroundMusic = new BackgroundMusic(12);
    
    // Create players:
    this.allPlayers = [];
    for (let i = 0; i < numPlayers; i++) {
      this.allPlayers.push(new Player(this, i));
    }
    // Make menus:
    window.onblur = () => this.togglePause('pause');
    this.makeLowerBar();
    makeOptionsMenu(this, document.getElementById('optionsBar'));
    
    // Setup invariants and then prompt the player to start the game:
    for (const enemy in Game.enemies) { this[enemy] = new Pos(); }
    this.printStartPrompt('PRESS;SHIFT;ENTER;--2--;START');
    document.body.onkeydown = (event) => {
      if (event.key == 'Enter' && event.shiftKey) {
        this.restart();
        document.body.onkeydown = (event) => this.movePlayer(event);
      }
    }
  }
  
  /* Creates restart and pause buttons,
   * and also score and misses counters.
   */
  makeLowerBar() {
    const bar = document.getElementById('scoringBar');
    
    // Setup button displays:
    const makeButtons = (() => {
      for (let bName of ['restart', 'pause', 'spice']) {
        const btn = document.createElement('button');
        btn.className = 'menuItem';
        this[bName + 'Button'] = btn;
        btn.innerHTML = bName;
        bar.appendChild(btn);
      }
      
      // Assign callbacks to buttons:
      this.restartButton.onclick = () => this.restart();
      this.pauseButton.onclick   = () => this.togglePause();
      this.spiceButton.onclick   = () => {
        this.spiceButton.blur();
        this.misses += 25;
      }
    })();
    
    // Progress bar:
    const makeProgress = (() => {
      const progress = document.createElement('div');
      progress.className = 'menuItem progress';
      
      const chaserElem   = document.createElement('td');
      const chaserTile   = new Tile(chaserElem, new Pos());
      chaserTile.key     = Game.enemies['chaser'];
      
      progress.appendChild(chaserElem);
      progress.set = (val) => {
        chaserElem.style.left = 'calc(' + val + ' * (100% - var(--tileHt))';
      }
      bar.appendChild(progress);
      this.progressBar = progress;
    })();
    
    // Score displays:
    for (let player of this.allPlayers) {
      bar.appendChild(player.score_.parentElement);
    }
    this.misses_ = this.makeScoreElement('misses');
    bar.appendChild(this.misses_.parentElement);
  }
  
  /* Shuffles entire grid and resets scores.
   * Automatically re-enables the pause button
   * if disabled by a game-over.
   */
  restart() {
    this.restartButton.blur();
    
    // Apply any restart-only settings changes:
    const langName = document.getElementById('languageSelect').value;
    if (this.language == undefined || langName != this.language.langName) {
      console.log('language has changed');
      this.language = new (INTERPRETERS.get(langName))();
    }
    this.speed = Object.assign({}, 
      Game.speeds[document.getElementById('speedSelect').value]
    );
      
    // Reset all display-key populations:
    // TODO: change to this.populations = new Populations(this.language.allKeys());
    this.populations = new Map();
    for (const key of this.language.allKeys()) {
      this.populations.set(key, 0);
    }
    this.targets   = [];
    this.corrupted = [];
    this.heat      = 0;
    this.misses_.innerHTML = 0;
    
    // Despawn all characters and re-shuffle all tiles:
    this.clearGrid();
    this.grid.forEach((tile) => {
      this.shuffle(tile.pos);
    }, this);
    
    // Spawn players:
    this.livePlayers = [];
    this.allPlayers.forEach((player) => {
      this.livePlayers.push(player);
      player.restart();
    }, this);
    
    // Spawn enemies:
    const slots = Pos.corners(this.width, Math.floor(this.width/10));
    slots.sort((a, b) => Math.random() - 0.5);
    for (let enemy in Game.enemies) {
      this.moveEnemyOnto(enemy, slots.shift());
    }
    
    // Spawn targets:
    this.spawnTargets();
    
    // Start the characters moving:
    this.updateTrackLevel();
    this.togglePause('pause');
    this.togglePause('unpause');
    this.pauseButton.disabled = false;
    this.spiceButton.disabled = false;
  }
  
  /* Freezes Game.enemies and disables player movement.
   * Toggles the pause button to unpause on next click.
   */
  togglePause(force=undefined) {
    this.pauseButton.blur();
    
    // Handle if a method is requesting to
    // force the game to a certain state:
    if (force == 'pause' || force == 'unpause') {
      this.paused = (force != 'pause');
      this.togglePause();
      return;
    }
    
    // Freeze all the Game.enemies:
    const that = this;
    clearTimeout(that.chaserCancel);
    clearTimeout(that.nommerCancel);
    clearTimeout(that.runnerCancel);
    
    // The player pressed the pause button:
    if (!this.paused) {
      this.backgroundMusic.pause();
      document.body.dataset.paused = '';
      
    // The user pressed the un-pause button:
    } else {
      if (!this.muted) {
        this.backgroundMusic.play();
      }
      delete document.body.dataset.paused;
      this.chaserCancel = setTimeout(that.moveChaser.bind(that), 1000);
      this.nommerCancel = setTimeout(that.moveNommer.bind(that), 1000);
      this.runnerCancel = setTimeout(that.moveRunner.bind(that), 1000);
    }
    this.paused = !(this.paused);
  }
  
  /* Moves the chaser to player.pos and kills player.
   * Assumes the chaser has already moved off the grid.
   */
  killPlayer(player) {
    const deathSite = player.die(); // f
    for (let i = 0; i < this.livePlayers.length; i++) {
      if (this.livePlayers[i].num == player.num) {
        this.livePlayers.splice(i, 1);
        break;
      }
    }
    this.moveEnemyOnto('chaser', deathSite);
    
    // If all players are dead, end
    // the game and wait for a restart:
    if (this.livePlayers.length == 0) {
      this.pauseButton.disabled = true;
      this.spiceButton.disabled = true;
      this.togglePause('pause');
      
      this.printStartPrompt('*****;GAME*;*</3*;*OVER;*****');
    }
  }
  
  
  /* Shuffles the key in the tile at pos.
   * Automatically increments the new key's
   * population record, but decrementing the 
   * previous key's population record is 
   * expected to be done externally.
   */
  shuffle(pos, corrupt=false) {
    // If shuffling a tile:
    if (!corrupt) {
      // Filter all keys, keeping those that
      // won't cause movement ambiguities:
      const weights = new Map();
      const lowest  = Math.min(...this.populations.values());
      
      // TODO: see note for this class.
      const neighbors = this.adjacent(pos, 2);
      for (const key of this.language.allKeys()) {
        if (!neighbors.some((nbTile) => {
          const seq = this.language.key2seq(key);
          return (nbTile.seq.includes(seq) || seq.includes(nbTile.seq));
        })) {
          weights.set(key, 4 ** (lowest - this.populations.get(key)));
        }
      }
      const choice = weightedChoice(weights);
      
      this.populations.set(choice, this.populations.get(choice) + 1);
      const tile = this.tileAt(pos);
      tile.key   = choice;
      tile.seq   = this.language.key2seq(choice);
      
    // If corrupting a tile:
    } else {
      this.corrupted.push(pos);
      const tile = this.tileAt(pos);
      tile.coloring = 'corrupt';
      tile.key = '';
      tile.seq = '#';
    }
  }
  
  /* Maintains a fixed number ot targets on the grid.
   * Weighs spawn locations toward the center, away from
   * all hungry characters, and favours dispersion.
   * Call when a hungry character lands on a target.
   */
  spawnTargets() {
    const weights = this.getItemSpawnWeights();
    
    // Spawn targets until the correct #targets is met:
    while(this.targets.length < this.numTargets) {
      const choice = weightedChoice(weights);
      this.targets.push(choice);
      this.tileAt(choice).coloring = 'target';
      weights.delete(choice);
    }
  }
  
  /* Returns a map of 
   */
  getItemSpawnWeights() {
    // Radius is a scalar to this.width.
    const bell = (p1, p2, radius) => {
      const dist = p1.sub(p2).norm() / this.width;
      const exp  = Math.pow(2 * dist / radius, 2);
      return Math.pow(2, -exp);
    };
    
    // Get all valid target-spawn positions:
    let choices = this.grid.filter((tile) => {
      return (!(this.isCharacter(tile)) && 
      !(this.targets.includes(tile.pos)))
    }, this);
    choices = choices.map((tile) => tile.pos);
    let center = new Pos(
      Math.floor(this.width / 2),
      Math.floor(this.width / 2));
    
    // Favor the center and bias against 
    const weights = new Map();
    for (let chPos of choices) {
      const playersWeight = this.livePlayers.map((player) => 
        bell(player.pos, chPos, 1/3)).reduce((a, b) => a + b);
        
      weights.set(chPos, 
        5/3 * bell(center, chPos, 0.8) +
        (playersWeight / this.livePlayers.length) + 
        bell(this.nommer, chPos, 1/3)
      );
    }
    return weights;
  }
  
  
  /* Returns a collection of tiles in the 
   * (2*radius + 1)^2 area centered at pos,
   * all satisfying the condition that they
   * do not contain the player or an enemy,
   * and are inside the grid.
   * radius must be an integer value:
   */
  adjacent(pos, radius=1) {
    const yLower = Math.max(0,          pos.y - radius);
    const yUpper = Math.min(this.width, pos.y + radius + 1);
    const xLower = Math.max(0,          pos.x - radius);
    const xUpper = Math.min(this.width, pos.x + radius + 1);
    
    // Get all neighboring tiles in (2*radius + 1)^2 area:
    const neighbors = [];
    for (let y = yLower; y < yUpper; y++) {
      for (let x = xLower; x < xUpper; x++) {
        neighbors.push(this.tileAt(new Pos(x, y)));
      }
    }
    // Filter out tiles that are characters:
    return neighbors.filter((nbTile) => {
      return !(this.isCharacter(nbTile));
    }, this);
  }
  
  /* Returns the Player object closest in
   * position to origin square-norm-wise.
   */
  closestPlayerTo(origin) {
    const dist = (player) => player.pos.sub(origin).squareNorm();
    
    let closest = this.livePlayers[0];
    this.livePlayers.slice(1).forEach((player) => {
      if (dist(player) < dist(closest)) {
        closest = player;
      }
    }, this);
    
    return closest;
  }
  
  /* Handles restart and pause key commands,
   * and delegates backtrack and move commands
   * to their corresponding player. Players
   * make their inputs unique through keyboard
   * toggles {CapsLock, NumLock, & ScrollLock}
   */
  movePlayer(event) {
    // Check if a single player wants to pause or restart:
    if (event.key == 'Enter') {
      // If zero or one player is alive, they may
      // restart while the game is not over.
      if (event.shiftKey) {
        if (this.livePlayers.length <= 1) {
          this.restart();
        }
      // Any player currently online can pause or
      // unpause the game while the game is not over.
      } else if (!this.pauseButton.disabled) {
        this.togglePause();
      }
      
    // The players cannot move while the game is paused:
    } else if (this.paused) {
      return;
    }
    
    // Ignore non-letter keys:
    if (event.key.length > 1 && !(Player.backtrackKeys.has(event.key))) {
      return;
    }
    
    // Decide which player the move belongs to:
    let playerNum = 0;
    playerNum &= event.getModifierState(  'CapsLock') << 0;
    playerNum &= event.getModifierState(   'NumLock') << 1;
    playerNum &= event.getModifierState('ScrollLock') << 2;
    
    // Clean input and send to handler:
    let key = event.key;
    if (key.length == 0) {
      key = key.toLowerCase();
      if (event.shiftKey) {
        key = key.toUpperCase();
      }
    }
    this.allPlayers[playerNum].move(key);
  }
  
  /* Chaser moves in the direction of the player.
   * Speed is a function of player's score and
   * misses. May miss the player when they are
   * moving quickly and have a trail.
   */
  moveChaser() {
    this.moveEnemyOffOf('chaser', true);
    
    // Choose a player to target:
    const tgPlayer = this.closestPlayerTo(this.chaser);
    const speed    = this.enemyBaseSpeed();
    let   dest     = tgPlayer.pos;
    
    // Chaser may miss if the player is moving quickly:
    const maxMissWeight = 4, equivPoint = 4;
    const power   = tgPlayer.avgPeriod() * speed / equivPoint;
    const weights = new Map();
    weights.set(false, 1);
    weights.set(true,  Math.pow(maxMissWeight, 1 - power));
    
    // If the player was moving fast and has a little luck, miss:
    if (weightedChoice(weights)) { dest = tgPlayer.prevPos; }
      
    // Handle if the chaser can catch the player:
    else if (this.chaser.sub(dest).squareNorm() == 1) {
      this.killPlayer(tgPlayer);
      return;
    }
    
    // Execute the move:
    dest = this.enemyDest(this.chaser, dest);
    this.moveEnemyOnto('chaser', dest);
    
    // Setup the timed loop:
    const loop = this.moveChaser.bind(this);
    this.chaserCancel = setTimeout(loop, 1000 / speed);
  }
  
  /* Nommer moves toward a target and avoids
   * competition with the player for a target.
   * Speed augented by burst that jumps up when
   * the player consumes a target, and cools down
   * as the nommer moves.
   */
  moveNommer() {
    this.moveEnemyOffOf('nommer');
    let targets = this.targets.slice();
    
    // Get all targets exluding the third which are closest to the players:
    let prox = (tgPos) => Math.min(...this.livePlayers.map(
      (player) => player.pos.sub(tgPos).squareNorm() ));
    targets.sort((a, b) => prox(a) - prox(b));
    targets = targets.slice(Math.floor(targets.length / 3));
    
    // Now, choose the target closest to the nommer:
    prox = (tgPos) => tgPos.sub(this.nommer).squareNorm();
    targets.sort((a, b) => prox(a) - prox(b));
    let dest = targets[0];
    
    // Decrease the heat stat:
    if (this.heat - 1 >= 0) this.heat--;
    
    // Execute the move:
    dest = this.enemyDest(this.nommer, dest);
    this.moveEnemyOnto('nommer', dest, true);
    
    // Setup the timed loop:
    const loop = this.moveNommer.bind(this);
    const speed = this.enemyBaseSpeed(/*0.05*/) * (this.heat / 5 + 1);
    this.nommerCancel = setTimeout(loop, 1000 / speed);
  }
  
  /* Runner moves away from the player using
   * hidden corner strategy. Speed is a funct-
   * ion of distance from the player.
   */
  moveRunner() {
    this.moveEnemyOffOf('runner', true);
    
    // First, handle if the runner was caught:
    const caught = () => this.livePlayers.some((player) =>
      player.pos.sub(this.runner).squareNorm() == 1 );
    
    let dest, wasCaught = false;
    let closestPlayer = this.closestPlayerTo(this.runner).pos;
    
    if (caught()) {
      wasCaught = true;
      // TODO: Play the caught sound here:
      do {
        dest = Pos.rand(this.width);
      } while(this.isCharacter(this.tileAt(dest)) ||
        this.livePlayers.some((player) => 
          player.pos.sub(dest).squareNorm() <= 1));
      this.misses = Math.floor(this.misses * 3 / 4);
    
    // If the runner is a safe distance from the player:
    } else if (this.runner.sub(closestPlayer).norm() >= this.width / 2.5) {
      // Follow the chaser and bias away from the nommer:
      let fromNommer = this.runner.sub(this.nommer);
      fromNommer = fromNommer.mul(this.width/9/fromNommer.norm());
      dest = this.chaser.add(fromNommer).add(Pos.rand(2, true));
      
    // If the runner is NOT a safe distance from the player:
    } else {
      dest = this.cornerStrat1();
      // Additional vector to avoid the player:
      const cornerDist = Math.pow(dest.sub(this.runner).norm(), 2);
      let   fromPlayer = this.runner.sub(closestPlayer);
      fromPlayer = fromPlayer.mul(
        Math.pow(cornerDist / fromPlayer.norm(), 0.3));
      dest = dest.add(fromPlayer);
    }
    
    // Execute the move:
    if (!wasCaught) dest = this.enemyDest(this.runner, dest);
    this.moveEnemyOnto('runner', dest);
    
    // Calculate how fast the runner should move:
    closestPlayer = this.closestPlayerTo(this.runner).pos;
    const speedup = 2.90; // The maximum frequency multiplier.
    const power   = 5.8; // Increasing this shrinks high-urgency range.
    const dist    = dest.sub(closestPlayer).squareNorm();
    let   urgency = Math.pow((this.width + 1 - dist) / this.width, power);
    urgency = urgency * (speedup - 1) + 1;
    
    // Setup the timed loop:
    const loop = this.moveRunner.bind(this);
    this.runnerCancel = setTimeout(loop, 1000 / urgency);
  }
  cornerStrat1() {
    let corners = Pos.corners(this.width, Math.floor(this.width / 7));
    
    // Exclude the closest and furthest corners from the closest player:
    const closestPlayer = this.closestPlayerTo(this.runner).pos;
    let danger = (cnPos) => closestPlayer.sub(cnPos).linearNorm();
    corners.sort((a, b) => danger(a) - danger(b));
    corners = corners.slice(1, 3);
    
    // Choose the safest remaining corner:
    danger = (cnPos) => {
      return cnPos.sub(this.runner).linearNorm() - 
      cnPos.sub(closestPlayer).linearNorm();
    };
    corners.sort((a, b) => danger(a) - danger(b));
    return corners[0];
    
  }
  
  
  /* All enemy moves need to pass through this function:
   * Truncates moves to offsets by one and chooses
   * diagonality.
   */
  enemyDiffTrunc(diff) {
    // If there's no diagonal part, truncate and return:
    if (diff.x == 0 || diff.y == 0 || diff.x == diff.y) {
      return diff.trunc(1);
    }
    const abs = diff.abs();
    
    // Decide whether to keep the diagonal:
    // When axisPercent ~ 1, diagonal component is small.
    const axisPercent = Math.abs(abs.x-abs.y) / (abs.x+abs.y);
    
    const weights = new Map();
    weights.set(true,  axisPercent);
    weights.set(false, 1 - axisPercent);
    if (weightedChoice(weights)) {
      if (abs.x > abs.y) { diff.y = 0; }
      else { diff.x = 0; }
    }
    // Return the truncated step:
    return diff.trunc(1);
  }
  
  /* Returns a destination closer to the given
   * final destination, truncated down to a one-
   * tile distance from the origin(Pos-type).
   *
   * Assumes the character at origin has already
   * been temporarily removed.
   */
  enemyDest(origin, dest) {
    const diff    = this.enemyDiffTrunc(dest.sub(origin));
    const desired = origin.add(diff);
    const pref    = (altTile) => {
      return -origin.add(diff.mul(2))
        .sub(altTile.pos).linearNorm();
    }
    
    // Handle if the desired step-destination has a conflict:
    if (!desired.inBounds(this.width) ||
      this.isCharacter(this.tileAt(desired))) {
      // Choose one of the two best alternatives:
      let alts = this.adjacent(origin);
      alts.sort((tA, tB) => pref(tA) - pref(tB));
      alts = alts.slice(-2);
      
      // Generate weights:
      const weights = new Map();
      for (let altTile of alts) {
        weights.set(altTile.pos, Math.pow(4, pref(altTile)));
      }
      // Return a weighted choice:
      return weightedChoice(weights);
      
    } else {
      return desired;
    }
  }
  
  /* Returns a speed in tiles per second.
   * Uses an upside-down bell-curve with
   * score + misses as the input variable.
   * curveDown is in the range [0, 1]. It
   * compresses the effect of the input.
   * 
   * Requires that this.livePlayers is not empty.
   */
  enemyBaseSpeed(curveDown=0) {
    const scores   = this.livePlayers.reduce((a, b) => a + b.score, 0) / 
                     this.livePlayers.length;
    const obtained = Math.pow(scores + (this.misses), 1-curveDown);
    
    // Scalar multiple of the default number of targets:
    const slowness = 25 * Game.defaultNumTargets;
    const exp   = -Math.pow(obtained / slowness, 1.44);
    const speed = (this.speed.ub - this.speed.lb) * 
                  (1 - Math.pow(2, exp)) + this.speed.lb;
    return speed;
  }
  
  /* If a character does not eat targets,
   * call with notHungry set to true.
   */
  moveEnemyOffOf(character, notHungry) {
    const pos  = this[character];
    const tile = this.tileAt(pos);
    tile.key = ' ';
    this.shuffle(pos);
    this.updateTileOpacity(tile);
    
    // Handle coloring:
    if (this.livePlayers.some((player) =>
      player.trail.hist.some(
        (trPos) => pos.equals(trPos)
      ))) {
      tile.coloring = 'trail';
    } else if (notHungry && 
        this.targets.some((tgPos) => pos.equals(tgPos))) {
      tile.coloring = 'target';
    } else {
      tile.coloring = 'tile';
    }
  }
  
  /* Assumes that dest does not contain a character.
   * Handles book-keeping tasks such as spawning new
   * targets, and trimming the player's trail.
   */
  moveEnemyOnto(character, dest, hungry=false) {
    const tile = this.tileAt(dest);
    if (this.isCharacter(tile)) throw 'cannot land on character.';
    this.populations.set(tile.key, this.populations.get(tile.key) - 1);
    this[character] = dest;
    tile.coloring   = character;
    tile.opacity    = 1;
    tile.key = Game.enemies[character];
    tile.seq = '<br>';
    
    // Check if a hungry character landed on a target:
    if (!hungry) { return; }
    for (let i = 0; i < this.targets.length; i++) {
      if (dest.equals(this.targets[i])) {
        // Corrupt a random tile:
        if (Game.doNommerCorrupt) {
          const corrupt = weightedChoice(this.getItemSpawnWeights());
          this.shuffle(corrupt, true);
        }
        
        this.misses += 1;
        // Remove this Pos from the targets list:
        this.targets.splice(i, 1);
        this.spawnTargets();
        break;
      }
    }
  }
  
  /* Updates a tile's opacity */
  updateTileOpacity(tile) {
    let opacity = Game.spotlightRadius;
    opacity -= tile.pos.sub(this.closestPlayerTo(tile.pos).pos).norm();
    if (opacity < 0) opacity = 0;
    
    // Make changes to tile's opacity:
    tile.opacity = (opacity / Game.spotlightRadius) ** 0.7;
  }
  
  clearGrid() {
    for (let tile of this.grid) {
      tile.key = ' ';
      tile.seq = '<br>';
      tile.coloring = 'tile';
      tile.opacity = 0;
    }
  }
  
  // Caution: This will clear all grid information.
  printStartPrompt(string) {
    this.clearGrid();
    
    const middle = Math.floor(this.width / 2);
    const message = string.split(';');
    const center = new Pos(
      middle, middle - Math.floor(message.length / 2)
    );
    // Prints a word on a line relative to the center:
    const printWord = (word, lineOffset) => {
      const charOffset = Math.floor(word.length / 2);
      for (let i = 0; i < word.length; i++) {
        const caret = this.tileAt(
          center.add(new Pos(i - charOffset, lineOffset))
        );
        //caret.coloring = 'target';
        caret.key = word[i];
        caret.seq = word[i];
        caret.opacity = 1;
      }
    }
    for (let i = 0; i < message.length; i++) {
      printWord(message[i], i);
    }
  }
  updateTrackLevel() {
    const progress = (
      (this.enemyBaseSpeed() - this.speed.lb) / 
      (this.speed.ub - this.speed.lb)
    );
    this.backgroundMusic.updateTrackLevel(
      progress / this.speed.fullBand
    );
    this.progressBar.set(progress);
  }
  makeScoreElement(labelText) {
    let slot = document.createElement('div');
    slot.className = 'menuItem scoreTag';
    
    let counter = document.createElement('span');
    counter.dataset.player = labelText + ': ';
    counter.innerHTML = 0;
    slot.appendChild(counter);
    return counter;
  }
  tileAt(pos) { return this.grid[pos.y * this.width + pos.x]; }
  isCharacter(tile) {
    return tile.key in Object.entries(Game.enemies) ||
      tile.key == Player.playerFace;
  }
  
  get misses() {
    return parseInt(this.misses_.innerHTML);
  }
  set misses(val) {
    this.misses_.innerHTML = val;
    for (const player of this.livePlayers) {
      player.updateTrailMaxLength();
    }
    this.updateTrackLevel();
  }
  get paused() {
    return this.pauseButton.pauseOn;
  }
  set paused(onFlag) {
    if (onFlag) {
      this.pauseButton.innerHTML = 'unpause';
    } else {
      this.pauseButton.innerHTML = 'pause';
    }
    this.pauseButton.pauseOn = onFlag;
  }
  get muted() {
    return document.getElementById('muteButton').muteOn;
  }
}


// Game base settings:
Game.defaultWidth      = 21;
Game.minWidth          = 10;
Game.maxWidth          = 30;

Game.defaultNumPlayers = 1;
Game.targetThinness    = 72;
Game.defaultNumTargets = Game.defaultWidth ** 2 / Game.targetThinness;
Game.spotlightRadius   = 9;

Game.enemies = {
  'chaser': ':>',
  'nommer': ':O',
  'runner': ':D',
};
Game.doNommerCorrupt = false;

Game.speeds = {
  'slowest': {'lb': 0.17, 'ub': 0.45, 'fullBand': 0.19},
  'slower':  {'lb': 0.26, 'ub': 1.07, 'fullBand': 0.33},
  'normal':  {'lb': 0.35, 'ub': 1.52, 'fullBand': 0.50},
  'faster':  {'lb': 0.59, 'ub': 1.70, 'fullBand': 0.57},
  'fastest': {'lb': 0.86, 'ub': 1.76, 'fullBand': 0.70},
};

'use strict';

/* 
 */
class Tile {
  constructor(pos) {
    this.pos    = pos;
    this.fInner = document.createElement('div');
    this.fInner.className = 'flip-inner';
    
    this.front_ = document.createElement('div');
    this.back_  = document.createElement('div');

    this.fInner.appendChild(this.front_);
    this.fInner.appendChild(this.back_);
  }
  
  get key()    { return this.front_.innerHTML; }
  set key(key) { this.front_.innerHTML = key;  }
  
  get seq()    { return this.back_.innerHTML;  }
  set seq(seq) { this.back_.innerHTML = seq;   }
  
  get coloring() {
    return this.front_.className;
  }
  set coloring(cl) {
    this.front_.className = cl;
    this.back_.className  = cl;
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
  throw 'weights values either not all numbers, or all zero.\n' + 
        '#entries: ' + weights.size + '. total weight: ' + totalWeight;
}


/* Object keys:
 * -- width         : number - [10,30]
 * -- numTargets    : number
 * -- populations   : {string: number}
 * -- grid          : array[Tile]
 * -- language      : {string: string}
 * -- speed         : .ub, .lb
 *
 * -- restartButton : <button>
 * -- pauseButton   : <button>
 * -- progressBar   : <span>
 *
 * -- targets       : array[Pos]
 * -- players       : array[Player]
 * -- chaser        : Pos
 * -- nommer        : Pos
 * -- runner        : Pos
 * -- heat          : number
 * -- misses        : <span>
 *
 *
 * TODO:
 * work on tutorial pane.
 * make progress slider use <div> instead of <progress>.
 * 
 * Cookies for: name, high-score(score, misses), version.
 * make game runner_catch and gameover sounds.
 * set an interval to correct background track misalignments.
 * some kind of fun easter egg if you type specific words.
 * get rid of gaps in the background music loop.
 */
class Game {
  constructor(width=20, numPlayers=1) {
    if (width < 10) width = 10;
    if (width > 30) width = 30;
    this.grid       = [];
    this.width      = width;
    this.numTargets = Math.pow(this.width, 2) / Game.targetThinness;
    document.documentElement.style.setProperty('--width-in-tiles', width);
    
    // Initialize Table display:
    const dGrid = document.getElementById('grid');
    for (let y = 0; y < width; y++) {
      const row = dGrid.insertRow();
      
      for (let x = 0; x < width; x++) {
        const cell = row.insertCell();
        const tile = new Tile(new Pos(x, y));
        this.grid.push(tile);
        cell.appendChild(tile.fInner);
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
    makeOptionsMenu(this, document.getElementById('rBar'));
    
    // Setup invariants and then start the game:
    for (const enemy in Game.enemies) { this[enemy] = new Pos(); }
    this.restart();
    document.body.onkeydown = () => this.movePlayer(event);
  }
  
  /* Creates restart and pause buttons,
   * and also score and misses counters.
   */
  makeLowerBar() {
    const bar = document.getElementById('lBar');
    
    // Setup button displays:
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
    
    // Progress bar slider: TODO:
    const progress = document.createElement('div');
    progress.className  = 'menuItem progress';
    const chaserIcon    = new Tile(new Pos());
    chaserIcon.key      = Game.enemies['chaser'];
    chaserIcon.coloring = 'progress chaser';
    progress.appendChild(chaserIcon.fInner);
    progress.set = (val) => {
      chaserIcon.fInner.style.left = 'calc(' + val + ' * (100% - var(--tileHt))';
    }
    bar.appendChild(progress);
    this.progressBar = progress;
    
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
    
    this.language = languages[
      document.getElementById('langSelect').value];
    this.speed = Game.speeds[
      document.getElementById('speedSelect').value];
      
    // Reset all display-key populations:
    this.populations = {};
    for (let key in this.language) {
      this.populations[key] = 0;
    }
    this.misses_.innerHTML  = 0;
    this.heat     = 0;
    this.targets  = [];
    
    // Despawn all characters and re-shuffle all tiles:
    for (let tile of this.grid) {
      tile.key = ' ';
      tile.seq = '<br>';
      tile.coloring = 'tile';
    }
    for (let tile of this.grid) {
      this.shuffle(tile.pos);
    }
    
    // Spawn players:
    this.livePlayers = this.allPlayers.slice();
    for (let player of this.allPlayers) { player.restart(); }
    
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
  
  /* Shuffles the key in the tile at pos.
   * Automatically increments the new key's
   * population record, but decrementing the 
   * previous key's population record is 
   * expected to be done externally.
   */
  shuffle(pos) {
    // Filter all keys, keeping those that
    // won't cause movement ambiguities:
    const valid = [];
    let l = this.language;
    let neighbors = this.adjacent(pos, 2);
    for (let opt in this.language) {
      if (!neighbors.some(nbTile => 
        nbTile.seq.includes(l[opt]) ||
        l[opt].includes(nbTile.seq)
      )) {
        valid.push(opt);
      }
    }
    
    // Initialize weights for valid keys and choose one:
    const weights = new Map();
    const lowest = Math.min(...Object.values(this.populations));
    valid.forEach(key => weights.set(
      key, Math.pow(4, lowest - this.populations[key])
      ));
    const choice = weightedChoice(weights);
    
    // Handle choice:
    this.populations[choice]++;
    const tile = this.tileAt(pos);
    tile.key = choice;
    tile.seq = this.language[choice];
  }
  
  /* Maintains a fixed number ot targets on the grid.
   * Weighs spawn locations toward the center, away from
   * all hungry characters, and favours dispersion.
   * Call when a hungry character lands on a target.
   */
  spawnTargets() {
    // Radius is a scalar to this.width.
    const bell = (p1, p2, radius) => {
      const dist = p1.sub(p2).norm() / this.width;
      const exp  = Math.pow(2 * dist / radius, 2);
      return Math.pow(2, -exp);
    };
    
    // Get all valid target-spawn positions:
    let choices = this.grid.filter(tile => 
      !this.isCharacter(tile) && 
      !this.targets.includes(tile.pos)
      );
    choices = choices.map(tile => tile.pos);
    let center = new Pos(
      Math.floor(this.width / 2),
      Math.floor(this.width / 2));
    
    const weights = new Map();
    for (let chPos of choices) {
      const playersWeight = this.livePlayers.map((player) => {
        return bell(player.pos, chPos, 1 / 3);
      });
      weights.set(chPos, 
        5/3 * bell(center, chPos, 0.8) +
        (playersWeight.reduce((a, b) => a + b, 0) / this.livePlayers.length) + 
        bell(this.nommer, chPos, 1/3)
      );
    }
    
    // Spawn targets until the correct #targets is met:
    while(this.targets.length < this.numTargets) {
      const choice = weightedChoice(weights);
      this.targets.push(choice);
      this.tileAt(choice).coloring = 'target';
      weights.delete(choice);
    }
  }
  
  /* Returns a collection of tiles in the 
   * (2*radius + 1)^2 area centered at pos,
   * all satisfying the condition that they
   * do not contain the player or an enemy:
   */
  adjacent(pos, radius=1) {
    // Get all neighboring tiles in (2*radius + 1)^2 area:
    const yLower = Math.max(0,          pos.y - radius);
    const yUpper = Math.min(this.width, pos.y + radius + 1);
    const xLower = Math.max(0,          pos.x - radius);
    const xUpper = Math.min(this.width, pos.x + radius + 1);
    
    const neighbors = [];
    for (let y = yLower; y < yUpper; y++) {
      for (let x = xLower; x < xUpper; x++) {
        neighbors.push(this.tileAt(new Pos(x, y)));
      }
    }
    // Filter out tiles that are characters:
    return neighbors.filter(
      nbTile => nbTile.key in this.language);
  }
  
  /* Returns the Player object closest in
   * position to origin square-norm-wise.
   */
  closestPlayerTo(origin) {
    const players = this.livePlayers.slice();
    const dist = (player) => player.pos.sub(origin).squareNorm();
    players.sort((a, b) => dist(a) - dist(b));
    return players[0];
  }
  
  // TODO: this will need to somehow tell which player triggered the event.
  //   triggered by some incoming remote data package:
  movePlayer(event) {
    // Check if a single player wants to pause or restart:
    if (this.allPlayers.length == 1 && event.key == 'Enter') {
      if (event.shiftKey) this.restart();
      else this.togglePause();
    } else if (this.pauseButton.pauseOn) {
      return;
    }
    
    if (!event.shiftKey && event.key.length == 1) {
      this.allPlayers[0].move(event.key);
    } else if (this.allPlayers.length > 1) {
      this.allPlayers[1].move(event.key);
    }
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
    
    // Miss:
    if (weightedChoice(weights)) {
      dest = tgPlayer.trail.slice(-1)[0];
      
    // Handle if the chaser can catch the player:
    } else if (this.chaser.sub(dest).squareNorm() == 1) {
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
    const speed = this.enemyBaseSpeed(0.05) * (this.heat / 5 + 1);
    this.nommerCancel = setTimeout(loop, 1000 / speed);
  }
  
  /* Runner moves away from the player using
   * hidden corner strategy. Speed is a funct-
   * ion of distance from the player.
   */
  moveRunner(escape=false) {
    this.moveEnemyOffOf('runner', true);
    
    // First, handle if the runner was caught:
    const caught = () => this.livePlayers.some((player) =>
      player.pos.sub(this.runner).squareNorm() == 1 );
    if (caught() && !escape) {
      // TODO: Play the caught sound here:
      this.misses = Math.floor(this.misses * 3 / 4);
    }
    
    let dest;
    let closestPlayer = this.closestPlayerTo(this.runner).pos;
    
    // If the runner is a safe distance from the player:
    if (this.runner.sub(closestPlayer).norm() >= this.width / 2.5) {
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
    dest = this.enemyDest(this.runner, dest);
    this.moveEnemyOnto('runner', dest);
    
    // Calculate how fast the runner should move:
    closestPlayer = this.closestPlayerTo(this.runner).pos;
    const speedup = 2.94; // The maximum frequency multiplier.
    const power   = 5.8; // Increasing this shrinks high-urgency range.
    const dist    = dest.sub(closestPlayer).squareNorm();
    let   urgency = Math.pow((this.width + 1 - dist) / this.width, power);
    urgency = urgency * (speedup - 1) + 1;
    
    // Setup the timed loop:
    const loop = this.moveRunner.bind(this, caught());
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
  enemyDiffTrunc(origin, dest) {
    const diff = dest.sub(origin);
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
    const diff    = this.enemyDiffTrunc(origin, dest);
    const desired = origin.add(diff);
    const pref    = (altTile) => {
      return origin.add(diff.mul(2)).sub(altTile.pos).linearNorm();
    }
    
    // Handle if the desired step-destination has a conflict:
    if (!desired.inBounds(this.width) ||
      this.isCharacter(this.tileAt(desired))) {
      // Choose one of the two best alternatives:
      let alts = this.adjacent(origin);
      alts.sort((tA, tB) => pref(tB) - pref(tA));
      if (alts.length > 3) alts = alts.slice(3);
      
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
    tile.key = '<br>';
    this.shuffle(pos);
    
    // Handle coloring:
    if (this.livePlayers.some((player) => {
      return player.trail.some((trPos) => pos.equals(trPos));
    })) {
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
    this.populations[tile.key]--;
    this[character] = dest;
    tile.coloring   = character;
    tile.key = Game.enemies[character];
    tile.seq = '<br>';
    
    // Check if a hungry character landed on a target:
    if (!hungry) { return; }
    for (let i = 0; i < this.targets.length; i++) {
      // If a hungry character landed on a target:
      if (dest.equals(this.targets[i])) {
        this.misses += 1;
        // Remove this Pos from the targets list:
        this.targets.splice(i, 1);
        for (let player of this.livePlayers) { player.trimTrail(); }
        this.spawnTargets();
        break;
      }
    }
  }
  
  /* Freezes Game.enemies and disables player movement.
   * Toggles the pause button to unpause on next click.
   */
  togglePause(force=undefined) {
    this.pauseButton.blur();
    
    // Handle if a method is requesting to
    // force the game to a certain state:
    if (force == 'pause') {
      this.paused = false;
      this.togglePause();
      return;
    } else if (force == 'unpause') {
      this.paused = true;
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
      document.body.style.filter = 'var(--pauseFilter)';
    // The user pressed the un-pause button:
    } else {
      if (!this.muted) {
        this.backgroundMusic.play();
      }
      document.body.style.filter = '';
      this.chaserCancel = setTimeout(that.moveChaser.bind(that), 1000);
      this.nommerCancel = setTimeout(that.moveNommer.bind(that), 1000);
      this.runnerCancel = setTimeout(that.moveRunner.bind(that), 1000);
    }
    this.paused = !this.paused;
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
    }
  }
  
  updateTrackLevel() {
    const progress = (
      (this.enemyBaseSpeed() - this.speed.lb) / 
      (this.speed.ub - this.speed.lb)
    );
    this.backgroundMusic.updateTrackLevel(progress);
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
  isCharacter(tile) { return !(tile.key in this.language); }
  
  get misses() {
    return parseInt(this.misses_.innerHTML);
  }
  set misses(val) {
    this.misses_.innerHTML = val;
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
Game.targetThinness = 72;
Game.defaultNumTargets = 20 * 20 / Game.targetThinness;
Game.enemies = {
  'chaser': ':>',
  'nommer': ':O',
  'runner': ':D',
};
// span in [0.2, 5]
Game.speeds = {
  'slowest': {'lb': 0.17, 'ub': 0.45, 'fullBand': 0.16},
  'slower':  {'lb': 0.26, 'ub': 0.53, 'fullBand': 0.32},
  'normal':  {'lb': 0.35, 'ub': 1.60, 'fullBand': 0.48},
  'faster':  {'lb': 0.59, 'ub': 1.70, 'fullBand': 0.55},
  'fastest': {'lb': 0.86, 'ub': 1.80, 'fullBand': 0.60},
};

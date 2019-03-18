'use strict';

/* 
 */
class Tile {
  constructor(pos, front, back) {
    this.pos   = pos;
    this.front = front;
    this.back  = back;
  }
  
  get key()    { return this.front.innerHTML; }
  set key(key) { this.front.innerHTML = key;  }
  
  get seq()    { return this.back.innerHTML;  }
  set seq(seq) { this.back.innerHTML = seq;   }
  
  get coloring() {
    return this.front.className;
  }
  set coloring(cl) {
    this.front.className = cl;
    this.back.className  = cl;
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

// Game base settings:
var targetThinness = 72;
var playerFace = ':|';
var enemies = {
  'chaser': ':><br>|||',
  'nommer': ':O',
  'runner': ':D',
};

/* Object keys:
 * -- width         : number - [10,30]
 * -- numTargets    : number
 * -- populations   : object{string: number}
 * -- grid          : array[Tile]
 *
 * -- langSelect    : <select>
 * -- language      : object{string: string}
 *
 * -- restartButton : <button>
 * -- pauseButton   : <button>
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
 * change sidebars into floating div's.
 * move options to left side.
 * move scoring to right side.
 * 
 * control border-spacing of grid elements during resize.
 * improve character visibility
 * Spice button
 * Cookies for: name, high-score(score, misses), version.
 * music / sound effects: update bgmusic track-level in enemyBaseSpeed.
 */
class Game {
  constructor(width=20, numPlayers=1) {
    if (width < 10) width = 10;
    if (width > 30) width = 30;
    this.grid       = [];
    this.width      = width;
    this.numTargets = Math.pow(this.width, 2) / targetThinness;
    document.documentElement.style.setProperty('--width', width);
    
    // Initialize Table display:
    let dGrid  = document.getElementById('grid');
    for (let y = 0; y < width; y++) {
      let row = dGrid.insertRow();
      
      for (let x = 0; x < width; x++) {
        let cell = row.insertCell();
        let fInner = document.createElement('div');
        fInner.className = 'flip-inner';
        
        let front = document.createElement('div');
        let back  = document.createElement('div');
        this.grid.push(new Tile(new Pos(x, y), front, back));

        fInner.appendChild(front);
        fInner.appendChild(back);
        cell.appendChild(fInner);
      }
    }
    
    // Create players:
    this.players = [];
    for (let i = 0; i < numPlayers; i++) {
      this.players.push(new Player(this, i));
    }
    
    window.onblur = () => this.togglePause('pause');
    this.makeUpperBar();
    this.makeLowerBar();
    
    // Setup invariants and then start the game:
    for (let enemy in enemies) { this[enemy] = new Pos(); }
    this.pauseButton.innerHTML = 'unpause';
    this.restart();
  }
  
  /* Makes info popup button, and
   * language and color scheme select.
   */
  makeUpperBar() {
    let ubar = document.getElementById('ubar');
    let row = ubar.insertRow();
    
    // Controls-popup button:
    let controls = document.createElement('button');
    controls.className = 'hBarItem';
    controls.innerHTML = 'controls';
    controls.onclick   = () => { this.popupControls() };
    row.insertCell().appendChild(controls);
    
    // Language radiobutton drop-down:
    let langSel = document.createElement('select');
    langSel.className = 'hBarItem';
    langSel.name = 'language';
    for (let lang in languages) {
      let choice = document.createElement('option');
      choice.innerHTML = lang;
      choice.value     = lang;
      langSel.add(choice);
    }
    langSel.value = 'eng';
    row.insertCell().appendChild(langSel);
    this.langSelect = langSel;
    
    // Coloring radiobutton drop-down:
    let colorSel = document.createElement('select');
    colorSel.className = 'hBarItem';
    colorSel.name = 'coloring';
    for (let fileName of csFileNames) {
      let choice = document.createElement('option');
      let fn = fileName.replace(/_/g, ' ');
      choice.innerHTML = fn;
      choice.value     = 'source/colors/' + fileName + '.css';
      colorSel.add(choice);
    }
    colorSel.onchange  = () => {
      document.getElementById('coloring').href = colorSel.value;
    };
    row.insertCell().appendChild(colorSel);
  }
  
  /* Creates restart and pause buttons,
   * and also score and misses counters.
   */
  makeLowerBar() {
    let lBar = document.getElementById('lbar');
    let row = lBar.insertRow();
    
    // Setup button displays:
    for (let bName of ['restart', 'pause',]) {
      let btn = document.createElement('button');
      btn.className = 'hBarItem';
      this[bName + 'Button'] = btn;
      btn.innerHTML = bName;
      row.insertCell().appendChild(btn);
    }
    
    // Assign callbacks to buttons:
    this.restartButton.onclick = () => this.restart();
    this.pauseButton.onclick   = () => this.togglePause();
    
    // Score displays:
    for (let player of this.players) {
      row.insertCell().appendChild(player.score_.parentElement);
    }
    this.misses_ = Player.makeScoreElement('misses');
    row.insertCell().appendChild(this.misses_.parentElement);
  }
  
  /* Shuffles entire grid and resets scores.
   * Automatically re-enables the pause button
   * if disabled by a game-over.
   */
  restart() {
    this.restartButton.blur();
    
    // Reset all display-key populations:
    this.language = languages[this.langSelect.value];
    this.populations = {};
    for (let key in this.language) {
      this.populations[key] = 0;
    }
    
    this.misses = 0;
    this.targets = [];
    this.heat = 0;
    
    // Re-shuffle all tiles:
    for (let tile of this.grid) {
      tile.key = ' ';
      tile.seq = '<br>';
      tile.coloring = 'tile';
    }
    for (let tile of this.grid) {
      this.shuffle(tile.pos);
    }
    
    // After spawing characters, spawn targets:
    for (let player of this.players) { player.restart(); }
    this.spawnCharacters();
    this.spawnTargets();
    
    // Start the characters moving:
    this.togglePause('pause');
    this.togglePause('unpause');
    this.pauseButton.disabled = false;
  }
  
  // Only used as a helper method in restart().
  spawnCharacters() {
    // Spawn the players:
    let middle = Math.floor(this.width / 2);
    for (let player of this.players) {
      player.moveOnto(new Pos(middle + player.num, middle));
    }
    
    // Spawn enemies:
    let slots = Pos.corners(this.width, Math.floor(this.width/10));
    slots.sort((a, b) => Math.random() - 0.5);
    for (let enemy in enemies) {
      this.moveCharOnto(enemy, slots.shift());
    }
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
    let valid = [];
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
    let weights = new Map();
    let lowest = Math.min(...Object.values(this.populations));
    valid.forEach(key => weights.set(
      key, Math.pow(4, lowest - this.populations[key])
      ));
    let choice = weightedChoice(weights);
    
    // Handle choice:
    this.populations[choice]++;
    let tile = this.tileAt(pos);
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
    let bell = (p1, p2, radius) => {
      let dist = p1.sub(p2).norm() / this.width;
      let exp = Math.pow(2 * dist / radius, 2);
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
    
    let weights = new Map();
    for (let chPos of choices) {
      let playersWeight = this.players.map((player) => {
        return bell(player.pos, chPos, 1 / 3);
      });
      weights.set(chPos, 
        5/3 * bell(center, chPos, 0.8) +
        (playersWeight.reduce((a, b) => a + b, 0) / this.players.length) + 
        bell(this.nommer, chPos, 1/3)
      );
    }
    
    // Spawn targets until the correct #targets is met:
    while(this.targets.length < this.numTargets) {
      let choice = weightedChoice(weights);
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
    let yLower = Math.max(0,          pos.y - radius);
    let yUpper = Math.min(this.width, pos.y + radius + 1);
    let xLower = Math.max(0,          pos.x - radius);
    let xUpper = Math.min(this.width, pos.x + radius + 1);
    
    let neighbors = [];
    for (let y = yLower; y < yUpper; y++) {
      for (let x = xLower; x < xUpper; x++) {
        neighbors.push(this.tileAt(new Pos(x, y)));
      }
    }
    // Filter out tiles that are characters:
    return neighbors.filter(
      nbTile => nbTile.key in this.language);
  }
  
  closestPlayer(origin) {
    let players = this.players.slice();
    let dist = (player) => player.pos.sub(origin).squareNorm();
    players.sort((a, b) => dist(a) - dist(b));
    return players[0];
  }
  
  // TODO: this will need to somehow tell which player triggered the event.
  //   triggered by some incoming remote data package:
  movePlayer(event) {
    if (!event.shiftKey) {
      this.players[0].move(event.key);
    } else {
      this.players[1].move(event.key);
    }
  }
  
  /* Chaser moves in the direction of the player.
   * Speed is a function of player's score and
   * misses. May miss the player when they are
   * moving quickly and have a trail.
   */
  moveChaser() {
    this.moveCharOffOf('chaser', true);
    
    // Choose a player to target:
    let tgPlayer = this.closestPlayer(this.chaser);
    let dest     = tgPlayer.pos;
    let speed    = this.enemyBaseSpeed();
    
    // Chaser may miss if the player is moving quickly:
    let maxMissWeight = 4, equivPoint = 4;
    let power   = tgPlayer.avgPeriod() * speed / equivPoint;
    let weights = new Map();
    weights.set(false, 1);
    weights.set(true,  Math.pow(maxMissWeight, 1 - power));
    
    if (weightedChoice(weights) && tgPlayer.trail.length > 0) {
      dest = tgPlayer.trail[tgPlayer.trail.length-1];
      
    // Handle if the chaser would land on the player:
    } else if ((this.chaser.sub(tgPlayer.pos)).squareNorm() == 1) {
      this.moveCharOffOf('chaser', true);
      this.tileAt(tgPlayer.pos).coloring = 'chaser';
      this.gameOver();
      return;
    }
    
    // Execute the move:
    dest = this.enemyDest(this.chaser, dest);
    this.moveCharOnto('chaser', dest);
    
    // Setup the timed loop:
    let loop = this.moveChaser.bind(this);
    this.chaserCancel = setTimeout(loop, 1000 / speed);
  }
  
  /* Nommer moves toward a target and avoids
   * competition with the player for a target.
   * Speed augented by burst that jumps up when
   * the player consumes a target, and cools down
   * as the nommer moves.
   */
  moveNommer() {
    this.moveCharOffOf('nommer');
    let targets = this.targets.slice();
    
    // Get all targets exluding the third which are closest to the players:
    let prox = (tgPos) => Math.min(...this.players.map(
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
    this.moveCharOnto('nommer', dest, true);
    
    // Setup the timed loop:
    let loop = this.moveNommer.bind(this);
    let speed = this.enemyBaseSpeed(0.05) * (this.heat / 5 + 1);
    this.nommerCancel = setTimeout(loop, 1000 / speed);
  }
  
  /* Runner moves away from the player using
   * hidden corner strategy. Speed is a funct-
   * ion of distance from the player.
   */
  moveRunner(escape=false) {
    this.moveCharOffOf('runner', true);
    
    // First, handle if the runner was caught:
    let caught = () => this.players.some((player) =>
      player.pos.sub(this.runner).squareNorm() == 1 );
    if (caught() && !escape) {
      // TODO: Play the caught sound here:
      this.misses = Math.floor(this.misses * 2 / 3);
    }
    
    let dest;
    let closestPlayer = this.closestPlayer(this.runner).pos;
    
    // If the runner is a safe distance from the player:
    if (this.runner.sub(closestPlayer).norm() >= this.width / 3) {
      // Follow the chaser.
      let toChaser   = this.chaser.sub(this.runner);
      let fromNommer = this.runner.sub(this.nommer);
      fromNommer = fromNommer.mul(this.width/9/fromNommer.norm())
      let rand = Pos.rand(2, true);
      dest = this.runner.add(toChaser).add(fromNommer).add(rand);
      
    // If the runner is NOT a safe distance from the player:
    } else {
      dest = this.cornerStrat1();
      // Additional vector to avoid the player:
      let cornerDist = Math.pow(dest.sub(this.runner).norm(), 2);
      let fromPlayer = this.runner.sub(closestPlayer);
      fromPlayer = fromPlayer.mul(
        Math.pow(cornerDist / fromPlayer.norm(), 0.3));
      dest = dest.add(fromPlayer);
    }
    
    // Execute the move:
    dest = this.enemyDest(this.runner, dest);
    this.moveCharOnto('runner', dest);
    
    // Calculate how fast the runner should move:
    closestPlayer = this.closestPlayer(this.runner).pos;
    let speedup = 2.94; // The maximum frequency multiplier.
    let power   = 5.5; // Increasing this shrinks high-urgency range.
    let dist = dest.sub(closestPlayer).squareNorm();
    let urgency = Math.pow((this.width + 1 - dist) / this.width, power);
    urgency = urgency * (speedup - 1) + 1;
    
    // Setup the timed loop:
    let loop = this.moveRunner.bind(this, caught());
    this.runnerCancel = setTimeout(loop, 1000 / urgency);
  }
  // Deprecated. use cornerStrat1
  cornerStrat0() {
    // Choose a corner to move to.
    // *Bias towards closest to runner:
    let corners = Pos.corners(this.width, Math.floor(this.width / 8));
    let dist  = (cnPos) => this.runner.sub(cnPos).squareNorm();
    corners.sort((a, b) => dist(b) - dist(a));
    
    // Exclude the two closest to player:
    let closestPlayer = this.closestPlayer(this.runner).pos;
    let danger = (cnPos) => closestPlayer.sub(cnPos).squareNorm();
    corners.sort((a, b) => danger(a) - danger(b));
    corners = corners.slice(2);
    
    // Choose that closest to the runner:
    corners.sort((a, b) => dist(a) - dist(b));
    return corners[0];
  }
  cornerStrat1() {
    let corners = Pos.corners(this.width, Math.floor(this.width / 8));
    
    // Exclude the closest and furthest corners from the closest player:
    let closestPlayer = this.closestPlayer(this.runner).pos;
    let danger = (cnPos) => closestPlayer.sub(cnPos).squareNorm();
    corners.sort((a, b)  => danger(a) - danger(b));
    corners = corners.slice(1, 3);
    
    // Choose the safest remaining corner:
    let virtualPos = this.runner.add(this.runner.sub(closestPlayer));
    let safety = (cnPos) => cnPos.sub(virtualPos).squareNorm();
    corners.sort((a, b)  => safety(a) - safety(b));
    return corners[0];
    
  }
  
  
  // All enemy moves need to pass through this function:
  enemyDiffTrunc(origin, dest) {
    let diff = dest.sub(origin);
    // If there's no diagonal part, truncate and return:
    if (diff.x == 0 || diff.y == 0 || diff.x == diff.y) {
      return diff.trunc(1);
    }
    let abs = diff.abs();
    
    // Decide whether to keep the diagonal:
    // When axisPercent ~ 1, diagonal component is small.
    let axisPercent = Math.abs(abs.x-abs.y) / (abs.x+abs.y);
    
    let weights = new Map();
    weights.set(true,  axisPercent);
    weights.set(false, 1 - axisPercent);
    if (weightedChoice(weights)) {
      if      (abs.x > abs.y) { diff.y = 0; }
      else if (abs.x < abs.y) { diff.x = 0; }
    }
    // Return the truncated step:
    return diff.trunc(1);
  }
  
  /* Returns a destination closer to the given
   * final destination, truncated down to a one-
   * tile distance from the origin.
   *
   * Assumes the character at origin has already
   * been temporarily removed.
   */
  enemyDest(origin, dest) {
    let diff = this.enemyDiffTrunc(origin, dest);
    let desired = origin.add(diff);
    let pref = altTile => {
      let altDist = origin.add(diff.mul(2)).sub(altTile.pos);
      return altDist.linearNorm();
    }
    
    // Handle if the desired step-destination has a conflict:
    if (!desired.inBounds(this.width) ||
      this.isCharacter(this.tileAt(desired))) {
      // Choose one of the two best alternatives:
      let alts = this.adjacent(origin);
      alts.sort((tA, tB) => pref(tB) - pref(tA));
      if (alts.length > 3) alts = alts.slice(3);
      
      // Generate weights:
      let weights = new Map();
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
   * curveDown is in the rage [0, 1]. It
   * compresses the effect of the input.
   */
  enemyBaseSpeed(curveDown=0) {
    let scores = this.players.reduce((a, b) => a + b.score, 0);
    let obtained = Math.pow(scores + (this.misses), 1-curveDown);
    
    let high = 1.5, low = 0.35;
    let defaultNumTargets = 20 * 20 / targetThinness;
    let slowness = 25 * defaultNumTargets;
    
    let exp = Math.pow(obtained / slowness, 2);
    return (high - low) * (1 - Math.pow(2, -exp)) + low;
  }
  
  // 
  moveCharOffOf(character, notHungry) {
    let pos  = this[character];
    let tile = this.tileAt(pos);
    tile.key = ' ';
    tile.key = '<br>';
    this.shuffle(pos);
    
    // Handle coloring:
    if (this.players.some((player) => {
      return player.trail.some(tlPos => pos.equals(tlPos))
    })) {
      tile.coloring = 'trail';
    } else if (notHungry && 
        this.targets.some(tgPos => pos.equals(tgPos))) {
      tile.coloring = 'target';
    } else {
      tile.coloring = 'tile';
    }
  }
  
  /* Assumes that dest does not contain a character.
   * Handles book-keeping tasks such as spawning new
   * targets, and trimming the player's trail.
   */
  moveCharOnto(character, dest, hungry=false) {
    let tile = this.tileAt(dest);
    if (this.isCharacter(tile)) throw 'cannot land on character.';
    this.populations[tile.key]--;
    this[character] = dest;
    tile.coloring   = character;
    tile.key = enemies[character];
    tile.seq = '<br>';
    
    // Check if a hungry character landed on a target:
    if (!hungry) { return; }
    for (let i = 0; i < this.targets.length; i++) {
      // If a hungry character landed on a target:
      if (dest.equals(this.targets[i])) {
        this.misses += 1;
        // Remove this Pos from the targets list:
        this.targets.splice(i, 1);
        for (let player of this.players) { player.trimTrail(); }
        this.spawnTargets();
        break;
      }
    }
  }
  
  /* Freezes enemies and disables player movement.
   * Toggles the pause button to unpause on next click.
   */
  togglePause(force=undefined) {
    this.pauseButton.blur();
    
    // Handle if a method is requesting to
    // force the game to a certain state:
    if (force == 'pause') {
      this.pauseButton.innerHTML = 'pause';
      this.togglePause();
      return;
    } else if (force == 'unpause') {
      this.pauseButton.innerHTML = 'unpause';
      this.togglePause();
      return;
    }
    
    let that = this;
    // Freeze all the enemies:
    clearTimeout(that.chaserCancel);
    clearTimeout(that.nommerCancel);
    clearTimeout(that.runnerCancel);
    
    // The player pressed the pause button:
    if (this.pauseButton.innerHTML == 'pause') {
      this.pauseButton.innerHTML = 'unpause';
      document.body.style.filter = 'var(--pauseFilter)';
      document.body.onkeydown    = () => {};
      
    // The user pressed the un-pause button:
    } else {
      this.pauseButton.innerHTML = 'pause';
      document.body.style.filter = '';
      document.body.onkeydown = () => this.movePlayer(event);
      this.chaserCancel = setTimeout(that.moveChaser.bind(that), 1000);
      this.nommerCancel = setTimeout(that.moveNommer.bind(that), 1000);
      this.runnerCancel = setTimeout(that.moveRunner.bind(that), 1000);
    }
  }
  
  /* Forces / waits for the player to restart the game.
   */
  gameOver() {
    // TODO: play a gameOver sound here:
    this.pauseButton.disabled = true;
    this.togglePause('pause');
  }
  
  /* TODO:
   */
  popupControls() {
    ;
  }
  
  tileAt(pos) { return this.grid[pos.y * this.width + pos.x]; }
  isCharacter(tile) { return !(tile.key in this.language); }
  
  get misses() {return parseInt(this.misses_.innerHTML);}
  set misses(val) {this.misses_.innerHTML = val;}
}


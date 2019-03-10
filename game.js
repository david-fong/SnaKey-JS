'use strict';

/* cells are given an id following: 't<pos.x>,<pos.y>'
 */
class Tile {
  constructor(pos, cell) {
    this.pos  = pos;
    this.cell = cell;
  }
  get key()    { return this.cell.innerHTML; }
  set key(key) { this.cell.innerHTML = key;  }
  
  get coloring()   { return this.cell.className; }
  set coloring(cl) { this.cell.className = cl;   }
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
var faces = {
  'player': ':|',
  'chaser': ':>',
  'nommer': ':O',
  'runner': ':D',
};

/* Object keys:
 * -- width         : number
 * -- langSelect    : <select>
 * -- language      : object{string: string}
 * -- populations   : object{string: number}
 * -- grid          : array[Tile]
 * -- numTargets    : number
 *
 * -- restartButton : <button>
 * -- pauseButton   : <button>
 * -- gameIsOver    : boolean
 *
 * -- moveStr       : string
 * -- player        : Pos
 * -- trail         : array[Pos]
 * -- timeDeltas    : array[number]
 * -- startTime     : number
 * -- score         : <span>
 *
 * -- targets       : array[Pos]
 * -- chaser        : Pos
 * -- nommer        : Pos
 * -- runner        : Pos
 * -- heat          : number
 * -- misses        : <span>
 *
 *
 * TODO:
 * Spice button
 * Mute button
 * make cornerStrat1: blacklist only 1 corner,
 *   sort by runner-corner and player-corner dists.
 * Cookies for: name, high-score(score, misses), version.
 * popupControls();
 */
class Game {
  constructor(width=20) {
    this.grid  = [];
    this.width = width;
     // TODO @below: do this calculation on spot where used?
    this.numTargets  = this.width * this.width / targetThinness;
    
    // Initialize Table display:
    let dGrid = document.getElementById('grid');
    document.documentElement.style.setProperty('--width', width);
    for (let y = 0; y < width; y++) {
      let dRow = dGrid.insertRow();
      for (let x = 0; x < width; x++) {
        let cell        = dRow.insertCell();
        let div = document.createElement('div');
        div.id         = 't' + x + ',' + y;
        div.className  = 'tile';
        this.grid.push(new Tile(new Pos(x, y), div));
        cell.appendChild(div);
      }
    }
    // Describe animation for pausing/unpausing the game:
    this.pauseAnim = () => {
      this.pauseButton.disabled = true;
      document.body.style.animationPlayState = 'running';
    }
    document.body.addEventListener('animationiteration', () => {
      document.body.style.animationPlayState = 'paused';
      if (!this.gameIsOver) this.pauseButton.disabled = false;
    });
    window.onblur = () => {
      if (this.pauseButton.innerHTML == 'pause') {
        this.pauseAnim();
      }
      this.togglePause('pause');
    };
    
    this.makeUpperBar();
    this.makeLowerBar();
    
    // Setup invariants and then start the game:
    for (let character in faces) {
      this[character] = new Pos();
    }
    this.gameIsOver = true;
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
      console.log(fileName);
      let choice = document.createElement('option');
      let fn = fileName.replace(/_/g, ' ');
      choice.innerHTML = fn;
      choice.value     = 'colors/' + fileName + '.css';
      colorSel.add(choice);
    }
    colorSel.onchange  = () => {
      document.getElementById('coloring').href = colorSel.value;
    };
    row.insertCell().appendChild(colorSel);
    colorSel.selectedIndex = 0;
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
    this.restartButton.onclick = () => { this.restart(); };
    this.pauseButton.onclick   = () => { this.togglePause(); this.pauseAnim(); };
    
    // Score displays:
    for (let lb of ['score', 'misses']) {
      let cell = row.insertCell()
      cell.className = 'hBarItem';
      
      let label = document.createElement('span');
      label.innerHTML = lb + ': ';
      cell.appendChild(label);
      
      let counter = document.createElement('span');
      counter.style.width = '3ch';
      counter.style.textAlign = 'left';
      cell.appendChild(counter);
      this[lb + '_'] = counter;
    }
  }
  
  /* Shuffles entire grid and resets scores.
   * Automatically re-enables the pause button
   * if disabled by a game-over.
   */
  restart() {
    // Reset all display-key populations:
    this.language = languages[this.langSelect.value];
    this.populations = {};
    for (let key in this.language) {
      this.populations[key] = 0;
    }
    
    this.score  = 0;
    this.misses = 0;
    
    this.targets = [];
    this.trail   = [];
    this.moveStr = '';
    let date = new Date();
    this.startTime = date.getSeconds();
    this.timeDeltas = [];
    this.heat = 0;
    
    // Re-shuffle all tiles:
    for (let tile of this.grid) {
      tile.key = '_';
      tile.coloring = 'tile';
    }
    for (let tile of this.grid) {
      this.shuffle(tile.pos);
    }
    
    // After spawing characters, spawn targets:
    this.spawnCharacters();
    this.spawnTargets();
    
    // Start the characters moving:
    if (this.pauseButton.innerHTML == 'unpause') {
      this.pauseAnim();
    }
    this.togglePause('pause');
    this.togglePause('unpause');
    if (this.gameIsOver) {
      this.gameIsOver = false;
    }
  }
  
  // Only used as a helper method in restart().
  spawnCharacters() {
    // Spawn the player:
    let mid = Math.floor(this.width / 2);
    this.moveCharOnto('player', new Pos(mid, mid));
    
    // Spawn enemies:
    let slots = Pos.corners(this.width, 4);
    slots.sort((a, b) => Math.random() - 0.5);
    for (let enemy of ['chaser', 'nommer', 'runner']) {
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
        l[nbTile.key].includes(l[opt]) ||
        l[opt].includes(l[nbTile.key])
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
    this.tileAt(pos).key = choice;
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
      weights.set(chPos, 
        5/3 * bell(center, chPos, 0.8) +
         bell(this.player, chPos, 1/3) +
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
  
  /* 
   */
  movePlayer(event) {
    let key = event.key;
    
    // If the player wants to backtrack:
    if (key == ' ') {
      // Fail if the trail is empty or choked by an enemy:
      if (this.trail.length == 0 || 
          this.isCharacter(this.tileAt(
            this.trail[this.trail.length-1]))) {
        return;
      }
      this.moveCharOffOf('player');
      this.moveCharOnto('player', this.trail.pop(), true);
      return;
    }
    
    // If the player didn't want to backtrack:
    this.moveStr += key;
    let adj = this.adjacent(this.player);
    let destTiles = adj.filter(adjTile => 
      this.moveStr.endsWith(this.language[adjTile.key]));
      
    // Handle if the player typed a sequence
    // corresponding to an adjacent tile:
    if (destTiles.length == 1) {
      this.moveStr = '';
      let date = new Date();
      this.timeDeltas.push(date.getSeconds() - this.startTime);
      this.startTime = date.getSeconds();
      
      this.moveCharOffOf('player');
      this.tileAt(this.player).coloring = 'trail';
      this.trail.push(this.player);
      this.trimTrail();
      this.moveCharOnto('player', destTiles[0].pos, true);
    }
  }
  
  /* Used to moderate the player's trail length.
   * Should be called whenever a target is consumed,
   * or whenever the player moves.
   */
  trimTrail() {
    if (this.trail.length == 0) { return; }
    
    let net = (this.score) - 0.9 * this.misses;
    if (net < 0 || this.trail.length > Math.pow(net, 3/7)) {
      // The last element is the closest to the head.
      let popTile  = this.tileAt(this.trail.shift());
      let isTarget = this.targets.some(tgPos => popTile.pos.equals(tgPos));
      if (!this.isCharacter(popTile) && !isTarget) {
        popTile.coloring = 'tile';
      }
    }
  }
  
  /* Chaser moves in the direction of the player.
   * Speed is a function of player's score and
   * misses. May miss the player when they are
   * moving quickly and have a trail.
   */
  moveChaser() {
    this.moveCharOffOf('chaser', true);
    let dest = this.player;
    let speed = this.enemyBaseSpeed();
    
    // Chaser may miss if the player is moving quickly:
    let maxMissWeight = 4, equivPoint = 4;
    let power = this.playerAvgPeriod() * speed / equivPoint;
    let weights = new Map();
    weights.set(false, 1);
    weights.set(true, Math.pow(maxMissWeight, 1 - power));
    let miss = weightedChoice(weights);
    
    if (miss && this.trail.length > 0) {
      dest = this.trail[this.trail.length-1];
      
    // Handle if the chaser would land on the player:
    } else if ((this.chaser.sub(this.player)).squareNorm() == 1) {
      this.moveCharOffOf('chaser', true);
      this.tileAt(this.player).coloring = 'chaser';
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
    
    // Get all targets exluding the third which are closest to the player:
    let prox =  (tgPos) => this.player.sub(tgPos).squareNorm();
    targets.sort((a, b) => prox(a) - prox(b));
    targets = targets.slice(Math.floor(targets.length / 3));
    
    // Now, choose the target closest to the nommer:
    prox = (tgPos) => tgPos.sub(this.nommer).squareNorm();
    targets.sort((a, b) => prox(a) - prox(b));
    let dest = targets[0];
    
    // Decrease the player's heat stat:
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
    if (!escape && this.player.sub(this.runner).squareNorm() == 1) {
      this.misses = Math.floor(this.misses * 2 / 3);
    }
    let dest;
    // If the runner is a safe distance from the player:
    if (this.runner.sub(this.player).norm() >= this.width / 2) {
      // Follow the chaser.
      let toChaser   = this.chaser.sub(this.runner);
      let fromNommer = this.runner.sub(this.nommer);
      fromNommer = fromNommer.mul(this.width/9/fromNommer.norm())
      let rand = Pos.rand(2, true);
      dest = this.runner.add(toChaser).add(fromNommer).add(rand);
      
    // If the runner is NOT a safe distance from the player:
    } else {
      dest = this.cornerStrat0();
      // Additional vector to avoid the player:
      let cornerDist = Math.pow(dest.sub(this.runner).norm(), 2);
      let fromPlayer = this.runner.sub(this.player);
      fromPlayer = fromPlayer.mul(
        Math.pow(cornerDist / fromPlayer.norm(), 0.3));
      dest = dest.add(fromPlayer);
    }
    
    // Execute the move:
    dest = this.enemyDest(this.runner, dest);
    this.moveCharOnto('runner', dest);
    
    // Move again if still beside player:
    if (this.player.sub(this.runner).squareNorm() == 1) {
      this.moveRunner(true);
    }
    if (escape) return;
    
    // Calculate how fast the runner should move:
    let speedup = 2.9; // The maximum frequency multiplier.
    let power   = 5.5; // Increasing this shrinks high-urgency range.
    let dist = dest.sub(this.player).squareNorm();
    let urgency = Math.pow((this.width + 1 - dist) / this.width, power);
    urgency = urgency * (speedup - 1) + 1;
    
    // Setup the timed loop:
    let loop = this.moveRunner.bind(this);
    this.runnerCancel = setTimeout(loop, 1000 / urgency);
  }
  cornerStrat0() {
    // Choose a corner to move to.
    // *Bias towards closest to runner:
    let corners = Pos.corners(this.width, Math.floor(this.width / 8));
    let dist  = (cnPos) => this.runner.sub(cnPos).squareNorm();
    corners.sort((a, b) => dist(b) - dist(a));
    
    // Exclude the two closest to player:
    let danger = (cnPos) => this.player.sub(cnPos).squareNorm();
    corners.sort((a, b) => danger(a) - danger(b));
    corners = corners.slice(2);
    
    // Choose that closest to the runner:
    corners.sort((a, b) => dist(a) - dist(b));
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
    let obtained = Math.pow(this.score + (this.misses), 1-curveDown);
    let high = 1.5, low = 0.35;
    let defaultNumTargets = 20 * 20 / targetThinness;
    let slowness = 25 * defaultNumTargets;
    
    let exp = Math.pow(obtained / slowness, 2);
    return (high - low) * (1 - Math.pow(2, -exp)) + low;
  }
  
  /* 
   */
  playerAvgPeriod() {
    this.timeDeltas = this.timeDeltas.slice(-5);
    let date = new Date();
    let totalTime = this.timeDeltas.reduce((a, b) => a + b, 0) + 
      date.getSeconds() - this.startTime;
    return totalTime / (this.timeDeltas.length + 1);
  }
  
  // 
  moveCharOffOf(character, notHungry) {
    let pos  = this[character];
    let tile = this.tileAt(pos);
    tile.key = '_';
    this.shuffle(pos);
    
    // Handle coloring:
    if (this.trail.some(tlPos => pos.equals(tlPos))) {
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
    if (this.isCharacter(tile)) throw 'moving character onto character not allowed';
    this.populations[tile.key]--;
    this[character] = dest;
    tile.coloring = character;
    tile.key = faces[character];
    
    // Check if a hungry character landed on a target:
    if (!hungry) { return; }
    for (let i = 0; i < this.targets.length; i++) {
      // If a hungry character landed on a target:
      if (dest.equals(this.targets[i])) {
        if (character == 'player') {
          this.score += 1;
          this.heat = this.numTargets * Math.sqrt(
            this.heat / this.numTargets + 1);
        } else {
          this.misses += 1;
        }
        // Remove this Pos from the targets list:
        this.targets.splice(i, 1);
        this.trimTrail();
        this.spawnTargets();
        break;
      }
    }
  }
  
  /* Freezes enemies and disables player movement.
   * Toggles the pause button to unpause on next click.
   */
  togglePause(force=undefined) {
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
      document.body.onkeydown    = () => {};
      
    // The user pressed the un-pause button:
    } else {
      this.pauseButton.innerHTML = 'pause';
      document.body.onkeydown = () => this.movePlayer(event);
      // Unfreeze all the enemies:
      this.chaserCancel = setTimeout(that.moveChaser.bind(that), 1000);
      this.nommerCancel = setTimeout(that.moveNommer.bind(that), 1000);
      this.runnerCancel = setTimeout(that.moveRunner.bind(that), 1000);
    }
  }
  
  /* Forces / waits for the player to restart the game.
   */
  gameOver() {
    this.gameIsOver = true;
    this.togglePause('pause');
    this.pauseAnim();
  }
  
  /* TODO:
   */
  popupControls() {
    ;
  }
  
  tileAt(pos) { return this.grid[pos.y * this.width + pos.x]; }
  isCharacter(tile) { return !(tile.key in this.language); }
  
  get score()  {return parseInt(this.score_.innerHTML );}
  get misses() {return parseInt(this.misses_.innerHTML);}
  set score(val)  {this.score_.innerHTML  = val;}
  set misses(val) {this.misses_.innerHTML = val;}
}


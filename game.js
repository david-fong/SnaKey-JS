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
  set coloring(cn) { this.cell.className = cn;   }
}

// weights is a map from choices to their weights.
function weightedChoice(weights) {
  let sum = (accumulator, another) => accumulator + another;
  let total_weight = Object.values(weights).reduce(sum);
  let random = Math.random() * total_weight;
  
  for (let [choice, weight] of Object.entries(weights)) {
    if (random < weight) return choice;
    else random -= weight;
  }
  document.write('uhoh');
  return Object.keys(weights)[0];
}

// Game base settings:
var targetThinness = 72;
var faces = {
  'player': ':|',
  'chaser': ':>',
  'nommer': ':O',
  'runner': ':D',
};

class Game {
  constructor(width=20) {
    /* Internal representation of display grid: 
     * 2D row-order-array of tiles, which have*
     * .pos (x, y) and .key properties. */
    this.grid  = [];
    this.width = width;
    this.lang_choice = 'english_lower';
    this.numTargets  = this.width * this.width / targetThinness;
    
    // Initialize Table display:
    let dGrid = document.createElement('table');
    dGrid.id = 'grid';
    dGrid.className = 'grid';
    for (let y = 0; y < width; y++) {
      let row = [];
      let dRow = dGrid.insertRow();
      for (let x = 0; x < width; x++) {
        let cell        = dRow.insertCell();
        cell.id         = 't' + x + ',' + y;
        cell.className  = 'tile';
        row.push(new Tile(new Pos(x, y), cell));
      }
      this.grid.push(row);
    }
    // Describe animation for pausing/unpausing the game:
    document.body.appendChild(dGrid);
    this.pauseAnim = () => {
      this.pauseButton.disabled = true;
      dGrid.style.animationPlayState = 'running';
    }
    dGrid.addEventListener('animationiteration', () => {
      dGrid.style.animationPlayState = 'paused';
      if (!this.gameIsOver) this.pauseButton.disabled = false;
    });
    
    this.makeLowerBar();
    
    // Create fields for each character's position:
    for (let character in faces) {
      this[character] = new Pos();
    }
    
    // Start the game:
    this.gameIsOver = true;
    this.restart();
  }
  
  // Called only once during instance initialization.
  makeLowerBar() {
    let lBar = document.createElement('table');
    lBar.className = 'lBar';
    let row = lBar.insertRow();
    
    // Setup button displays:
    for (let bName of ['restart', 'pause',]) {
      let ppty = document.createElement('button');
      this[bName + 'Button'] = ppty;
      ppty.innerHTML = bName;
      row.insertCell().appendChild(ppty);
    }
    
    // Assign callbacks to buttons:
    this.restartButton.onclick = () =>   this.restart();
    this.pauseButton.onclick   = () => { this.togglePause(); this.pauseAnim(); };
    
    // Score displays:
    this.score_  = row.insertCell();
    this.losses_ = row.insertCell();
    
    document.body.appendChild(lBar);
  }
  
  /* Shuffles entire grid and resets scores.
   * Automatically re-enables the pause button
   * if disabled by a game-over.
   */
  restart() {
    // Reset all display-key populations:
    this.language = languages[this.lang_choice];
    this.populations = {};
    for (let key in this.language) {
      this.populations[key] = 0;
    }
    
    this.score  = 0;
    this.losses = 0;
    
    this.targets = [];
    this.trail   = [];
    this.moveStr = '';
    let date = new Date();
    this.startTime = date.getSeconds();
    this.timeDeltas = [];
    this.heat = 0;
    
    // Re-shuffle all tiles:
    for (let row of this.grid)
      for (let tile of row) {
        tile.key = '_';
        tile.coloring = 'tile';
      }
    for (let y = 0; y < this.width; y++)
      for (let x = 0; x < this.width; x++)
        this.shuffle(new Pos(x, y));
    
    // After spawing characters, spawn targets:
    this.spawnCharacters();
    this.spawnTargets();
    
    // Start the characters moving:
    if (!this.gameIsOver) {
      if (this.pauseButton.innerHTML == 'unpause') {
        this.gameIsOver = true;
      }
      this.togglePause('pause');
    }
    this.togglePause('unpause');
    if (this.gameIsOver) {
      this.gameIsOver = false;
      this.pauseAnim();
    }
  }
  
  // Only used as a helper method in restart().
  spawnCharacters() {
    // Spawn all characters by moving
    // them onto their start positions:
    for (let character in faces) {
      this.moveCharOffOf(character);
    }
    
    // Spawn the player:
    let mid = Math.floor(this.width / 2);
    this.moveCharOnto('player', new Pos(mid, mid));
    
    // Spawn enemies:
    let slots = Pos.corners(this.width);
    slots.sort((a, b) => 0.5 - Math.random());
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
    let neighbors = this.adjacent(pos, 2);
    
    // Filter all keys keeping those that
    // won't cause movement ambiguities:
    let valid = [];
    let l = this.language;
    for (let opt in this.language) {
      if (!neighbors.some(nbTile => 
        l[nbTile.key].includes(l[opt]) ||
        l[opt].includes(l[nbTile.key])
      )) {
        valid.push(opt);
      }
    }
    
    // Initialize weights for valid keys and choose one:
    let weights = {};
    for (let key of valid) { weights[key] = this.populations[key]; }
    let lowest = Math.min(...Object.values(weights));
    for (let key of valid) { weights[key] = Math.pow(4, lowest-weights[key]); }
    let choice = weightedChoice(weights);
    
    // Handle choice:
    this.populations[choice]++;
    this.tileAt(pos).key = choice;
  }
  
  /* Highlights an existing tile as a target:
   */
  spawnTargets() {
    while(this.targets.length < this.numTargets) {
      var destPos  = Pos.rand(this.width, this.width);
      var destTile = this.tileAt(destPos);
      
      // Check if the dest is valid:
      // (ie. it is not a character and it is not already a target:
      let alreadyTarget = this.targets.some(tgPos => destPos.equals(tgPos));
      while(this.isCharacter(destTile) || alreadyTarget) {
        var destPos  = Pos.rand(this.width, this.width);
        var destTile = this.tileAt(destPos);
      }
      
      this.targets.push(destPos);
      this.tileAt(destPos).coloring = 'target';
    }
  }
  
  /* Returns a collection of tiles in the 
   * (2*radius + 1)^2 area centered at pos,
   * all satisfying the condition that they
   * do not contain the player or an enemy:
   */
  adjacent(pos, radius=1) {
    // Get all neighboring tiles in 5x5 area:
    let lb    = Math.max(0,          pos.y - radius);
    let ub    = Math.min(this.width, pos.y + radius + 1);
    let rows  = this.grid.slice(lb, ub);
    lb        = Math.max(0,          pos.x - radius);
    ub        = Math.min(this.width, pos.x + radius + 1);
    rows      = rows.map(row => row.slice(lb, ub));
    
    // Filter out tiles that are characters:
    let neighbors = [].concat(...rows);
    return neighbors.filter(nbTile => nbTile.key in this.language, this); // TODO: check 'this'
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
    
    let net = (this.score) - 0.9 * this.losses;
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
   */
  moveChaser() {
    this.moveCharOffOf('chaser', true);
    let dest = this.player;
    
    // TODO: Miss logic goes here:
    let miss = false;
    if (miss) {
      dest = this.trail[this.trail.length-1];
    } else {
      // Handle if the chaser would land on the player:
      if ((this.chaser.sub(this.player)).squareNorm() == 1) {
        this.moveCharOffOf('chaser');
        this.tileAt(this.player).coloring = 'chaser';
        this.gameOver();
      }
    }
    
    dest = this.enemyDest(this.chaser, dest);
    this.moveCharOnto('chaser', dest);
    let loop = this.moveChaser.bind(this);
    this.chaserCancel = setTimeout(loop, 1100);
  }
  
  /* Nommer moves toward a target and avoids
   * competition with the player for a target.
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
    if (this.heat - 1  >= 0) this.heat--;
    
    dest = this.enemyDest(this.nommer, dest);
    this.moveCharOnto('nommer', dest, true);
    let loop = this.moveNommer.bind(this);
    this.nommerCancel = setTimeout(loop, 800);
  }
  
  moveRunner() {
    this.moveCharOffOf('runner', true);
    
    // First, check if the runner was caught:
    if (this.player.sub(this.runner).squareNorm() == 1) {
      this.losses = Math.floor(this.losses * 2 / 3);
    }
    
    // Choose a corner to move to.
    // *Bias towards closest to runner:
    let corners = Pos.corners(this.width, Math.floor(this.width / 6));
    let dist  = (cnPos) => this.runner.sub(cnPos).squareNorm();
    corners.sort((a, b) => dist(b) - dist(a));
    
    // Exclude the two closest to player:
    let danger = (cnPos) => this.player.sub(cnPos).squareNorm();
    corners.sort((a, b) => danger(a) - danger(b));
    corners = corners.slice(2);
    
    // Choose that closest to the runner:
    corners.sort((a, b) => dist(a) - dist(b));
    let dest = corners[0];
    
    dest = this.enemyDest(this.runner, dest);
    this.moveCharOnto('runner', dest);
    let loop = this.moveRunner.bind(this);
    this.runnerCancel = setTimeout(loop, 800);
  }
  
  // All enemy moves need to pass through this function:
  enemyDiffTrunc(origin, dest) {
    let diff = dest.sub(origin);
    // If there's no diagonal part, truncate and return:
    if (diff.x == 0 || diff.y == 0) { return diff.trunc(1); }
    let abs = diff.abs();
    
    // Decide whether to keep the diagonal:
    // When axisPercent ~ 1, diagonal component is small.
    let axisPercent = Math.abs(abs.x-abs.y) / (abs.x+abs.y);
    if (weightedChoice({
        true:      axisPercent,
        false: 1 - axisPercent,})) {
      if (abs.x > abs.y) {
        diff.y = 0;
      } else if (abs.x < abs.y) {
        diff.x = 0;
      }
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
    function pref(altTile) {
      return origin.add(diff.mul(2)).sub(altTile.pos).linearNorm();
    }
    
    // Handle if the desired step-destination has a conflict:
    if (!desired.inBounds(this.width) ||
      this.isCharacter(this.tileAt(desired))) {
      // Choose one of the two best alternatives:
      let alts = this.adjacent(origin);
      alts.push(this.tileAt(origin));
      alts.sort((tA, tB) => pref(tA) - pref(tB));
      
      // Generate weights:
      weights = {};
      for (let altTile of alts) {
        weights[altTile.pos] = Math.pow(4, pref(altTile));
      }
      // Return a weighted choice:
      return weightedChoice(weights);
      
    } else {
      return desired;
    }
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
    this[character] = dest;
    let tile = this.tileAt(dest);
    this.populations[tile.key]--;
    tile.coloring = character;
    tile.key = faces[character];
    
    // Check if a hungry character landed on a target:
    if (!hungry) { return; }
    for (let i = 0; i < this.targets.length; i++) {
      // If a hungry character landed on a target:
      if (dest.equals(this.targets[i])) {
        if (character == 'player') { this.score  += 1; }
        else                       { this.losses += 1; }
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
    clearTimeout(that.chaserCancel);
    clearTimeout(that.nommerCancel);
    clearTimeout(that.runnerCancel);
    
    // The player pressed the pause button:
    if (this.pauseButton.innerHTML == 'pause') {
      this.pauseButton.innerHTML = 'unpause';
      document.body.onkeydown    = () => {};
      // TODO: freeze all the enemies:
      
    // The user pressed the un-pause button:
    } else {
      this.pauseButton.innerHTML = 'pause';
      document.body.onkeydown = () => this.movePlayer(event);
      // TODO: unfreeze all the enemies:
      this.chaserCancel = setTimeout(that.moveChaser.bind(that), 1000);
      this.nommerCancel = setTimeout(that.moveNommer.bind(that), 1000);
      this.runnerCancel = setTimeout(that.moveRunner.bind(that), 1000);
    }
  }
  
  gameOver() {
    this.gameIsOver = true;
    this.pauseAnim();
    this.togglePause('pause');
    this.pauseButton.disabled = true;
  }
  
  tileAt(pos) { return this.grid[pos.y][pos.x]; }
  isCharacter(tile) { return !tile.key in this.language; }
  
  get score()  {return parseInt(this.score_.innerHTML );}
  get losses() {return parseInt(this.losses_.innerHTML);}
  set score(val)  {this.score_.innerHTML  = val;}
  set losses(val) {this.losses_.innerHTML = val;}
}


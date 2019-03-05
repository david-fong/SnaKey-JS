class Pos {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  // Basic arithmetic functions:
  add(other) {
    return new Pos(this.x+other.x, this.y+other.y);
  }
  sub(other) {
    return new Pos(this.x - other.x, this.y - other.y);
  }
  abs() {
    return new Pos(Math.abs(this.x), Math.abs(this.y));
  }
  
  // Distance functions:
  norm() {
    return Math.sqrt()
  }
  squareNorm() {
    let abs = this.abs();
    return Math.max(abs.x, abs.y);
  }
  linearNorm() {
    let abs = this.abs();
    return abs.x + abs.y;
  }
  
  // Bounds checking and adjustment:
  inBounds(bound) {
    let xInside = this.x >= 0 && this.x < bound;
    let xInside = this.y >= 0 && this.y < bound;
    return xInside && yInside;
  }
  trunc(radius) {
    let x = this.x;
    if (x < -radius) x = -radius;
    else if (x > radius) x = radius;
    
    let y = this.y;
    if (y < -radius) y = -radius;
    else if (y > radius) y = radius;
    
    return new Pos(x, y);
  }
  
  // Please only call on other Pos instances.
  equals(other) {
    return this.x == other.x && this.y == other.y;
  }
  
  // Bounds are exclusive:
  static rand(bound) {
    let x = Math.floor(Math.random() * bound);
    let y = Math.floor(Math.random() * bound);
    return new Pos(x, y);
  }
}

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

// weights is a dict from choices to their weights.
function weightedChoice(weights) {
  function sum(total, num) {return total + num;}
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
  constructor(width) {
    /* Internal representation of display grid: 
     * 2D row-order-array of tiles, which have*
     * .pos (x, y) and .key properties. */
    this.grid  = [];
    this.width = width;
    
    // Initialize Table display:
    let display = document.createElement('table');
    display.className = 'grid';
    for (let y = 0; y < width; y++) {
      let row = [];
      let d_row = display.insertRow();
      for (let x = 0; x < width; x++) {
        let cell        = d_row.insertCell();
        cell.id         = 't' + x + ',' + y;
        cell.className  = 'tile';
        row.push(new Tile(new Pos(x, y), cell));
      }
      this.grid.push(row);
    }
    document.body.appendChild(display);
    
    this.score_  = document.createElement('p');
    this.losses_ = document.createElement('p');
    document.body.appendChild(this.score_);
    document.body.appendChild(this.losses_);
    
    this.lang_choice = 'english_lower';
    this.numTargets  = this.width * this.width / targetThinness;
    
    // TODO: set all character fields / positions.
    this.player = new Pos(0, 0);
    this.chaser = new Pos(0, 0);
    this.nommer = new Pos(0, 0);
    this.runner = new Pos(0, 0);
    
    this.restart();
  }
  
  // Shuffles entire grid and resets scores.
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
    
    // Re-shuffle all tiles:
    for (let row of this.grid)
      for (let tile of row) {
        tile.key = '_';
        tile.coloring = 'tile';
      }
    for (let y = 0; y < this.width; y++)
      for (let x = 0; x < this.width; x++)
        this.shuffle(new Pos(x, y));
    
    this.spawnCharacters();
    
    // TODO: startTime, timeDeltas, heat:
    
    
    // After spawing characters, spawn targets:
    this.spawnTargets();
  }
  
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
    let lower = 0, upper = this.width - 1;
    let enemySpawns = [
      new Pos(lower, lower), new Pos(upper, lower),
      new Pos(lower, upper), new Pos(upper, upper),
    ];
    let enemies = ['chaser', 'nommer', 'runner'];
    for (let enemy of enemies) {
      let i = Math.floor(Math.random() * enemies.length);
      this.moveCharOnto(enemy, enemySpawns[i]);
      enemySpawns.splice(i, 1);
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
    
    // Filter all keys for those that
    // won't cause movement ambiguities:
    let valid = [];
    let l = this.language;
    for (let opt in this.language) {
      if (!neighbors.some(function(nbTile){
        let nb = l[nbTile.key];
        return nb.includes(l[opt]) || l[opt].includes(nb);
      }, this)) {
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
      let alreadyTarget = this.targets.some(function(targetPos){
        destPos.equals(targetPos);
      }, this);
      while(this.isCharacter(destTile) || alreadyTarget) {
        var destPos  = Pos.rand(this.width, this.width);
        var destTile = this.tileAt(destPos);
      }
      
      this.targets.push(destPos);
      this.tileAt(destPos).coloring = 'target';
    }
  }
  
  /* Returns a collection of tiles in 
   * the 3x3 area centered at pos, all
   * satisfying the condition that the
   * tiles do not contain characters:
   */
  adjacent(pos, radius) {
    // Get all neighboring tiles in 5x5 area:
    let lb    = Math.max(0,          pos.y - radius);
    let ub    = Math.min(this.width, pos.y + radius + 1);
    let rows  = this.grid.slice(lb, ub);
    lb        = Math.max(0,          pos.x - radius);
    ub        = Math.min(this.width, pos.x + radius + 1);
    rows      = rows.map(function(row){ return row.slice(lb, ub); });
    
    // Filter out tiles that are characters:
    let neighbors = [].concat(...rows);
    return neighbors.filter(function(nbTile){
      return nbTile.key in this.language;
    }, this);
  }
  
  /*
   */
  movePlayer(key) {
    if (key == ' ') {
      ;
    }
  }
  
  // All enemy moves need to pass through this function:
  enemyDiffTrunc(origin, dest) {
    if (dest.equals(origin)) { return new Pos(0, 0); }
    let diff = dest.sub(origin);
    let abs = diff.abs();
    
    let axisPercent = abs(abs.x - abs.y) / (abs.x + abs.y);
    diff = dest.sub(origin);
    if (weightedChoice({
      true: axisPercent,
      false: 1 - axisPercent,})) {
      if (abs.x > abs.y) {
        diff.y = 0;
      } else {
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
    let diff = this.enemyDiffTrunc(origin, target);
    let desired = origin.add(diff);
    function closeness(altTile) {
      return origin.add(diff.mul(2)).sub(altTile.pos).linearNorm();
    }
    
    if (!desired.inBounds(this.width) ||
      this.isCharacter(this.tileAt(desired))) {
      // Choose one of the two best alternatives:
      let alts = this.adjacent(origin, 1);
      alts.push(this.tileAt(origin));
      alts.sort(function(tileA, tileB){
        return closeness(tileA) - closeness(tileB);
      });
      
      // Generate weights:
      weights = {};
      for (let altTile of alts) {
        weights[altTile.pos] = Math.pow(4, closeness(altTile));
      }
      // Return a weighted choice:
      return weightedChoice(weights);
    } else {
      return desired;
    }
  }
  
  // 
  moveCharOffOf(character, notHungry) {
    let pos = this[character];
    let tile = this.tileAt(pos);
    tile.key = '_';
    this.shuffle(pos);
    
    // Handle coloring:
    if (character == 'player' || 
        this.trail.some(function(tlPos){
          pos.equals(tlPos); }, this)) {
      tile.coloring = 'trail';
    } else if (notHungry && 
        this.targets.some(function(tgPos){
          pos.equals(tgPos); }, this)) {
      tile.coloring = 'target';
    } else {
      tile.coloring = 'tile';
    }
  }
  
  /* Assumes that dest does not contain a character.
   */
  moveCharOnto(character, dest, hungry) {
    this[character] = dest;
    let tile = this.tileAt(dest);
    this.populations[tile.key]--;
    tile.coloring = character;
    tile.key = faces[character];
    
    // Check if a hungry character landed on a target:
    if (hungry) {
      for (let i = 0; i < this.targets.length; i++) {
        // If a hungry character landed on a target:
        if (dest.equals(this.targets[i])) {
          if (character == 'player') { this.score++;  }
          else                       { this.losses++; }
          // Remove this Pos from the targets list:
          this.targets.splice(i);
          this.spawnTargets();
          break;
        }
      }
    }
  }
  
  tileAt(pos) {
    return this.grid[pos.y][pos.x];
  }
  isCharacter(tile) {
    return !tile.key in this.language;
  }
  
  get score()  {return parseInt(this.score_.innerHTML );}
  get losses() {return parseInt(this.losses_.innerHTML);}
  set score(val)  {this.score_.innerHTML  = val;}
  set losses(val) {this.losses_.innerHTML = val;}
}


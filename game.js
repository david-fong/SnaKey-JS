class Pos {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  add(other) {
    return new Pos(this.x+other.x, this.y+other.y);
  }
  abs() {
    return new Pos(Math.abs(this.x), Math.abs(this.y));
  }
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
  
  // Please only call on other Pos instances.
  equals(other) {
    return this.x == other.x && this.y == other.y;
  }
  
  // Static methods:
  // Bounds are exclusive:
  static rand(xBound, yBound) {
    let x = Math.floor(Math.random() * xBound);
    let y = Math.floor(Math.random() * yBound);
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
function weighted_choice(weights) {
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
      for (let tile of row)
        tile.key = '_';
    for (let y = 0; y < this.width; y++)
      for (let x = 0; x < this.width; x++)
        this.shuffle(new Pos(x, y));
    
    /* TODO; spawn all characters by moving
     * them onto their start positions. */
    
    
    // After spawing characters, spawn targets:
    this.spawnTargets();
  }
  
  // 
  shuffle(pos) {
    // Get all neighboring tiles in 5x5 area:
    let lb = Math.max(0,          pos.y - 2);
    let ub = Math.min(this.width, pos.y + 3);
    let rows = this.grid.slice(lb, ub);
        lb = Math.max(0,          pos.x - 2);
        ub = Math.min(this.width, pos.x + 3);
      rows = rows.map(function(row){
      return row.slice(lb, ub);
    });
    
    // Filter out tiles that are characters:
    let neighbors = [].concat(...rows);
    neighbors = neighbors.filter(function(nbTile){
      return nbTile.key in this.language;
    }, this);
    
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
    let choice = weighted_choice(weights);
    
    // Handle choice:
    this.populations[choice]++;
    this.tileAt(pos).key = choice;
  }
  
  // 
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
  
  // 
  moveCharOffOf(character, origin, notHungry) {
    let tile = this.tileAt(origin);
    this.populations[tile.key]--;
    tile.key = '_';
    this.shuffle(tile);
    
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
  
  // 
  moveCharOnto(character, dest, hungry) {
    this[charName] = dest;
    this.tileAt(dest).coloring = charName;
    
    // Check if a hungry character landed on a target:
    if (hungry) {
      for (let i = 0; i < this.targets.length; i++) {
        // If a hungry character landed on a target:
        if (dest.equals(this.targets[i])) {
          this.targets.splice(i);
          if (character == 'player') { this.score++;  }
          else                       { this.losses++; }
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


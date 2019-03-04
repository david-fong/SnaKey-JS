class Pos {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Tile {
  constructor(pos, cell) {
    this.pos  = pos;
    this.cell = cell;
  }
  get key() {
    return this.cell.innerHTML;
  }
  set key(key) {
    this.cell.innerHTML = key;
  }
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

class Game {
  constructor(width) {
    /* Internal representation of display grid: 
     * 2D row-order-array of tiles, which have*
     * .pos (x, y) and .key properties. */
    this.grid = [];
    this.width = width;
    
    let display = document.createElement('table');
    display.className = 'grid';
    for (let y = 0; y < width; y++) {
      let row = [];
      let d_row = display.insertRow();
      for (let x = 0; x < width; x++) {
        // Display initialization:
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
    
    // Re-shuffle all tiles:
    for (let row of this.grid) {
      for (let tile of row) {
        tile.key = ' ';
      }
    }
    for (let row of this.grid) {
      for (let tile of row) {
        this.shuffle(tile);
      }
    }
  }
  
  shuffle(tile) {
    // Get all neighboring tiles in 5x5 area:
    let lb = Math.max(0, tile.pos.y-2);
    let ub = Math.min(this.width, tile.pos.y+3);
    let rows = this.grid.slice(lb, ub);
    lb = Math.max(0, tile.pos.x-2);
    ub = Math.min(this.width, tile.pos.x+3);
    rows = rows.map(function(row){
      return row.slice(lb, ub);
    });
    // Filter out tiles that are characters:
    let neighbors = [].concat(...rows);
    neighbors = neighbors.filter(function(tile){
      return tile.key in this.language;
    }, this);
    
    // Filter all keys for those that
    // won't cause movement ambiguities:
    let valid = [];
    let l = this.language;
    console.log(l);
    for (let opt in this.language) {
      if (!neighbors.some(function(nb) {
        return l[nb.key].includes(l[opt]) || l[opt].includes(l[nb.key]);
      }, this)) { valid.push(opt); }
    }
    
    // Initialize weights for valid keys and choose one:
    let weights = {};
    for (let key of valid) { weights[key] = this.populations[key]; }
    let lowest = Math.min(...Object.values(weights));
    for (let key of valid) { weights[key] = Math.pow(4, lowest-weights[key]); }
    let choice = weighted_choice(weights);
    
    // Handle choice:
    this.populations[choice]++;
    tile.key = choice;
  }
  
  tileAtPos(pos) {
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


class Pos {
  constructor(x, y) {
    this.x = x
    this.y = y
  }
}

class Tile {
  constructor(pos, cell) {
    this.pos  = pos
    this.cell = cell
  }
  get key() {
    return this.cell.innerHTML
  }
  set key(key) {
    this.cell.innerHTML = key
  }
}

// weights is a dict from choices to their weights.
var weighted_choice = function(weights) {
  var sum = function(total, num) {return total + num}
  let total_weight = Object.values(weights).reduce(sum)
  let random = Math.random() * total_weight
  for (let [choice, weight] of Object.entries(weights)) {
    if (random < total_weight) {return choice}
    else {random -= weight}
  }
  return Object.keys(weights)[0]
}

class Game {
  constructor(width) {
  /* Internal representation of display grid: 
   * 2D row-order-array of tiles, which have*
   * .pos (x, y) and .key properties. */
    this.grid = new Array()
    
    let display = document.createElement('table')
    display.className = 'grid'
    for (var y = 0; y < width; y++) {
      let row = new Array()
      let d_row = display.insertRow()
      for (var x = 0; x < width; x++) {
        // Display initialization:
        let cell        = d_row.insertCell()
        cell.id         = 't' + x + ',' + y
        cell.className  = 'tile'
        cell.innerHTML  = ''
        row.push(new Tile(new Pos(x, y), cell))
      }
      this.grid.push(row)
    }
    document.body.appendChild(display)
    
    this.score_  = document.createElement('p')
    this.losses_ = document.createElement('p')
    document.body.appendChild(this.score_)
    document.body.appendChild(this.losses_)
    
    this.language = 'english_lower'
    this.restart()
  }
  
  // Shuffles entire grid and resets scores.
  restart() {
    // Reset all display-key populations:
    this.populations = {}
    for (let key in languages[this.language]) {
      this.populations[key] = 0
    }
    
    this.score  = 0
    this.losses = 0
    
    // Re-shuffle all tiles:
    for (let row of this.grid) {
      for (let tile of row) {
        this.shuffle(tile)
      }
    }
  }
  
  shuffle(pos) {
    // Get all neighboring tiles in 5x5 area:
    let rows = this.grid.slice(max(0, pos.y-2), min(this.width, pos.y+3))
    let neighbors = [].concat(rows.map(function(row){
      return row.slice(max(0, pos.x-2), min(this.width, pos.x+3))
    }))
    neighbors = neighbors.filter(!this.isCharacter)
    
    // Filter all keys for those that
    // won't cause movement ambiguities:
    let valid = []
    let l = this.language
    for (let key of Object.keys(this.language)) {
      if (!neighbors.some(function(nb){
        return l[nb.key].inside(l[key]) || l[key].inside(l[nb.key])
      })) {valid.push(key)}
    }
    
    // Initialize weights for valid keys and choose one:
    let lowest = Math.min(...valid.map(function(key){
      return this.populations[key]
    }))
    weights = {}
    for (let key of valid) {
      weights[key] = Math.pow(4, lowest - this.populations[key])
    }
    let choice = weighted_choice(weights)
    
    // Handle choice:
    this.populations[choice]++
    this.tileAtPos(key) = choice
  }
  
  tileAtPos(pos) {
    return this.grid[pos.y][pos.x]
  }
  isCharacter(key) {
    return !Object.keys(this.language).includes(key)
  }
  
  get score()  {return parseInt(this.score_.innerHTML )}
  get losses() {return parseInt(this.losses_.innerHTML)}
  set score(val)  {this.score_.innerHTML  = val}
  set losses(val) {this.losses_.innerHTML = val}
}


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
    this.restart()
  }
  
  // Shuffles entire grid and resets scores.
  restart() {
    for (let row of this.grid) {
      for (let tile of row) {
        this.shuffle(tile)
      }
    }
  }
  
  shuffle(tile) {
    tile.key = 'O'
  }
}


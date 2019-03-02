var setupGrid = function(width) {
    var grid = document.createElement('table')
    grid.className = 'grid'
    for(var y = 0; y < width; y++) {
        var row = grid.insertRow()
        for (var x = 0; x < width; x++) {
            var tile        = row.insertCell()
            tile.id         = 't' + x + ',' + y
            tile.className  = 'tile'
            tile.innerHTML  = ''
        }
    }
    document.body.appendChild(grid)
}
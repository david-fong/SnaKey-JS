'use strict';

class Pos {
  constructor(x=0, y=0) {
    this.x = x;
    this.y = y;
  }
  
  // Basic arithmetic functions:
  add(other) {
    return new Pos(this.x + other.x, this.y + other.y);
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
    let yInside = this.y >= 0 && this.y < bound;
    return xInside && yInside;
  }
  trunc(radius=1) {
    let x = this.x;
    if (x < -radius) x = -radius;
    else if (x > radius) x = radius;
    
    let y = this.y;
    if (y < -radius) y = -radius;
    else if (y > radius) y = radius;
    
    return new Pos(x, y);
  }
  static corners(width, padding=0) {
    let lower = padding;
    let upper = width - padding - 1;
    return [
      new Pos(lower, lower), new Pos(upper, lower),
      new Pos(lower, upper), new Pos(upper, upper),
    ];
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
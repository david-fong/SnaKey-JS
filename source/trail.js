'use strict';

/* Attributes:
 * -- frames    : [Pos,]
 * -- 
 */
class Trail {
  constructor() {
    this.clear();
  }
  
  // Resets the contents of this trail.
  clear() {
    this.hist   = [];
    this.length = 0;
    this.streak = 0;
  }
  
  // Private helper to evict unneeded history data.
  add_(pos) {
    if (this.hist.push(pos) > 2 * (this.length + 1)) {
      this.hist.shift();
    }
  }
  
  // Adds a new position element to this trail.
  pushNew(destPos) {
    this.add_(destPos);
    this.streak = 0;
  }
  
  // Returns the backtracking destination.
  backtrack(fromPos) {
    this.add_(fromPos);
    
    // If the backtrack has come full circle:
    if (this.hist.length - 2 * (this.streak + 1) < 0) {
      this.hist = this.hist.slice(this.streak);
      this.streak = 0;
    }
    
    // Increment streak and return backtrack destination:
    const offset = 2 * (this.streak++ + 1);
    return this.hist[this.hist.length - offset];
  }
  
  /* Returns positions of all trail entries that
   * were evicted to maintain the trail's length.
   * Entries with surviving duplicates (using 
   * .equals()) are filtered out of the return value.
   */
  trim() {
    // 'Evict' only up to two entries per call.
    const evictTotal = this.hist.length - this.length;
    const histCopy = this.hist.slice();
    const toEvict = histCopy.splice(0, Math.min(evictTotal)); // , 2
    
    return toEvict.filter((pos) => !histCopy.some(
      (surviving) => surviving.equals(pos)
    ));
  }
  
  get empty() {
    return this.length == 0;
  }
  get newest() {
    return this.hist[this.hist.length - 1];
  }
}
'use strict';

/* Attributes:
 * -- frames    : [Pos,]
 * -- 
 */
class Trail() {
  constructor() {
    this.clear();
  }
  
  /* Resets the contents of this trail.
   */
  clear() {
    this.frames = [];
    this.backtrackStreak = false;
  }
  
  /* Adds a new position element to this trail.
   */
  push(pos) {
    this.newestFrame.push(pos);
    this.backtrackStreak = false;
  }
  
  /* Trims the trail by one element.
   * Returns the evicted position.
   */
  trim() {
    const evicted = this.frames[0].shift();
    if (this.frames[0].length == 0) {
      this.frames.shift();
    }
    return evicted;
  }
  
  /* Returns the newest addition to itself.
   */
  backtrack() {
    let top;
    let retval;
    
    // If this backtrack was preceded by a regular move:
    if (!this.backtrackStreak) {
      top    = this.newestFrame;
      retval = top.pop();
      if (top.length == 0) {
        this.frames.pop();
      }
      this.frames.push([retval, ]);
    // If this backtrack followed another backtrack move:
    } else {
      top    = this.frames[this.frames.length - 2];
      retval = top.pop();
      this.newestFrame.push(retval);
    }
    
    return retval;
  }
  
  get newestFrame() {
    return this.frames[this.frames.length - 1];
  }
  get newest() {
    const top = this.newestFrame;
    return top[top.length - 1];
  }
  get oldest() {
    return this.frames[0][0];
  }
}
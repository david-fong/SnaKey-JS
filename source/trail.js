'use strict';

/* Attributes:
 * -- frames    : [Pos,]
 * -- 
 */
class Trail {
  constructor() {
    this.clear();
  }
  
  /* Resets the contents of this trail.
   */
  clear() {
    this.frames = [[], ];
    this.backtrackStreak = false;
  }
  
  /* Adds a new position element to this trail.
   */
  pushNew(pos) {
    this.newestFrame.push(pos);
    this.backtrackStreak = false;
  }
  
  /* Trims the trail by one element.
   * Returns the evicted position.
   * Assumes this.isEmpty is false.
   */
  trim() {
    const evicted = this.frames[0].shift();
    if (this.frames.length > 1 && this.frames[0].length == 0) {
      this.frames.shift();
    }
    return evicted;
  }
  
  /* 
   */
  backtrack(fromPos) {
    if (this.isEmpty) return;
    
    // If this backtrack was preceded by a regular move:
    if (!this.backtrackStreak || this.frames.length == 1) {
      const retval = this.newest;
      this.frames.push([fromPos, ]);
      this.backtrackStreak = true;
      return retval;
      
    // If this backtrack followed another backtrack move:
    } else {
      const virtualFrame = this.frames[this.frames.length - 2];
      const retval = virtualFrame.pop();
      if (this.frames.length > 1 && virtualFrame.length == 0) {
        this.frames.splice(-2, 1);
      }
      this.newestFrame.push(fromPos);
      return retval;
    }
  }
  
  // Returns a flattened view of the contents of this trail.
  streamContents() {
    const stream = this.frames.reduce((a, b) => {
      a.push(...b);
      return a;
    });
    return stream;
  }
  
  frameView() {
    return this.frames.map((frame) => frame.slice());
  }
  
  get isEmpty() {
    return this.newestFrame.length == 0;
  }
  get length() {
    return this.frames.reduce((a, b) => {
      return a + b.length;
    }, 0);
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

/*{
  const test = new Trail();
  for (let i = 0; i < 10; i++)
    test.pushNew(i);
  
  for (let i = 0; i < 5; i++)
    console.log(test.backtrack());
  console.log(test.frameView());
  
  for (let i = 0; i < 6; i++)
    test.trim();
  console.log(test.frameView());
  
  for (let i = 0; i < 6; i++) {
    test.backtrack();
    console.log(test.frameView());
    console.log(test.length);
  }
  
  test.trim();
  console.log(test.frameView());
  console.log(test.length);
}*/
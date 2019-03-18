class Sounds {
  
  /* Returns an array of Audio objects carrying
   * similar variants of a sound effect described 
   * by filename.
   */
  static makeList(filename, numVariants) {
    let variants = [];
    for (let i = 0; i < numVariants; i++) {
      let path = 'assets/sounds/' + filename + i + '.wav';
      variants.push(new Audio(path));
    }
    console.log(variants, variants.length);
    return variants;
  }
  
  /* Plays the first effect in the list of variants
   * and then shuffles its position in the list.
   */
  static playEffect(variants) {
    // Play the first sound in the list:
    let choice = variants.shift();
    choice.play();
    
    // Shuffle that sound back into the list:
    let insertAt = Math.floor((variants.length - 1) * Math.random());
    variants.splice(insertAt + 1, 0, choice);
  }
}
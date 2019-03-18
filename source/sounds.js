'use strict';

class SoundEffects {
  /* Returns an array of Audio objects carrying
   * similar variants of a sound effect described 
   * by filename.
   * There must be at least 2 effect variants.
   */
  static makeVariants(filename, numVariants, volume=1.0) {
    let variants = [];
    for (let i = 0; i < numVariants; i++) {
      let path = 'assets/sounds/' + filename + i + '.wav';
      let variant = new Audio(path);
      variant.volume = volume;
      variants.push(variant);
    }
    return variants;
  }
  
  /* Plays the first effect in the list of variants
   * and then shuffles its position in the list.
   * Also shuffles the last effect's position.
   * IMPORTANT: Requires that variants.length >= 2.
   */
  static playEffectFrom(variants) {
    // Play the first sound in the list:
    let first   = variants.shift();
    let last    = variants.pop();
    let promise = first.play();
    
    if (promise !== undefined) {
      promise.then(_ => {
        // Playback started.
      }).catch(error => {
        // Playback failed:
        console.error(error);
      })
    }
    // Shuffle that sound back into the list:
    let insertAt = Math.floor(variants.length * Math.random());
    variants.splice(insertAt, 0, last, first);
  }
}


/* Class to play background music with
 * successively layering tracks.
 */
class BackgroundMusic {
  /* Creates an object that can play background music.
   */
  constructor(numTracks) {
    // Create a <numTracks>-long list of track filenames:
    let tracks   = [];
    let path = 'assets/sounds/background_music/';
    for (let i = 0; i < numTracks; i++) {
      tracks.push(path + i + '.mp3');
    }
    
    // Initialize fields:
    this.level   = 0;
    this.tracks  = tracks.map(filename => {
      let track  = new Audio(filename);
      track.loop = true;
      return track;
    });
  }
  
  /* Starts playing all tracks together.
   */
  play() {
    for (let track of this.tracks) {
      let promise = track.play();
      
      if (promise !== undefined) {
        promise.then(_ => {
          // Playback started.
        }).catch(error => {
          // Playback failed:
          console.error(error);
        })
      }
    }
  }
  
  /* Causes all tracks to stop playing.
   */
  pause() {
    for (let track of this.tracks) {
      track.pause();
    }
  }
  
  /* Checks if the given input should change
   * which track level should be set as the top.
   *
   * All tracks above the top track will be muted.
   * Uses the principle of hysterisis to prevent
   * chattering when the input hovers around level-
   * changing values.
   */
  updateTrackLevel(input, lb, ub) {
    let newLevel = this.numTracks * ((input - lb) / (ub - lb));
    let increase = newLevel > this.level;
    
    if (increase) {
      newLevel = Math.floor(newLevel);
      // Unmute tracks up to floor(newLevel):
      for (let i = this.level; i <= newLevel; i++) {
        this.tracks[i].muted = false;
      }
    } else {
      newLevel = Math.round(newLevel);
      if (newLevel == this.numTracks) return;
      // Mute tracks down to round(newLevel):
      for (let i = this.numTracks - 1; i > newLevel; i--) {
        this.tracks[i].muted = true;
      }
    }
    
    // TODO: check that the tracks are aligned time-wise:
    
  }
  
  get numTracks() { return this.tracks.length; }
}

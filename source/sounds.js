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
        // Playback failed (ignore):
        // console.error(error);
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
    // Create a list of track filenames:
    const tracks = [];
    const path = 'assets/sounds/background_music/';
    for (let i = 0; i < numTracks; i++) {
      tracks.push(path + i + '.mp3');
    }
    
    // Initialize fields:
    this.level = 0;
    this.numTracks = numTracks;
    
    this.tracks = tracks.map(filename => {
      const track  = new Audio(filename);
      track.loop   = true;
      track.volume = 0.6;
      track.muted  = true;
      track.addEventListener('timeupdate', () => {
        const buffer = 0.26;
        if (track.currentTime > track.duration - buffer) {
          track.currentTime = 0;
        }
      });
      return track;
    });
    this.tracks[0].muted = false;
  }
  
  /* Starts playing all tracks together.
   */
  play() {
    for (const track of this.tracks) {
      const promise = track.play();
      
      if (promise !== undefined) {
        promise.then(_ => {
          // Playback started.
        }).catch(error => {
          // Playback failed (ignore):
          // console.error(error);
        })
      }
    }
  }
  
  /* Causes all tracks to stop playing.
   */
  pause() {
    for (const track of this.tracks) {
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
   *
   * progress must be in the range [0, 1).
   */
  updateTrackLevel(progress) {
    // Map input to corresponding new track-level:
    let newLevel = progress * this.numTracks / 
        BackgroundMusic.fullTrackProgress;
    const increase = newLevel > this.level;
    
    if (increase) newLevel = Math.round(newLevel);
    else          newLevel = Math.ceil( newLevel);
    if (newLevel >= this.numTracks) newLevel = this.numTracks - 1;
    if (newLevel == this.level) return;
    
    // Unmute tracks up to round(newLevel):
    if (increase) {
      for (let i = this.level + 1; i <= newLevel; i++)
        this.tracks[i].muted = false;
      
    // Mute tracks down to just above ceil(newLevel):
    } else {
      for (let i = this.numTracks - 1; i > newLevel; i--)
        this.tracks[i].muted = true;
    }
    
    this.level = newLevel;
    // TODO: check that the tracks are aligned time-wise:
    
  }
}
BackgroundMusic.fullTrackProgress = 0.25;

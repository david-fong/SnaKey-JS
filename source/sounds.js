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
    let insertAt = Math.ceil(variants.length * Math.random());
    variants.splice(insertAt, 0, last, first);
  }
}


class BGMTrack {
  constructor(filename, maxVol) {
    const track  = new Audio(filename);
    track.loop   = true;
    track.autoplay = false;
    
    this.audio   = track;
    this.maxVol  = maxVol;
    track.volume = 0.0;
    
    track.addEventListener('timeupdate', () => {
      const buffer = 0.30;
      if (track.currentTime > track.duration - buffer) {
        track.currentTime = 0;
      }
    });
    return track;
  }
  
  // volume must be in the range [0, 1].
  set volume(volume) {
    if (volume <= 0) {
      volume = 0;
      this.audio.muted = true;
    } else if (volume >= 1) {
      volume = 1;
      this.audio.muted = false;
    }
    this.audio.volume = volume * this.maxVol;
  }
  
  play() {
    return this.audio.play();
  }
  pause() {
    return this.audio.pause();
  }
}


/* Class to play background music with
 * successively layering tracks.
 */
class BackgroundMusic {
  /* Creates an object that can play background music.
   */
  constructor(numTracks) {
    const path = 'assets/sounds/background_music/';
    
    // Create a list of track filenames:
    this.level     = 0;
    this.numTracks = numTracks;
    this.tracks    = [];
    for (let i = 0; i < numTracks; i++) {
      this.tracks.push(new BGMTrack(path + i + '.mp3', 0.6));
    }
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
    // Pause tracks:
    for (const track of this.tracks) {
      track.pause();
    }
    // Realign tracks:
    for (const track of this.tracks) {
      track.currentTime = this.tracks[0].currentTime;
    }
  }
  
  /* Unmutes background music tracks up to
   * a level based on the progress argument.
   * progress must be in the range [0, 1).
   * The top level track will fade in or out.
   * The bottom-level track will always be on.
   */
  updateTrackLevel(progress) {
    let level = progress * this.numTracks;
    let floor = Math.floor(level);
    if (level >= this.numTracks) {
      floor = this.numTracks - 1
      level = this.numTracks;
    }
    
    // Going up to the above track:
    if (floor > this.level) {
      for (let i = this.level; i < floor; i++) {
        this.tracks[i].volume = 1.0;
      }
    // Going down below this track:
    } else if (Math.ceil(level) < this.level){
      for (let i = this.level; i > level; i--) {
        this.tracks[i].volume = 0.0;
      }
    }
    this.level = floor;
    this.tracks[this.level].volume = level - floor;
  }
}

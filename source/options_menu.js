'use strict';

/* This file makes the left bar of the main page.
 */
function makeOptionsMenu(game, parentElement) {
  
  // Tutorial:
  const makeTutorial = (() => {
    const messages = [
    '0. Type the character in an adjacent tile to move.',
    '1. Mouse-over a character to check how to type it.',
    '2. You can also move in diagonals!',

    '3. Eat targets to increase your score.',
    '4. The game ends when the chaser catches you.',
    '5. The chaser speeds up based on your score.' +
    '   (And also how many targets you\'ve missed)',

    '7. Misses come from targets eaten by the nommer.',
    '8. The nommer cannot attack you.',
    '9. Misses make the game more difficult' +
    '   without improving your final score.',

    '10. Wouldn\'t it be nice if there was a way' +
    '   to cut down your misses? (spoiler: there is)',
    '11. If you catch (go right beside) the runner,' +
    '   your misses will be cut down by a third.',

    '12. If you find the game too easy, press the' +
    '   spice button to boost your miss count.',
    'tutorial',
    ];
    const tutorial = document.createElement('div');
    tutorial.className  = 'tutorial menuItem';
    tutorial.pageNumber = messages.length - 2;
    const pages = [];
    for (let i = 0; i < messages.length; i++) {
      const page = document.createElement('div');
      page.innerHTML = messages[i];
      pages.push(page);
      tutorial.appendChild(page);
    }
    tutorial.onclick = () => {
      pages.slice(-1)[0].style.display = '';
      const shuffle = () => {
        pages[tutorial.pageNumber].style.display = '';
        tutorial.pageNumber++;
        tutorial.pageNumber %= messages.length - 1;
        pages[tutorial.pageNumber].style.display = 'initial';
      }
      shuffle();
      tutorial.onclick = shuffle;
    }
    const cover = pages.slice(-1)[0].style;
    cover.display = 'initial';
    cover.textDecoration = 'underline';
    parentElement.appendChild(tutorial);
  })();
  
  
  // Difficulty: TODO
  const makeSpeedItem = (() => {
    const speedSel = document.createElement('select');
    speedSel.id        = 'speedSelect';
    speedSel.className = 'menuItem';
    speedSel.name      = 'speed';
    for (const name in Game.speeds) {
      const speed      = document.createElement('option');
      speed.innerHTML  = name;
      speed.value      = name;
      speedSel.add(speed);
    }
    speedSel.value = 'normal';
    parentElement.appendChild(speedSel);
  })();
  
  
  // Language:
  const makeLanguageItem = (() => {
    const langSel     = document.createElement('select');
    langSel.id        = 'langSelect';
    langSel.className = 'menuItem';
    langSel.name      = 'language';
    for (const lang in languages) {
      const choice     = document.createElement('option');
      choice.innerHTML = lang;
      choice.value     = lang;
      langSel.add(choice);
    }
    langSel.value = 'eng';
    parentElement.appendChild(langSel);
  })();
  
  
  // Colors:
  const makeColorsItem = (() => {
    const colorSel     = document.createElement('select');
    colorSel.className = 'menuItem';
    colorSel.name      = 'coloring';
    for (const fileName of csFileNames) {
      const choice     = document.createElement('option');
      choice.innerHTML = fileName.replace(/_/g, ' ');
      choice.value     = 'assets/colors/' + fileName + '.css';
      colorSel.add(choice);
    }
    colorSel.onchange  = () => {
      document.getElementById('coloring').href = colorSel.value;
    };
    parentElement.appendChild(colorSel);
  })();

  // Mute:
  const makeMuteItem = (() => {
    const muteButton = document.createElement('button');
    muteButton.id         = 'muteButton';
    muteButton.className  = 'menuItem';
    muteButton.innerHTML  = 'mute';
    muteButton.muteOn     = false;
    
    muteButton.onclick    = () => {
      muteButton.blur();
      // Player pressed 'unmute':
      if (muteButton.muteOn) {
        muteButton.innerHTML = 'mute'
        if (!game.pauseButton.pauseOn) {
          game.backgroundMusic.play();
        }
      // Player pressed 'mute':
      } else {
        muteButton.innerHTML = 'unmute';
        game.backgroundMusic.pause();
      }
      muteButton.muteOn = !muteButton.muteOn;
    };
    parentElement.appendChild(muteButton);
  })();
  
  
  // Copyright / repository link:
  const makeRepoItem = (() => {
    const repoParent     = document.createElement('div');
    repoParent.className = 'menuItem';
    const repo  = document.createElement('a');
    repo.href   = 'https://github.com/david-fong/SnaKey-JS';
    repo.rel    = 'author';
    repo.target = '_blank';
    repo.innerHTML = '© David Fong 2019';
    repo.style.color = 'inherit';
    repoParent.appendChild(repo);
    parentElement.appendChild(repoParent);
  })();
}


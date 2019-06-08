'use strict';

/* This file makes the left bar of the main page.
 */
function makeOptionsMenu(game, parentElement) {
  
  // Tutorial:
  const makeTutorial = (() => {
    const messages = [
    'Type the character in an adjacent tile to move.',
    'Mouse-over a character to check how to type it.',
    'You can also move in diagonals!',
    'Press any of \"' + [...Player.backtrackKeys.values()] +
      '\" to backtrack along your trail.',

    'Eat targets to increase your score.',
    'The game ends when the chaser \"' + 
      Game.enemies['chaser'] + '\" catches you.',
    'The chaser speeds up based on your score. ' +
      '(And also how many targets you\'ve missed)',

    'Misses come from targets eaten by the nommer: \"' + 
      Game.enemies['nommer'] + '\"',
    'The nommer cannot kill you.',
    'Misses make the game more difficult ' +
      'without improving your final score.',

    'Wouldn\'t it be nice if there was a way ' +
      'to cut down your misses? (spoiler: there is)',
    ' If you catch (go right beside) the runner, \"' +
      Game.enemies['runner'] +
      '\", your misses will be cut down by a fraction.',

    'If you find the game too easy, press the ' +
      'spice button to boost your miss count.',
    ];
    const tutorial      = document.createElement('div');
    tutorial.className  = 'tutorial menuItem';
    tutorial.pageNumber = messages.length - 1;
    const pages         = [];
    for (let i = 0; i < messages.length; i++) {
      const page = document.createElement('div');
      page.innerHTML = i + '.<br>' + messages[i];
      pages.push(page);
      tutorial.appendChild(page);
    }
    // Scroll through tutorial messages on click:
    const shuffle = () => {
      pages[tutorial.pageNumber].style.display = '';
      tutorial.pageNumber++;
      tutorial.pageNumber %= messages.length;
      pages[tutorial.pageNumber].style.display = 'initial';
    }
    shuffle();
    tutorial.onclick = shuffle;
    parentElement.appendChild(tutorial);
  })();
  
  
  // Speed / Difficulty:
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
    langSel.id        = 'languageSelect';
    langSel.className = 'menuItem';
    langSel.name      = 'language';
    
    for (const languageName of INTERPRETERS.keys()) {
      const choice     = document.createElement('option');
      choice.innerHTML = languageName;
      choice.value     = languageName;
      langSel.add(choice);
    }
    langSel.onchange = () => {
      langSel.blur();
    };
    parentElement.appendChild(langSel);
    langSel.selectedIndex = 0;
    langSel.onchange();
  })();
  
  
  // Colors:
  const makeColorsItem = (() => {
    const colorSel     = document.createElement('select');
    colorSel.className = 'menuItem';
    colorSel.name      = 'coloring';
    for (const fileName of coloringSourceFileNames) {
      const choice     = document.createElement('option');
      choice.innerHTML = fileName.replace(/_/g, ' ');
      choice.value     = fileName;
      colorSel.add(choice);
    }
    colorSel.onchange  = () => {
      colorSel.blur();
      document.getElementById('coloringSource').href = 
        'assets/colors/' + colorSel.value + '.css';
    };
    parentElement.appendChild(colorSel);
    colorSel.selectedIndex = 0;
    colorSel.onchange();
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


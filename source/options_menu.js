'use strict';

/* This file makes the left bar of the main page.
 */
function makeOptionsMenu(parentElement) {
  
  // Copyright / repository link:
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
  
  
  // Tutorial:
  let messages = [
  '0. Type the character in an adjacent tile to move.',
  '1. Mouse-over a tile to check what to type.',
  '2. You can also move in diagonals!',

  '3. Eat targets to increase your score.',
  '4. The game ends when the chaser catches you.',
  '5. The chaser speeds up based on your score.<br>' +
  '   (And also how many targets you\'ve missed)',

  '7. Misses come from targets eaten by the nommer.',
  '8. The nommer cannot attack you. It doesn\'t bite.',
  '9. Misses make the game more difficult<br>' +
  '   without improving your final score.',

  '10. Wouldn\'t it be nice if there was a way<br>' +
  '   to cut down your misses? (spoiler: there is)',
  '11. If you catch (go right beside) the runner,<br>' + // 50 chars wide.
  '   your misses will be cut down by a third.',

  '12. If you find the game too easy, press the<br>' +
  '   spice button to boost the chaser\'s speed.'
  ];
  let tutorial = document.createElement('div');
  tutorial.className  = 'tutorial menuItem';
  tutorial.pageNumber = 0;
  const pages = [];
  for (let i = 0; i < messages.length; i++) {
    let page = document.createElement('div');
    page.innerHTML = messages[i];
    pages.push(page);
    tutorial.appendChild(page);
  }
  tutorial.onclick = () => {
    pages[tutorial.pageNumber].style.display = '';
    tutorial.pageNumber++;
    tutorial.pageNumber %= messages.length;
    pages[tutorial.pageNumber].style.display = 'initial';
  }
  pages[0].style.display = 'initial';
  parentElement.appendChild(tutorial);
  
  
  // Language:
  const langSel     = document.createElement('select');
  langSel.id        = 'langSelect';
  langSel.className = 'menuItem';
  langSel.name      = 'language';
  for (let lang in languages) {
    const choice     = document.createElement('option');
    choice.innerHTML = lang;
    choice.value     = lang;
    langSel.add(choice);
  }
  langSel.value = 'eng';
  parentElement.appendChild(langSel);
  
  
  // Colors:
  const colorSel     = document.createElement('select');
  colorSel.className = 'menuItem';
  colorSel.name      = 'coloring';
  for (let fileName of csFileNames) {
    const choice     = document.createElement('option');
    choice.innerHTML = fileName.replace(/_/g, ' ');
    choice.value     = 'assets/colors/' + fileName + '.css';
    colorSel.add(choice);
  }
  colorSel.onchange  = () => {
    document.getElementById('coloring').href = colorSel.value;
  };
  parentElement.appendChild(colorSel);

  // Mute:
}


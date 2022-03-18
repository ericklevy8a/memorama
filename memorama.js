/*
* Memorama Game Script
* (c) 2022 by Erick Levy!
* Inspired by a board game from my childhood :)
*/

const BOARD_ROWS = 8;
const BOARD_COLS = 4;

const IMAGE_ROWS = 4;
const IMAGE_COLS = 4;

const IMAGE_WIDTH = 90;
const IMAGE_HEIGHT = 90;

const CLOSE_PAIR_DELAY = 1500;
const TRANSITION_DELAY = 125;

let images = [];

let gCard1 = null;
let gCard2 = null;

let gSteps = 0;

// Try to get the game state, statistical and settings structures from local storage
let gameState = getGameState() || false;
let gameSettings = getGameSettings() || false;
let gameStatistics = getGameStatistics() || false;

// Based on settings apply some general classes to body
if (gameSettings) {
    if (gameSettings.darkTheme) document.body.classList.add('dark-theme');
    if (gameSettings.set) setCardSetStyle();
}

// Initialize the data for each pair of images for the cards
// id: number used for identify each pair of images
// style: string used to reposition the background to display the corresponding image
// avail: keep track of available images of each id
function initImages() {
    for (let i = 0; i < IMAGE_ROWS; i++) {
        for (let j = 0; j < IMAGE_COLS; j++) {
            let image = {
                id: i * IMAGE_COLS + j,
                style: `background-position: left ${IMAGE_WIDTH * j}px top ${IMAGE_HEIGHT * i}px;`,
                avail: 2
            }
            images.push(image);
        }
    }
}

// Get a ramdom image for a card from a pile of avail images (in pairs)
function getRandomImage() {
    if (images.length == 0) {
        initImages();
        let boardPlaces = BOARD_COLS * BOARD_ROWS;
        if (boardPlaces < images.length * 2) {
            boardPlaces -= boardPlaces % 2;
            images.length = boardPlaces / 2;
        }
    }
    // Get the indexes of the available images
    let avail = [];
    for (let c = 0; c < images.length; c++) {
        if (images[c].avail > 0) {
            avail.push(c);
        }
    }
    // How many available images
    let count = avail.length;
    if (count === 0) {
        // No more available images
        return false;
    }
    // Pick a ramdom index
    let index = avail[Math.floor(Math.random() * count)];
    images[index].avail -= 1;
    return images[index];
}

// Initialize the game board
function initBoard() {
    let boardContainer = document.getElementById('board-container');
    for (let i = 0; i < BOARD_ROWS; i++) {
        //let row = document.createElement('div');
        //row.classList.add('row');
        for (let j = 0; j < BOARD_COLS; j++) {
            let cardImage = getRandomImage();
            // If there is card image available
            if (cardImage) {
                // Use a card holder as a spacer
                let cardHolder = document.createElement('div');
                cardHolder.classList.add('card-holder');
                let card = document.createElement('div');
                card.classList.add('card');
                card.style = cardImage.style;
                card.dataset.id = cardImage.id;
                card.addEventListener('click', cardClick);
                cardHolder.appendChild(card);
                //row.appendChild(cardHolder);
                boardContainer.appendChild(cardHolder);
            }
        }
        //boardContainer.appendChild(row);
    }
}

// Management of the card click
function cardClick(e) {
    let target = e.target;
    // Check if card is already open
    if (target.classList.contains('open')) {
        return;
    }
    if (gCard1 == null) {
        gCard1 = target;
        openCard(target);
    } else if (gCard2 == null) {
        gCard2 = target;
        openCard(target);
        gSteps += 1;
    }
}

// Manipulate classes for a card open transition
function openCard(card) {
    card.classList.add('flip');
    setTimeout(() => {
        card.classList.add('open');
        card.classList.remove('flip');
    }, 250)
    if (gCard1 !== null && gCard2 !== null) {
        checkPair(gCard1, gCard2);
    }
}

// Manipulate classes for card pair close transitions
function closeCards() {
    gCard1.classList.add('flip');
    gCard2.classList.add('flip');
    setTimeout(() => {
        // Close pair
        gCard1.classList.remove('open');
        gCard2.classList.remove('open');
        gCard1.classList.remove('flip');
        gCard2.classList.remove('flip');
        //Reset pair
        gCard1 = null;
        gCard2 = null;
        // Update and store game state
        // TODO: timer, steps...
        // may be not updateBoardState();
        storeGameState();
    }, TRANSITION_DELAY);
}

// Manipulate classes for card pair take transitions
function takeCards() {
    gCard1.classList.add('taken');
    gCard2.classList.add('taken');
    setTimeout(() => {
        // Hide pair
        gCard1.classList.add('hidden');
        gCard2.classList.add('hidden');
        gCard1.classList.remove('taken');
        gCard2.classList.remove('taken');
        // Reset guess pair
        gCard1 = null;
        gCard2 = null;
        // Update and store game state
        // TODO: check end of game (avail pairs count)
        let cardCount = [...document.getElementsByClassName('card')].length;
        let takenCount = [...document.getElementsByClassName('card hidden')].length;
        if (cardCount - takenCount === 0) {
            gameState.gameStatus = 'GAME_OVER';
            msgbox('Game Over!', 'Press <b>RESTART</b> to play a new game board...', 'Restart', gameRestart);
        }
        // TODO: timer, steps, points (pairs count)...
        updateBoardState();
        storeGameState();
    }, TRANSITION_DELAY);
}

function gameRestart() {
    location.reload();
}

// Check if the guessed pair of cards is the same image
function checkPair(card1, card2) {
    // If there is a pair
    if (card1.dataset.id === card2.dataset.id) {
        setTimeout(() => {
            takeCards();
        }, CLOSE_PAIR_DELAY);
    } else {
        // Close the pair of cards
        setTimeout(() => {
            closeCards();
        }, CLOSE_PAIR_DELAY);
    }
}

// LOCAL STORAGE FUNCTIONS

// Restores a game state previusly saved in local storage
function restoreGameState() {
    if (gameState) {
        if (gameState.gameStatus === 'IN_PROGRESS') {
            // Reconstructs the game from the stored state data
            let cards = [...document.getElementsByClassName('card')];
            let boardState = gameState.boardState;
            if (cards.length === boardState.length) {
                for (let i = 0; i < cards.length; i++) {
                    cards[i].dataset.id = boardState[i].id;
                    cards[i].style = images[boardState[i].id].style;
                    cards[i].className = boardState[i].className;
                }
            }
            // Restore timer and step counter
        } else {
            // Create and store a new game state data
            updateBoardState();
            gameState.gameStatus = 'IN_PROGRESS';
            // Reset time and step counter
            storeGameState();
        }
    }
}

// Prepare the game board state for store
function updateBoardState() {
    let cards = [...document.getElementsByClassName('card')];
    let boardState = [];
    for (let i = 0; i < cards.length; i++) {
        let cardState = {
            id: cards[i].dataset.id,
            className: cards[i].className
        }
        boardState.push(cardState);
    }
    gameState.boardState = boardState;
}

// Get the game state from local storage or creates a initial one
function getGameState() {
    if (typeof (Storage) !== 'undefined') {
        return JSON.parse(localStorage.getItem('memorama-state')) ||
        {
            boardState: [],
            gameStatus: ''
        }
    }
}

// Store the game state to local storage
function storeGameState() {
    if (typeof (Storage) !== 'undefined') {
        localStorage.setItem('memorama-state', JSON.stringify(gameState));
    }
}

// Get the game statistics from local storage or creates a initial one
function getGameStatistics() {
    if (typeof (Storage) !== 'undefined') {
        return JSON.parse(localStorage.getItem('memorama-statistics')) ||
        {
            gamesPlayed: 0,
            gamesWon: 0,
            winPercentage: 0.0
        }
    }
}

// Store the game statistics to local storage
function storeGameStatistics() {
    if (typeof (Storage) !== 'undefined') {
        localStorage.setItem('memorama-statistics', JSON.stringify(gameStatistics));
    }
}

// Get the game settings from local storage or creates a initial one
function getGameSettings() {
    if (typeof (Storage) !== 'undefined') {
        return JSON.parse(localStorage.getItem('memorama-settings')) ||
        {
            darkTheme: false,
            set: {
                name: "montecarlo",
                radius: "2px"
            }
        }
    }
}

// Store the game settings to local storage
function storeGameSettings(gameSettings) {
    if (typeof (Storage) !== 'undefined') {
        localStorage.setItem('memorama-settings', JSON.stringify(gameSettings));
    }
}

// NAV BAR ACTIONS

// Use msgbox to display a modal help dialog
function showHelp() {
    let msg = `
        <div id="help-container">
            <h5>HOW TO PLAY</h5>
            <p>The goal of the game is to find pairs with the same printed figure using memory.</p>
            <p>This version is for solitaire mode, where you want to break the record time it takes
            to complete the game.</p>
            <h5>ABOUT THIS GAME</h5>
            <p>© Copyright 2022 by Erick Levy!</p>
            <p>Inspired in a board game I played with my family in my chilhood named Memorama®
            from the mexican game company Novedades Montecarlo, S.A. de C.V. 1973</p>
            <p>Thank you for taking the time to learn about and play with this little app.</p>
        </div>
    `;
    msgbox('', msg);
}

// Use msgbox to display a modal statistics dialog
function showStats() {
    let html = `
        <div id="stats-container">
            <h5>Statistics</h5>
            <table id="stats-table">
                <tr>
                    <td class="number">${gameStats.gamesPlayed}</td>
                    <td class="number">${gameStats.gamesWon}</td>
                    <td class="number">${Math.round(gameStats.winPercentage)}</td>
                    <td class="number">${gameStats.currentStreak}</td>
                    <td class="number">${gameStats.maxStreak}</th>
                </tr>
                <tr>
                    <td class="label">Played</td>
                    <td class="label">Won</td>
                    <td class="label">Win %</td>
                    <td class="label">Current Streak</td>
                    <td class="label">Max Streak</td>
                </tr>
            </table>
            <h5>Guess Distribution</h5>
            <div id="stats-graph">`;
    let maxGuesses = 0;
    for (let i = 1; i <= NUMBER_OF_GUESSES; i++) {
        if (gameStats.guesses[i] > maxGuesses) maxGuesses = gameStats.guesses[i];
    }
    for (let i = 1; i <= NUMBER_OF_GUESSES; i++) {
        let width = Math.round(gameStats.guesses[i] / maxGuesses * 100);
        let highlight = (gameStats.highlight == i) ? 'highlight' : '';
        html += `
            <div class="bar-outer">
                <span>${i}</span>
                <div class="bar-inner ${highlight}" style="width: ${width}%">${gameStats.guesses[i]}</div>
            </div>`;
    }
    html += `
        </div>
    </div>`;
    msgbox('', html);
}

// Use msgbox to display a modal settings dialog
function showSettings() {
    let html = `
        <div id="settings-container">
            <h5>Settings</h5>

            <div class="setting">
                <div class="Text">
                    <div class="title">Dark Theme</div>
                    <div class="description">Reduce luminance to ergonmy levels</div>
                </div>
                <div class="control">
                    <div class="switch" id="dark-theme" name="dark-theme" ${gameSettings.darkTheme ? 'checked' : ''}>
                        <div class="knob">&nbsp;</div>
                    </div>
                </div>
            </div>

            <div class="setting vertical">
                <div class="Text">
                    <div class="title">Card Set</div>
                </div>
                <div class="image-select">
                    <img class="image-option" name="set" data-value="montecarlo" data-radius="2px" title="Montecarlo" src="./img/back-montecarlo.png">
                    <img class="image-option" name="set" data-value="minecraft" data-radius="10px" title="Minecraft" src="./img/back-minecraft.png">
                    <img class="image-option" name="set" data-value="pokemon" data-radius="12px" title="Pokemon" src="./img/back-pokemon.png">
                </div>
            </div>

        </div>`;
    msgbox('', html);
    // Set a selected attribute in card set options (if selected)
    if (gameSettings.set) document.querySelector(`.image-option[name='set'][data-value='${gameSettings.set.name}']`).setAttribute('selected', '');
    // Event listener for changes in the settings controls
    document.getElementById('settings-container').addEventListener('click', (e) => {
        let target = e.target;
        let name = target.getAttribute('name');
        let checked = (target.getAttribute('checked') == null);

        // Dark Theme
        if (name == 'dark-theme') {
            gameSettings.darkTheme = checked;
            if (checked) {
                document.body.classList.add('dark-theme');
                target.setAttribute('checked', '');
            } else {
                document.body.classList.remove('dark-theme');
                target.removeAttribute('checked');
            }
        }

        // Card image set
        if (name == 'set') {
            let lastSelected = document.querySelector('.image-option[name="set"][selected]');
            if (lastSelected) lastSelected.removeAttribute('selected');
            target.setAttribute('selected', '');
            gameSettings.set = { name: target.dataset.value, radius: target.dataset.radius };
            // Apply setting to actual game
            setCardSetStyle();
        }

        // Store configuration in local storage
        storeGameSettings(gameSettings);
    });
}

// Change set of images for open cards
// style: must be a valid string part of a filename like set-{styleName}.png
function setCardSetStyle() {
    let rules = []; // empty array to gather all the CSS rules of
    let sheets = [...document.styleSheets]; // all the document stylesheets
    sheets.forEach(sheet => rules.push(...sheet.cssRules)); // all rules together
    cardRule = rules.find(rule => rule.selectorText === '.card'); // to find the card class selector
    cardRule.style.backgroundImage = `url("./img/back-${gameSettings.set.name}.png")`; // and change the back image style
    cardRule.style.borderRadius = gameSettings.set.radius; // and the card border radius
    cardOpenRule = rules.find(rule => rule.selectorText === '.card.open'); // to find the open card class selector
    cardOpenRule.style.backgroundImage = `url("./img/set-${gameSettings.set.name}.png")`; // and change the back image style
}

// Initializes the navigation bars buttons
function initNavBar() {
    document.getElementById('button-menu').addEventListener('click', () => { msgbox('Menu', 'This is a work in progress...') });
    document.getElementById('button-help').addEventListener('click', showHelp);
    document.getElementById('button-statistics').addEventListener('click', showStats);
    document.getElementById('button-settings').addEventListener('click', showSettings);
}

// INITIALIZE THE GAME
initNavBar();
initBoard();
restoreGameState();

// End of code.

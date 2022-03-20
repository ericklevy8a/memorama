/*
* Memorama Game Script
* (c) 2022 by Erick Levy!
* Inspired by a board game from my childhood :)
*/

const BOARD_PLACES = 32;

// Size and distribution of image set
const IMAGE_ROWS = 4;
const IMAGE_COLS = 4;
const IMAGE_WIDTH = 90;
const IMAGE_HEIGHT = 90;

// Some timing parameters
const CLOSE_PAIR_DELAY = 1500;
const TRANSITION_DELAY = 125;

// Array to maintain the image set
let gImageSet = [];

// Reference to first and second cards in each guess
let gCard1 = null;
let gCard2 = null;

// Statistical data
let gSteps = 0;
let gStartTime = 0;

// Try to get the game state, statistical and settings structures from local storage
let gameState = getGameState() || false;
let gameSettings = getGameSettings() || false;
let gameStatistics = getGameStatistics() || false;

// If present, apply some gamesettings
if (gameSettings) {
    if (gameSettings.darkTheme) document.body.classList.add('dark-theme');
    if (gameSettings.set) changeCardSetCSS();
}

/**
 * Initialize the data for each pair of the image set
 */
function initImages() {
    gImageSet = [];
    for (let i = 0; i < IMAGE_ROWS; i++) {
        for (let j = 0; j < IMAGE_COLS; j++) {
            let image = {
                // id: number used for identify each image pair in the set
                id: i * IMAGE_COLS + j,
                // style: string to reposition the background to display the corresponding image
                style: `background-position: left ${IMAGE_WIDTH * j}px top ${IMAGE_HEIGHT * i}px;`,
                // avail: keep track of available images of each pair (id)
                avail: 2
            }
            gImageSet.push(image);
        }
    }
}

/**
 * Get a ramdom image data for a card from a subset of avail images (in pairs)
 * @returns {object|false} A struct with data of the random picked image or false if there are no avail
 */
function getRandomImage() {
    // If image set is not initialized
    if (gImageSet.length == 0) {
        initImages();
        let boardPlaces = BOARD_PLACES;
        // Check if board places is lesser than images in set
        if (boardPlaces < gImageSet.length * 2) {
            // Force boardPlaces to be an even number
            boardPlaces -= boardPlaces % 2;
            // Limit image array to the number of needed pairs
            gImageSet.length = boardPlaces / 2;
        }
    }
    let avail = [];
    // Get the indexes of the available images
    for (let c = 0; c < gImageSet.length; c++) {
        // If available
        if (gImageSet[c].avail > 0) {
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
    // Decrement availability of the picked image
    gImageSet[index].avail -= 1;
    // Return the image data
    return gImageSet[index];
}

/**
 * Initialize the game board with random cards
 */
function initBoard() {
    let boardContainer = document.getElementById('board-container');
    for (let i = 0; i < BOARD_PLACES; i++) {
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
            boardContainer.appendChild(cardHolder);
        }
    }
}

/**
 * Management of the card click
 * @param {event} e
 */
function cardClick(e) {
    let target = e.target;
    // Check if card is already open
    if (target.classList.contains('open')) {
        return;
    }
    // Check the corresponding guess position and open the card
    if (gCard1 == null) {
        gCard1 = target;
        openCard(target);
    } else if (gCard2 == null) {
        gCard2 = target;
        openCard(target);
        gSteps += 1;
    }
}

/**
 * Manipulate CSS classes for a card open transition
 * @param {object} card
 */
function openCard(card) {
    card.classList.add('flip');
    setTimeout(() => {
        card.classList.add('open');
        card.classList.remove('flip');
    }, 250)
    if (gCard1 !== null && gCard2 !== null) {
        checkGuessPair();
    }
}

/**
 * Check if the guess pair of cards is the same image
 */
function checkGuessPair() {
    if (gCard1 !== null && gCard2 !== null) {
        // Increment the steps (pairs opened)
        gSteps += 1;
        // If there is a pair
        if (gCard1.dataset.id === gCard2.dataset.id) {
            // Take or retire a match pair
            setTimeout(() => {
                takeGuessCards();
            }, CLOSE_PAIR_DELAY);
        } else {
            // Close the unmatched pair of cards
            setTimeout(() => {
                closeGuessCards();
            }, CLOSE_PAIR_DELAY);
        }
    }
}

/**
 * Close the guess pair of cards and update stats
 */
function closeGuessCards() {
    closeCard(gCard1);
    closeCard(gCard2);
    //Reset pair
    gCard1 = null;
    gCard2 = null;
    // Update and store game state
    gSteps += 1;
    gameState.steps = gSteps;
    setGameState();
}

/**
 * Manipulate classes and transition timeup to close a card
 * @param {*} card - The reference to the card to close
 */
function closeCard(card) {
    card.classList.add('flip');
    setTimeout(() => {
        card.classList.remove('open');
        card.classList.remove('flip');
    }, TRANSITION_DELAY);
}

/**
 * Take the guess pair of cards and check game over condition
 */
function takeGuessCards() {
    takeCard(gCard1);
    takeCard(gCard2, () => {
        updateBoardState();
        setGameState();
    });
    // Reset guess pair
    gCard1 = null;
    gCard2 = null;
    // Update and game state
    gSteps += 1;
    gameState.steps = gSteps;
    setGameState();
    // Check GAME OVER condition (no cards remain)
    let takenCount = [...document.getElementsByClassName('card open')].length;
    if (BOARD_PLACES - takenCount === 0) {
        setTimeout(() => {
            gameState.gameStatus = 'GAME_OVER';
            setGameState();
            // Prepare and save game statistics
            let efficiency = Math.round((BOARD_PLACES / 2) / gSteps * 100);
            let highlight = Math.floor(efficiency / 10);
            gameStatistics.freq[highlight] += 1;
            gameStatistics.highlight = highlight;
            gameStatistics.gamesPlayed += 1;
            gameStatistics.stepsPlayed += gSteps;
            gameStatistics.efficiencyRate = Math.round(
                gameStatistics.gamesPlayed * (BOARD_PLACES / 2)
                / gameStatistics.stepsPlayed * 100);
            setGameStatistics();
            // Prepare message and show in modal box
            let msg = `<p>You have achieved it in ${gSteps} attempts with an efficiency of ${efficiency}%<p>`;
            msg += '<p>Press <b>RESTART</b> to play a new game board...<p>';
            msgbox('Game Over!', msg, 'Restart', gameRestart);
        }, TRANSITION_DELAY * 2);
    }
}

/**
 * Manipulate classes and transition timeup to take off a card
 * @param {*} card - The reference to the card to take off
 * @param {function} callback - Something execute at the end of the timeout
 */
function takeCard(card, callback = null) {
    card.classList.add('taken');
    setTimeout(() => {
        card.classList.add('hidden');
        card.classList.remove('taken');
        if (callback) callback();
    }, TRANSITION_DELAY);
}

/**
 * Provisional function to restart the game (reloading page)
 */
function gameRestart() {
    location.reload();
}

// LOCAL STORAGE FUNCTIONS

/**
 * Restores a game state previusly saved in local storage
 */
function restoreGameState() {
    if (gameState) {
        if (gameState.gameStatus === 'IN_PROGRESS') {
            // Reconstructs the game from the stored state data
            let cards = [...document.getElementsByClassName('card')];
            let boardState = gameState.boardState;
            if (cards.length === boardState.length) {
                for (let i = 0; i < cards.length; i++) {
                    cards[i].dataset.id = boardState[i].id;
                    cards[i].style = gImageSet[boardState[i].id].style;
                    cards[i].className = boardState[i].className;
                }
            }
            // Restore timer and step counter
        } else {
            // Create and store a new game state data
            updateBoardState();
            gameState.gameStatus = 'IN_PROGRESS';
            // Reset time and step counter
            setGameState();
        }
    }
}

/**
 * Prepare the game board state for store
 */
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

/**
 * Get the game state from local storage or creates a initial one
 * @returns a structure with the game state data
 */
function getGameState() {
    return getLocalStorageItem('memorama-state', {
        boardState: [],
        gameStatus: '',
        steps: 0
    });
}

/**
 * Store the game state to local storage
 */
function setGameState() {
    setLocalStorageItem('memorama-state', gameState);
}

/**
 * Get the game statistics from local storage or creates a initial one
 * @returns a structure with the game statistics data
 */
function getGameStatistics() {
    return getLocalStorageItem('memorama-statistics', {
        freq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        highlight: 0,
        gamesPlayed: 0,
        stepsPlayed: 0,
        efficiencyRate: 0
    });
}

/**
 * Store the game statistics to local storage
 */
function setGameStatistics() {
    setLocalStorageItem('memorama-statistics', gameStatistics);
}

/**
 * Get the game settings from local storage or creates a initial one
 * @returns a structure with the game settings data
 */
function getGameSettings() {
    return getLocalStorageItem('memorama-settings', {
        darkTheme: false,
        set: {
            name: "montecarlo",
            radius: "2px"
        }
    });
}

/**
 * Store the game settings to local storage
 */
function setGameSettings() {
    setLocalStorageItem('memorama-settings', gameSettings);
}

/**
 * Save an item in local storage
 * @param {string} key - The name or key of the item
 * @param {*} value - The value to stringify and save
 */
function setLocalStorageItem(key, value) {
    if (typeof (Storage) !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

/**
 * Get an item value from local storage
 * @param {string} key  - The name or key of the item
 * @param {*} value - A default value to return in case of fail
 * @returns A parsed object or the default value or false
 */
function getLocalStorageItem(key, value = false) {
    if (typeof (Storage) !== 'undefined') {
        return JSON.parse(localStorage.getItem(key)) || value;
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
function showStatistics() {
    let html = `
        <div id="stats-container">
            <h5>Statistics</h5>
            <table id="stats-table">
                <tr>
                    <td class="number">${gameStatistics.gamesPlayed}</td>
                    <td class="number">${gameStatistics.efficiencyRate}</td>
                </tr>
                <tr>
                    <td class="label">Played</td>
                    <td class="label">Efficiency %</td>
                </tr>
            </table>
            <h5>Efficiency Distribution</h5>
            <div id="stats-graph">`;
    let maxValue = 0;
    for (let i = 0; i < 10; i++)
        if (gameStatistics.freq[i] > maxValue)
            maxValue = gameStatistics.freq[i];
    for (let i = 0; i < 10; i++) {
        let width = Math.round(gameStatistics.freq[i] / maxValue * 100);
        let highlight = (gameStatistics.highlight == i) ? 'highlight' : '';
        html += `
            <div class="bar-outer">
                <span>${i * 10}</span>
                <div class="bar-inner ${highlight}" style="width: ${width}%">${gameStatistics.freq[i]}</div>
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
            changeCardSetCSS();
        }

        // Store configuration in local storage
        setGameSettings();
    });
}

/**
 * Change set of CSS images to reflect game settings (user selections)
 */
function changeCardSetCSS() {
    let rules = []; // empty array to gather all the CSS rules of
    let sheets = [...document.styleSheets]; // all the document stylesheets
    sheets.forEach(sheet => rules.push(...sheet.cssRules)); // all rules together
    cardRule = rules.find(rule => rule.selectorText === '.card'); // to find the card class selector
    cardRule.style.backgroundImage = `url("./img/back-${gameSettings.set.name}.png")`; // and change the back image style
    cardRule.style.borderRadius = gameSettings.set.radius; // and the card border radius
    cardOpenRule = rules.find(rule => rule.selectorText === '.card.open'); // to find the open card class selector
    cardOpenRule.style.backgroundImage = `url("./img/set-${gameSettings.set.name}.png")`; // and change the back image style
}

/**
 * Initializes the navigation bars buttons
 */
function initNavBar() {
    document.getElementById('button-menu').addEventListener('click', () => { msgbox('Menu', 'This is a work in progress...') });
    document.getElementById('button-help').addEventListener('click', showHelp);
    document.getElementById('button-statistics').addEventListener('click', showStatistics);
    document.getElementById('button-settings').addEventListener('click', showSettings);
}

// INITIALIZE THE GAME
initNavBar();
initBoard();
restoreGameState();

// End of code.

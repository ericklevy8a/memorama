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
    if (gameSettings.set) changeCardSet();
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
    boardContainer.innerHTML = '';
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
            if (gameSettings.set) {
                cardHolder.dataset.set = card.dataset.set = gameSettings.set;
            }
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
    //Reset guess pair
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
    // Take out the pair o cards and pass a callback...
    takeCard(gCard1);
    takeCard(gCard2, () => {
        // ...to update and save the board state
        updateBoardState();
        setGameState();
    });
    // Reset guess pair
    gCard1 = null;
    gCard2 = null;
    // Update and save game state
    gSteps += 1;
    gameState.steps = gSteps;
    setGameState();
    // Check for GAME OVER condition (no cards remain)
    checkGameOver();
}

/**
 * Manipulate classes and transition timeup to take off a card
 * @param {*} card - The reference to the card to take off
 * @param {function} callback - Something to execute at the end of the timeout
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
 * Check game over condition calculating the remain pairs of cards
 */
function checkGameOver() {
    let takenCount = [...document.getElementsByClassName('card open')].length;
    // Calculate and check remain cards
    if (BOARD_PLACES - takenCount === 0) {
        let endTime = Date.now();
        // Use a timeout to wait for the cards transitions and board updates
        setTimeout(() => {
            gameState.gameStatus = 'GAME_OVER';
            setGameState();
            // Prepare and save game statistics
            let gameTime = calculateGameTime(gameState.startTime, endTime);
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
            // Prepare a game over message and show it in a modal box
            let msg = `<p>You have achieved it in ${gameTime}, with ${gSteps} attempts and an efficiency of ${efficiency}%.</p>`;
            msg += '<p>Press <b>RESTART</b> or reload the page to play again...</p>';
            msgbox('Game Over!', msg, 'Restart', buttonRestartOnClick);
        }, TRANSITION_DELAY * 2);
    }
}

/**
 * Calculate and construct a string with the time of the game
 * @param {number} startTime - a start time in milliseconds
 * @param {number} endTime - an end time in milliseconds
 * @returns {string} - the time of the game in milliseconds
 */
function calculateGameTime(startTime, endTime) {
    if (startTime < endTime) {
        let ms = endTime - startTime;
        let time = timeInMsToString(ms, false);
        let arr = time.split(':');
        let list = [];
        if (arr[0] !== '0') list.push(arr[0] + ' ' + (arr[0] == '1' ? 'hour' : 'hours'));
        if (arr[1] !== '0') list.push(arr[1] + ' ' + (arr[1] == '1' ? 'minute' : 'minutes'));
        if (arr[2] !== '0') list.push(arr[2] + ' ' + (arr[2] == '1' ? 'second' : 'seconds'));
        const formatter = new Intl.ListFormat('en', { type: 'conjunction' });
        return formatter.format(list);
    }
}
/**
 * Convert a time in ms to a string
 * @param {number} ms - number of milliseconds to convert (default is 0)
 * @param {boolean} leadingZeros - leading zeros format (default is true)
 * @returns {string} in the H:mm:ss or H:m:s format
 */
function timeInMsToString(ms = 0, leadingZeros = true) {
    let sec = Math.round(ms / 1000);
    let min = Math.floor(sec / 60);
    let hrs = Math.floor(min / 60);
    sec = sec % 60;
    min = min % 60;
    if (leadingZeros)
        return '' + hrs + ':' + ('0' + min).slice(-2) + ':' + ('0' + sec).slice(-2);
    else
        return hrs + ':' + min + ':' + sec;
}

/**
 * Process button Restart on click event
 */
function buttonRestartOnClick() {
    msgboxClose();
    gameRestart();
}

/**
 * Restart the game (without reloading the page)
 */
function gameRestart() {
    // Reset game status, start time and step counter
    gameState.gameStatus = 'IN_PROGRESS';
    gameState.startTime = gStartTime = Date.now();
    gameState.steps = gSteps = 0;
    // Create and store a new game board and game state
    initImages();
    initBoard();
    updateBoardState();
    setGameState();
}

// LOCAL STORAGE FUNCTIONS

/**
 * Restores a game previusly saved in local storage or create a new one
 */
function restoreGameState() {
    if (gameState) {
        if (gameState.gameStatus === 'IN_PROGRESS') {
            // Reconstructs the game from the stored state data
            restoreBoardState();
            // Restore timer and step counter
            gStartTime = gameState.startTime;
            gSteps = gameState.steps;
        } else {
            gameRestart();
        }
    } else {
        msgbox('Error', 'There is a problem with local storage that prevents knowing the game status!');
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
 * Restore the game board state from store
 */
function restoreBoardState() {
    let cards = [...document.getElementsByClassName('card')];
    let boardState = gameState.boardState;
    if (cards.length === boardState.length) {
        for (let i = 0; i < cards.length; i++) {
            cards[i].dataset.id = boardState[i].id;
            cards[i].style = gImageSet[boardState[i].id].style;
            cards[i].className = boardState[i].className;
        }
    }
}

/**
 * Get the game state from local storage or creates a initial one
 * @returns a structure with the game state data
 */
function getGameState() {
    return getLocalStorageItem('memorama-state', {
        boardState: [],
        gameStatus: '',
        startTime: 0,
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
        set: "montecarlo"
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

function showAbout() {
    let msg = `
        <div id="about-container">
            <p>© Copyright 2022 by Erick Levy!</p>
            <p>Inspired in a board game I played with my family in my chilhood named Memorama®
            from the mexican game company Novedades Montecarlo, S.A. de C.V. 1973.</p>
            <p>Thank you for taking the time to learn about and play with this little app.</p>
            <h5>Other Games</h5>
            <p>There are other games and Apps I was implemented and published. If you want to take a look at them,
            here are the links: </p>
            <ul>
                <li><a href="../switcher/"><i class="switcher"></i>The Switcher Game</a></li>
                <li><a href="../tileslider/"><i class="tileslider"></i>The Tile Slider</a></li>
                <li><a href="../wordle/"><i class="wordle"></i>Wordle Clone</a></li>
                <li><a href="../pokedex/"><i class="pokedex"></i>Pokedex (not a game)</a></li>
            </ul>
        </div>
    `;
    msgbox('About This Game', msg);
}

// Use msgbox to display a modal help dialog
function showHelp() {
    let msg = `
        <div id="help-container">
            <p>The goal of the game is to find pairs with the same printed figure using memory.</p>
            <p>You can open up to two cards per turn, if both match,
                the pair will be removed from the board.</p>
            <p>The game is over when there are no more cards in the board.</p>
            <h5>SOME ADVICE</h5>
            <p>Try to play neatly and stay focused.</p>
            <p>In desktop viewers you can use zooming to adjust the size of the elements.</p>
        </div>
    `;
    msgbox('How To Play', msg);
}

// Use msgbox to display a modal statistics dialog
function showStatistics() {
    let html = `
        <div id="stats-container">
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
    msgbox('Statistics', html);
}

// Use msgbox to display a modal settings dialog
function showSettings() {
    let html = `
        <div id="settings-container">

            <div class="setting">
                <div class="Text">
                    <div class="title">Dark Theme</div>
                    <div class="description">Reduce luminance to ergonmy levels</div>
                </div>
                <div class="control">
                    <div class="switch" id="dark-theme" name="dark-theme">
                        <div class="knob">&nbsp;</div>
                    </div>
                </div>
            </div>

            <div class="setting vertical">
                <div class="Text">
                    <div class="title">Card Set</div>
                    <div class="description">Choose your favorite card style</div>
                </div>
                <div class="image-select">
                    <img class="image-option" name="set" data-value="montecarlo" title="Montecarlo" src="./img/sets/montecarlo/back.png">
                    <img class="image-option" name="set" data-value="minecraft" title="Minecraft" src="./img/sets/minecraft/back.png">
                    <img class="image-option" name="set" data-value="pokemon" title="Pokemon" src="./img/sets/pokemon/back.png">
                </div>
            </div>

        </div>`;
    msgbox('Settings', html);
    // Check for dark theme mode value and initialize its checked attribute
    if (gameSettings.darkTheme) document.getElementById('dark-theme').setAttribute('checked', '');
    // Check for actual image set value and initialize its option selected attribute
    if (gameSettings.set) document.querySelector(`.image-option[name='set'][data-value='${gameSettings.set}']`).setAttribute('selected', '');
    // Event listener for changes in the settings controls
    document.getElementById('settings-container').addEventListener('click', (e) => {
        let target = e.target;
        let name = target.getAttribute('name');

        // Dark Theme (check type control)
        if (name == 'dark-theme') {
            // Inverts checked state and update game setting
            let checked = (target.getAttribute('checked') == null);
            gameSettings.darkTheme = checked;
            // Apply setting on game and update the input checked state
            if (checked) {
                document.body.classList.add('dark-theme');
                target.setAttribute('checked', '');
            } else {
                document.body.classList.remove('dark-theme');
                target.removeAttribute('checked');
            }
        }

        // Card image set (image select option type control)
        if (name == 'set') {
            // Update image options selected state
            let lastSelected = document.querySelector('.image-option[name="set"][selected]');
            if (lastSelected) lastSelected.removeAttribute('selected');
            target.setAttribute('selected', '');
            // Update game setting
            gameSettings.set = target.dataset.value;
            // Apply setting to actual game
            changeCardSet();
        }

        // Store configuration in local storage
        setGameSettings();
    });
}

/**
 * Change set of images to reflect game settings (user selections)
 */
function changeCardSet() {
    let set = gameSettings.set;
    let cardHolders = [...document.getElementsByClassName('card-holder')];
    cardHolders.forEach(cardHolder => cardHolder.dataset.set = set);
    let cards = [...document.getElementsByClassName('card')];
    cards.forEach(card => card.dataset.set = set);
}

/**
 * Initializes the navigation bars buttons
 */
function initNavBar() {
    document.getElementById('button-menu').addEventListener('click', showAbout);
    document.getElementById('button-help').addEventListener('click', showHelp);
    document.getElementById('button-statistics').addEventListener('click', showStatistics);
    document.getElementById('button-settings').addEventListener('click', showSettings);
}

// INITIALIZE THE GAME
initNavBar();
initBoard();
restoreGameState();

// End of code.

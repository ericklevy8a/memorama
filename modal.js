//
// CODE FOR MODAL DIALOGS
//

/**
 * Modal message box dialog.
 *
 * Displays a message in a modal dialog box, waits for the user to click a button,
 * and send the button click event to the function especified to process the user choice.
 *
 * NOTE: The msgboxClose function need to be called to close the dialog box.
 *
 * Parameters:
 * @param {string} title        Required. String expression to display as a window title.
 * @param {string} msg          Required. String expression with the main message or HTML.
 * @param {array}  arrActions   Optional. String or array of strings with the label
 *                              of the buttons to display. If omited, only an Ok button
 *                              will be displayed.
 * @param {function} fnOnClick  A lambda function to process the buttons click event.
 *                              If omitted, the msgboxClose function will be called.
 */
function msgbox(title, text, arrActions = 'Ok', fnOnClick = msgboxClose) {
    const modalScreen = document.getElementById('modal-screen');
    const msgbox = document.getElementById('msgbox');
    const msgboxTitleClose = document.getElementById('msgbox-title-close');
    const msgboxTitle = document.getElementById('msgbox-title');
    const msgboxText = document.getElementById('msgbox-text');
    const msgboxButtons = document.getElementById('msgbox-buttons');
    // Close dialog handlers
    msgboxTitleClose.addEventListener('click', msgboxClose);
    document.addEventListener('keyup', document.keyupfn = function (e) { if (e.code == 'Escape') msgboxClose() });
    // Displat texts in title and message
    msgboxTitle.textContent = title;
    msgboxText.innerHTML = text;
    // Force the parameter for button(s) to an array
    if (!Array.isArray(arrActions)) {
        arrActions = [arrActions];
    }
    // Empty the button(s) container tag and...
    msgboxButtons.innerHTML = '';
    // ...fill it again with all the new buttons
    arrActions.forEach(element => {
        let button = document.createElement('button');
        button.innerText = element;
        button.addEventListener('click', fnOnClick);
        msgboxButtons.appendChild(button);
    });
    // Add a blur effect on backstage area(s)
    let blurables = Array.from(document.getElementsByClassName('blurable'));
    blurables.forEach(blurable => { blurable.classList.add('blur'); });
    // Unhide modal screen and box
    modalScreen.classList.remove('hide');
    msgbox.classList.remove('hide');
    setTimeout(() => {
        modalScreen.classList.add('show');
        msgbox.classList.add('show');
    }, 0);
}

function msgboxClose() {
    const modalScreen = document.getElementById('modal-screen');
    const msgbox = document.getElementById('msgbox');
    document.removeEventListener('keyup', document.keyupfn);
    // Remove the blur effect on backstage area(s)
    let blurables = Array.from(document.getElementsByClassName('blurable'));
    blurables.forEach(blurable => { blurable.classList.remove('blur'); });
    // Hide modal screen and box
    msgbox.classList.remove('show');
    modalScreen.classList.remove('show');
    setTimeout(() => {
        modalScreen.classList.add('hide');
        msgbox.classList.add('hide');
    }, 500);
}

// import the modal HTML layout/template
fetch('./modal.html').then(response => {
    return response.text();
}).then(html => {
    document.body.insertAdjacentHTML('beforeend', html);
});

// End of code.
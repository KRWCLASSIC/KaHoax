// ==UserScript==
// @name         KaHoax
// @version      1.1.2
// @description  A hack for kahoot.it! First tries proxy lookup by Quiz ID. If that fails, uses fallback search and displays a scrollable dropdown for selection.
// @namespace    https://github.com/KRWCLASSIC
// @match        https://kahoot.it/*
// @icon         https://raw.githubusercontent.com/KRWCLASSIC/KaHoax/refs/heads/main/kahoot.svg
// @grant        none
// ==/UserScript==
(function() {
    var Version = '1.1.2';

    var questions = [];
    var info = {
        numQuestions: 0,
        questionNum: -1,
        lastAnsweredQuestion: -1,
        defaultIL: true,
        ILSetQuestion: -1,
    };
    var PPT = 900;
    var Answered_PPT = 900;
    var autoAnswer = false;
    var showAnswers = false;
    var inputLag = 100;

    // Helper: Finds an element by attribute value.
    function FindByAttributeValue(attribute, value, element_type) {
        element_type = element_type || "*";
        var All = document.getElementsByTagName(element_type);
        for (var i = 0; i < All.length; i++) {
            if (All[i].getAttribute(attribute) == value) { 
                return All[i]; 
            }
        }
    }

    // Sanitize input: Trim whitespace; if it starts with "https//" (missing colon) fix it.
    // If a full URL is provided, return only its last non-empty segment.
    function sanitizeInput(val) {
        val = val.trim();
        if (val.indexOf("https//") === 0) {
            val = val.replace("https//", "https://");
        }
        if (/^https?:\/\//i.test(val)) {
            var parts = val.replace(/^https?:\/\//i, '').split('/');
            return parts.filter(Boolean).pop();
        }
        return val;
    }

    // Reset UI function – clears input, color, questions array, etc.
    function resetUI() {
        inputBox.value = "";
        inputBox.style.backgroundColor = '#333333';
        dropdown.style.display = 'none';
        dropdownCloseButton.style.display = 'none';
        questions = [];
        info.numQuestions = 0;
        info.questionNum = -1;
        info.lastAnsweredQuestion = -1;
        questionsLabel.textContent = 'Question 0 / 0';
    }

    // --- UI Creation ---
    const uiElement = document.createElement('div');
    uiElement.className = 'floating-ui';
    uiElement.style.position = 'fixed';
    uiElement.style.top = '5%';
    uiElement.style.left = '5%';
    uiElement.style.width = '350px';
    uiElement.style.maxWidth = '90vw';
    uiElement.style.height = 'auto';
    uiElement.style.backgroundColor = '#1e1e1e';
    uiElement.style.borderRadius = '10px';
    uiElement.style.boxShadow = '0px 0px 10px 0px rgba(0, 0, 0, 0.5)';
    uiElement.style.zIndex = '9999';
    uiElement.style.fontSize = '16px';

    const handle = document.createElement('div');
    handle.className = 'handle';
    handle.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    handle.style.fontSize = '1em';
    handle.style.color = '#ffffff';
    handle.style.width = '100%';
    handle.style.height = '40px';
    handle.style.backgroundColor = '#2c2c2c';
    handle.style.borderRadius = '10px 10px 0 0';
    handle.style.cursor = 'grab';
    handle.style.textAlign = 'left';
    handle.style.paddingLeft = '15px';
    handle.style.lineHeight = '40px';
    handle.style.boxSizing = 'border-box';
    handle.style.display = 'flex';
    handle.style.alignItems = 'center';

    // Add Kahoot icon with filter to make it white
    const kahootIcon = document.createElement('img');
    kahootIcon.src = 'https://icons.iconarchive.com/icons/simpleicons-team/simple/256/kahoot-icon.png';
    kahootIcon.style.height = '22px';
    kahootIcon.style.width = '22px';
    kahootIcon.style.marginRight = '8px';
    kahootIcon.style.filter = 'brightness(0) invert(1)'; // Make icon white
    handle.appendChild(kahootIcon);

    // App name
    const appTitle = document.createElement('span');
    appTitle.textContent = 'KaHoax';
    appTitle.style.color = 'white';
    handle.appendChild(appTitle);

    // Add version to the top bar (small) instead of in the middle
    const versionSpan = document.createElement('span');
    versionSpan.textContent = 'v' + Version;
    versionSpan.style.fontSize = '0.8em';
    versionSpan.style.opacity = '0.7';
    versionSpan.style.marginLeft = '5px';
    appTitle.appendChild(versionSpan);

    uiElement.appendChild(handle);

    const closeButton = document.createElement('div');
    closeButton.className = 'close-button';
    closeButton.textContent = '✕';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '0';
    closeButton.style.right = '0';
    closeButton.style.width = '40px';
    closeButton.style.height = '40px';
    closeButton.style.backgroundColor = '#ff4d4d';
    closeButton.style.color = 'white';
    closeButton.style.borderRadius = '0 10px 0 0';
    closeButton.style.display = 'flex';
    closeButton.style.justifyContent = 'center';
    closeButton.style.alignItems = 'center';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '1em';
    handle.appendChild(closeButton);

    const minimizeButton = document.createElement('div');
    minimizeButton.className = 'minimize-button';
    minimizeButton.textContent = '─';
    minimizeButton.style.color = 'white';
    minimizeButton.style.position = 'absolute';
    minimizeButton.style.top = '0';
    minimizeButton.style.right = '40px';
    minimizeButton.style.width = '40px';
    minimizeButton.style.height = '40px';
    minimizeButton.style.backgroundColor = '#555555';
    minimizeButton.style.display = 'flex';
    minimizeButton.style.justifyContent = 'center';
    minimizeButton.style.alignItems = 'center';
    minimizeButton.style.cursor = 'pointer';
    minimizeButton.style.fontSize = '1em';
    handle.appendChild(minimizeButton);

    // QUIZ ID/NAME
    const headerText = document.createElement('h2');
    headerText.textContent = 'QUIZ ID/NAME';
    headerText.style.display = 'block';
    headerText.style.margin = '15px 0';
    headerText.style.textAlign = 'center';
    headerText.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    headerText.style.fontSize = '1.25em';
    headerText.style.color = 'white';
    headerText.style.textShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
    uiElement.appendChild(headerText);

    // Input container (relative for the dropdown)
    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.flexDirection = 'column';
    inputContainer.style.alignItems = 'center';
    inputContainer.style.position = 'relative';
    inputContainer.style.width = '90%';
    inputContainer.style.margin = '0 auto 15px auto';

    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.style.color = '#ffffff';
    inputBox.placeholder = 'Quiz Id/Name of Quiz here...';
    inputBox.style.width = '100%';
    inputBox.style.height = '35px';
    inputBox.style.margin = '0';
    inputBox.style.padding = '0 10px';
    inputBox.style.border = '1px solid #444444';
    inputBox.style.borderRadius = '10px';
    inputBox.style.outline = 'none';
    inputBox.style.textAlign = 'center';
    inputBox.style.fontSize = '0.9em';
    inputBox.style.backgroundColor = '#333333';
    inputBox.style.boxSizing = 'border-box';
    inputContainer.appendChild(inputBox);

    // If user manually clears input, reset
    inputBox.addEventListener('input', function() {
        if (inputBox.value.trim() === "") {
            resetUI();
        }
    });

    // Enter button with consistent font
    const enterButton = document.createElement('button');
    enterButton.textContent = 'Enter';
    enterButton.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif'; 
    enterButton.style.display = 'block';
    enterButton.style.marginTop = '10px';
    enterButton.style.width = '100%';
    enterButton.style.height = '35px';
    enterButton.style.fontSize = '0.9em';
    enterButton.style.cursor = 'pointer';
    enterButton.style.backgroundColor = '#6c757d';
    enterButton.style.color = 'white';
    enterButton.style.border = 'none';
    enterButton.style.borderRadius = '5px';
    enterButton.style.padding = '8px';
    enterButton.style.transition = 'background-color 0.3s';
    enterButton.addEventListener('click', handleInputChange);
    enterButton.addEventListener('mouseover', () => {
        enterButton.style.backgroundColor = '#5a6268';
    });
    enterButton.addEventListener('mouseout', () => {
        enterButton.style.backgroundColor = '#6c757d';
    });
    inputContainer.appendChild(enterButton);

    // Dropdown for fallback suggestions
    const dropdown = document.createElement('div');
    dropdown.style.position = 'absolute';
    dropdown.style.top = 'calc(100% + 5px)';
    dropdown.style.left = '0';
    dropdown.style.width = '100%';
    dropdown.style.backgroundColor = '#2c2c2c';
    dropdown.style.border = '1px solid #444444';
    dropdown.style.borderRadius = '10px';
    dropdown.style.zIndex = '10000';
    dropdown.style.maxHeight = '300px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.display = 'none';
    dropdown.style.boxSizing = 'border-box';
    inputContainer.appendChild(dropdown);

    // Create a header for the dropdown with the X button
    const dropdownHeader = document.createElement('div');
    dropdownHeader.style.position = 'sticky';
    dropdownHeader.style.top = '0';
    dropdownHeader.style.width = '100%';
    dropdownHeader.style.backgroundColor = '#333';
    dropdownHeader.style.padding = '8px 0';
    dropdownHeader.style.textAlign = 'right';
    dropdownHeader.style.marginBottom = '5px';
    dropdownHeader.style.zIndex = '10002';
    dropdownHeader.style.boxSizing = 'border-box';

    // X button to close dropdown & reset
    const dropdownCloseButton = document.createElement('button');
    dropdownCloseButton.textContent = 'X';
    dropdownCloseButton.style.width = '25px';
    dropdownCloseButton.style.height = '25px';
    dropdownCloseButton.style.backgroundColor = 'red';
    dropdownCloseButton.style.color = 'white';
    dropdownCloseButton.style.border = 'none';
    dropdownCloseButton.style.borderRadius = '50%';
    dropdownCloseButton.style.cursor = 'pointer';
    dropdownCloseButton.style.fontSize = '0.8em';
    dropdownCloseButton.style.display = 'none';
    dropdownCloseButton.style.marginRight = '10px';
    dropdownCloseButton.addEventListener('click', function() {
        resetUI();
    });
    dropdownHeader.appendChild(dropdownCloseButton);
    dropdown.appendChild(dropdownHeader);

    uiElement.appendChild(inputContainer);

    // POINTS PER QUESTION
    const header2 = document.createElement('h2');
    header2.textContent = 'POINTS PER QUESTION';
    header2.style.display = 'block';
    header2.style.margin = '15px 0';
    header2.style.textAlign = 'center';
    header2.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    header2.style.fontSize = '1.25em';
    header2.style.color = 'white';
    header2.style.textShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
    uiElement.appendChild(header2);

    const sliderContainer = document.createElement('div');
    sliderContainer.style.width = '90%';
    sliderContainer.style.margin = '15px auto';
    sliderContainer.style.display = 'flex';
    sliderContainer.style.flexDirection = 'column';
    sliderContainer.style.alignItems = 'center';
    sliderContainer.style.justifyContent = 'center';

    const pointsLabel = document.createElement('span');
    pointsLabel.textContent = 'Points per Question: 900';
    pointsLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    pointsLabel.style.fontSize = '0.9em';
    pointsLabel.style.margin = '0 0 10px 0';
    pointsLabel.style.color = 'white';
    sliderContainer.appendChild(pointsLabel);

    const pointsSlider = document.createElement('input');
    pointsSlider.type = 'range';
    pointsSlider.min = '500';
    pointsSlider.max = '1000';
    pointsSlider.value = '900';
    pointsSlider.style.width = '100%';
    pointsSlider.style.height = '10px';
    pointsSlider.style.border = 'none';
    pointsSlider.style.outline = 'none';
    pointsSlider.style.cursor = 'pointer';
    pointsSlider.className = 'custom-slider';
    sliderContainer.appendChild(pointsSlider);

    uiElement.appendChild(sliderContainer);

    pointsSlider.addEventListener('input', () => {
        const points = +pointsSlider.value;
        PPT = points;
        pointsLabel.textContent = 'Points per Question: ' + points;
    });

    // ANSWERING
    const header3 = document.createElement('h2');
    header3.textContent = 'ANSWERING';
    header3.style.display = 'block';
    header3.style.margin = '15px 0';
    header3.style.textAlign = 'center';
    header3.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    header3.style.fontSize = '1.25em';
    header3.style.color = 'white';
    header3.style.textShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
    uiElement.appendChild(header3);

    const answeringContainer = document.createElement('div');
    answeringContainer.style.display = 'flex';
    answeringContainer.style.alignItems = 'center';
    answeringContainer.style.justifyContent = 'space-evenly';
    answeringContainer.style.margin = '15px auto';
    answeringContainer.style.width = '90%';
    uiElement.appendChild(answeringContainer);

    // Auto Answer
    const autoContainer = document.createElement('div');
    autoContainer.style.display = 'flex';
    autoContainer.style.alignItems = 'center';
    autoContainer.style.gap = '10px';
    
    const autoAnswerLabel = document.createElement('span');
    autoAnswerLabel.textContent = 'Auto';
    autoAnswerLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    autoAnswerLabel.style.fontSize = '0.9em';
    autoAnswerLabel.style.color = 'white';
    autoContainer.appendChild(autoAnswerLabel);

    const autoAnswerSwitch = document.createElement('label');
    autoAnswerSwitch.className = 'switch';
    autoAnswerSwitch.style.position = 'relative';
    autoAnswerSwitch.style.display = 'inline-block';
    autoAnswerSwitch.style.width = '40px';
    autoAnswerSwitch.style.height = '20px';
    autoAnswerSwitch.style.marginLeft = '5px';
    autoContainer.appendChild(autoAnswerSwitch);

    const autoAnswerInput = document.createElement('input');
    autoAnswerInput.type = 'checkbox';
    autoAnswerInput.style.opacity = '0';
    autoAnswerInput.style.width = '0';
    autoAnswerInput.style.height = '0';
    autoAnswerInput.addEventListener('change', function() {
        autoAnswer = this.checked;
        info.ILSetQuestion = info.questionNum;
    });
    autoAnswerSwitch.appendChild(autoAnswerInput);

    const autoAnswerSlider = document.createElement('span');
    autoAnswerSlider.className = 'slider';
    autoAnswerSlider.style.position = 'absolute';
    autoAnswerSlider.style.cursor = 'pointer';
    autoAnswerSlider.style.top = '0';
    autoAnswerSlider.style.left = '0';
    autoAnswerSlider.style.right = '0';
    autoAnswerSlider.style.bottom = '0';
    autoAnswerSlider.style.backgroundColor = '#888888';
    autoAnswerSlider.style.transition = '0.4s';
    autoAnswerSlider.style.borderRadius = '10px';
    autoAnswerSwitch.appendChild(autoAnswerSlider);

    // Slider button
    const autoAnswerButton = document.createElement('span');
    autoAnswerButton.style.position = 'absolute';
    autoAnswerButton.style.content = '""';
    autoAnswerButton.style.height = '16px';
    autoAnswerButton.style.width = '16px';
    autoAnswerButton.style.left = '2px';
    autoAnswerButton.style.bottom = '2px';
    autoAnswerButton.style.backgroundColor = '#ffffff';
    autoAnswerButton.style.transition = '0.4s';
    autoAnswerButton.style.borderRadius = '50%';
    autoAnswerSlider.appendChild(autoAnswerButton);
    
    autoAnswerInput.addEventListener('change', function() {
        if(this.checked) {
            autoAnswerButton.style.transform = 'translateX(20px)';
            autoAnswerSlider.style.backgroundColor = '#4CAF50';
        } else {
            autoAnswerButton.style.transform = 'translateX(0)';
            autoAnswerSlider.style.backgroundColor = '#888888';
        }
    });

    answeringContainer.appendChild(autoContainer);

    // Show Answers
    const showContainer = document.createElement('div');
    showContainer.style.display = 'flex';
    showContainer.style.alignItems = 'center';
    showContainer.style.gap = '10px';
    
    const showAnswersLabel = document.createElement('span');
    showAnswersLabel.textContent = 'Show';
    showAnswersLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    showAnswersLabel.style.fontSize = '0.9em';
    showAnswersLabel.style.color = 'white';
    showContainer.appendChild(showAnswersLabel);

    const showAnswersSwitch = document.createElement('label');
    showAnswersSwitch.className = 'switch';
    showAnswersSwitch.style.position = 'relative';
    showAnswersSwitch.style.display = 'inline-block';
    showAnswersSwitch.style.width = '40px';
    showAnswersSwitch.style.height = '20px';
    showAnswersSwitch.style.marginLeft = '5px';
    showContainer.appendChild(showAnswersSwitch);

    const showAnswersInput = document.createElement('input');
    showAnswersInput.type = 'checkbox';
    showAnswersInput.style.opacity = '0';
    showAnswersInput.style.width = '0';
    showAnswersInput.style.height = '0';
    showAnswersInput.addEventListener('change', function() {
        showAnswers = this.checked;
    });
    showAnswersSwitch.appendChild(showAnswersInput);

    const showAnswersSlider = document.createElement('span');
    showAnswersSlider.className = 'slider';
    showAnswersSlider.style.position = 'absolute';
    showAnswersSlider.style.cursor = 'pointer';
    showAnswersSlider.style.top = '0';
    showAnswersSlider.style.left = '0';
    showAnswersSlider.style.right = '0';
    showAnswersSlider.style.bottom = '0';
    showAnswersSlider.style.backgroundColor = '#888888';
    showAnswersSlider.style.transition = '0.4s';
    showAnswersSlider.style.borderRadius = '20px';
    showAnswersSwitch.appendChild(showAnswersSlider);

    // Slider button
    const showAnswersButton = document.createElement('span');
    showAnswersButton.style.position = 'absolute';
    showAnswersButton.style.content = '""';
    showAnswersButton.style.height = '16px';
    showAnswersButton.style.width = '16px';
    showAnswersButton.style.left = '2px';
    showAnswersButton.style.bottom = '2px';
    showAnswersButton.style.backgroundColor = '#ffffff';
    showAnswersButton.style.transition = '0.4s';
    showAnswersButton.style.borderRadius = '50%';
    showAnswersSlider.appendChild(showAnswersButton);
    
    showAnswersInput.addEventListener('change', function() {
        if(this.checked) {
            showAnswersButton.style.transform = 'translateX(20px)';
            showAnswersSlider.style.backgroundColor = '#4CAF50';
        } else {
            showAnswersButton.style.transform = 'translateX(0)';
            showAnswersSlider.style.backgroundColor = '#888888';
        }
    });

    answeringContainer.appendChild(showContainer);

    // CSS style for the slider
    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
    .custom-slider {
        -webkit-appearance: none;
        height: 8px;
        background: #444444;
        border-radius: 4px;
        outline: none;
    }
    .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        background-color: #ffffff;
        border-radius: 50%;
        cursor: pointer;
        margin-top: -5px;
    }
    .custom-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background-color: #ffffff;
        border-radius: 50%;
        cursor: pointer;
    }
    .custom-slider::-ms-thumb {
        width: 18px;
        height: 18px;
        background-color: #ffffff;
        border-radius: 50%;
        cursor: pointer;
    }
    .custom-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 8px;
        background-color: #888888;
        border-radius: 4px;
    }
    .custom-slider::-moz-range-track {
        width: 100%;
        height: 8px;
        background-color: #888888;
        border-radius: 4px;
    }
    .custom-slider::-ms-track {
        width: 100%;
        height: 8px;
        background-color: #888888;
        border-radius: 4px;
    }
    `;
    document.head.appendChild(sliderStyle);

    // INFO
    const header4 = document.createElement('h2');
    header4.textContent = 'INFO';
    header4.style.display = 'block';
    header4.style.margin = '15px 0';
    header4.style.textAlign = 'center';
    header4.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    header4.style.fontSize = '1.25em';
    header4.style.color = 'white';
    header4.style.textShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
    uiElement.appendChild(header4);

    // questionsLabel
    const questionsLabel = document.createElement('span');
    questionsLabel.textContent = 'Question 0 / 0';
    questionsLabel.style.display = 'block';
    questionsLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    questionsLabel.style.fontSize = '0.9em';
    questionsLabel.style.textAlign = 'center';
    questionsLabel.style.margin = '10px 0';
    questionsLabel.style.color = 'white';
    uiElement.appendChild(questionsLabel);

    // Remove the existing githubContainer code and replace with this new modern links section

    // Remove the existing githubContainer code and replace with this:
    const linksSection = document.createElement('div');
    linksSection.style.margin = '15px 0';
    linksSection.style.padding = '0 15px';

    // Create developer entry with multiple icons/links
    function createDeveloperEntry(name, links = []) {
        const entry = document.createElement('div');
        entry.style.display = 'flex';
        entry.style.alignItems = 'center';
        entry.style.margin = '8px 0';
        
        // Developer name first
        const devName = document.createElement('span');
        devName.textContent = name;
        devName.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
        devName.style.color = 'white';
        devName.style.fontWeight = 'bold';
        devName.style.marginRight = '10px';
        entry.appendChild(devName);
        
        // Container for icons
        const iconsContainer = document.createElement('div');
        iconsContainer.style.display = 'flex';
        iconsContainer.style.gap = '8px';
        
        // Add each link as an icon
        links.forEach(link => {
            const iconLink = document.createElement('a');
            iconLink.href = link.url;
            iconLink.target = '_blank';
            iconLink.title = link.title;
            iconLink.style.display = 'flex';
            iconLink.style.alignItems = 'center';
            iconLink.style.justifyContent = 'center';
            iconLink.style.color = '#03A9F4';
            iconLink.style.textDecoration = 'none';
            
            const iconSpan = document.createElement('span');
            iconSpan.innerHTML = link.icon;
            iconSpan.style.width = '16px';
            iconSpan.style.height = '16px';
            iconSpan.style.display = 'flex';
            iconSpan.style.justifyContent = 'center';
            iconSpan.style.alignItems = 'center';
            
            iconLink.appendChild(iconSpan);
            iconsContainer.appendChild(iconLink);
        });
        
        entry.appendChild(iconsContainer);
        return entry;
    }

    // SVG icons (using the provided SVGs)
    const webIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';

    const toolIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';

    // GitHub icon - using provided SVG
    const githubIcon = '<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none" width="16" height="16"><path stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="12" d="M120.755 170c.03-4.669.059-20.874.059-27.29 0-9.272-3.167-15.339-6.719-18.41 22.051-2.464 45.201-10.863 45.201-49.067 0-10.855-3.824-19.735-10.175-26.683 1.017-2.516 4.413-12.63-.987-26.32 0 0-8.296-2.672-27.202 10.204-7.912-2.213-16.371-3.308-24.784-3.352-8.414.044-16.872 1.14-24.785 3.352C52.457 19.558 44.162 22.23 44.162 22.23c-5.4 13.69-2.004 23.804-.987 26.32C36.824 55.498 33 64.378 33 75.233c0 38.204 23.149 46.603 45.2 49.067-3.551 3.071-6.719 9.138-6.719 18.41 0 6.416.03 22.621.059 27.29M27 130c9.939.703 15.67 9.735 15.67 9.735 8.834 15.199 23.178 10.803 28.815 8.265"></path></svg>';
    // Add developers with their links in the requested order
    // 1. KRWCLASSIC with additional links 
    linksSection.appendChild(createDeveloperEntry('KRWCLASSIC', [
        {icon: githubIcon, url: 'https://github.com/KRWCLASSIC', title: 'GitHub'},
    ]));

    // 2. John Wee - now with GitHub link added
    linksSection.appendChild(createDeveloperEntry('John Wee', [
        {icon: githubIcon, url: 'https://github.com/johnweeky', title: 'GitHub'},
        {icon: webIcon, url: 'https://johnw.ee', title: 'Website'},
        {icon: toolIcon, url: 'https://landing.kahoot.space', title: 'JW Tool Suite'}
    ]));

    // 3. jokeri2222
    linksSection.appendChild(createDeveloperEntry('jokeri2222', [
        {icon: githubIcon, url: 'https://github.com/jokeri2222', title: 'GitHub'}
    ]));

    uiElement.appendChild(linksSection);

    closeButton.addEventListener('click', () => {
        document.body.removeChild(uiElement);
        autoAnswer = false;
        showAnswers = false;
    });

    let isMinimized = false;
    minimizeButton.addEventListener('click', () => {
        isMinimized = !isMinimized;
        if (isMinimized) {
            headerText.style.display = 'none';
            header2.style.display = 'none';
            header3.style.display = 'none';
            header4.style.display = 'none';
            inputContainer.style.display = 'none';
            questionsLabel.style.display = 'none';
            linksSection.style.display = 'none';
            sliderContainer.style.display = 'none';
            answeringContainer.style.display = 'none';
            uiElement.style.height = '40px';
        } else {
            headerText.style.display = 'block';
            header2.style.display = 'block';
            header3.style.display = 'block';
            header4.style.display = 'block';
            inputContainer.style.display = 'flex';
            questionsLabel.style.display = 'block';
            linksSection.style.display = 'block';
            uiElement.style.height = 'auto';
            sliderContainer.style.display = 'flex';
            answeringContainer.style.display = 'flex';
        }
    });

    let isDragging = false;
    let offsetX, offsetY;
    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - uiElement.getBoundingClientRect().left;
        offsetY = e.clientY - uiElement.getBoundingClientRect().top;
    });
    
    // Add touch support for mobile
    handle.addEventListener('touchstart', (e) => {
        isDragging = true;
        const touch = e.touches[0];
        offsetX = touch.clientX - uiElement.getBoundingClientRect().left;
        offsetY = touch.clientY - uiElement.getBoundingClientRect().top;
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            uiElement.style.left = x + 'px';
            uiElement.style.top = y + 'px';
        }
    });
    
    // Add touch movement for mobile
    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            const touch = e.touches[0];
            const x = touch.clientX - offsetX;
            const y = touch.clientY - offsetY;
            uiElement.style.left = x + 'px';
            uiElement.style.top = y + 'px';
            e.preventDefault();
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Stop dragging on touch end
    document.addEventListener('touchend', () => {
        isDragging = false;
    });

    // --- Fallback Dropdown Search ---
    function searchPublicUUID(searchTerm) {
        const searchUrl = 'https://damp-leaf-16aa.johnwee.workers.dev/rest/kahoots/?query=' + encodeURIComponent(searchTerm);
        console.log("Fallback search URL:", searchUrl);
        fetch(searchUrl)
          .then(response => response.json())
          .then(data => {
              console.log("Fallback search data:", data);
              let results = (data.entities && data.entities.length > 0) ? data.entities : [];
              dropdown.innerHTML = "";
              if (Array.isArray(results) && results.length > 0) {
                  dropdown.appendChild(dropdownHeader); // Re-add the header with X button
                  results.forEach(entity => {
                      let card = entity.card || {};
                      let displayTitle = card.title || card.name || "No title";
                      let displayCover = card.cover || card.image || 'https://dummyimage.com/50x50/ccc/fff.png&text=No+Image';
                      let quizUUID = card.uuid || card.id || "";
                      const item = document.createElement('div');
                      item.style.display = 'flex';
                      item.style.alignItems = 'center';
                      item.style.padding = '8px';
                      item.style.cursor = 'pointer';
                      item.style.borderBottom = '1px solid #444';
                      item.addEventListener('mouseover', function() {
                          item.style.backgroundColor = '#444';
                      });
                      item.addEventListener('mouseout', function() {
                          item.style.backgroundColor = 'transparent';
                      });
                      
                      const img = document.createElement('img');
                      img.src = displayCover;
                      img.alt = displayTitle;
                      img.style.width = '40px';
                      img.style.height = '40px';
                      img.style.marginRight = '10px';
                      img.style.borderRadius = '5px';
                      img.style.objectFit = 'cover';
                      
                      const text = document.createElement('span');
                      text.textContent = displayTitle;
                      text.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
                      text.style.color = '#ffffff';
                      text.style.fontSize = '0.9em';
                      text.style.wordBreak = 'break-word';
                      text.style.flex = '1';
                      item.appendChild(img);
                      item.appendChild(text);
                      
                    item.addEventListener('click', async function() {
                        const quizUrl = 'https://damp-leaf-16aa.johnwee.workers.dev/api-proxy/' + encodeURIComponent(quizUUID);
                        try {
                            const res = await fetch(quizUrl);
                            if (!res.ok) throw new Error("Fetch failed");
                            const data = await res.json();
                        
                            // Prevent duplicates
                            if (item.querySelector('.preview-container')) return;
                        
                            const previewContainer = document.createElement('div');
                            previewContainer.className = 'preview-container';
                            previewContainer.style.marginTop = '10px';
                            previewContainer.style.padding = '10px';
                            previewContainer.style.backgroundColor = '#333';
                            previewContainer.style.border = '1px solid #555';
                            previewContainer.style.borderRadius = '5px';
                            previewContainer.style.width = '100%';
                            previewContainer.style.boxSizing = 'border-box';
                        
                            const questionCount = document.createElement('p');
                            questionCount.textContent = `Questions: ${data.questions?.length || 0}`;
                            questionCount.style.margin = '5px 0';
                            questionCount.style.fontSize = '0.85em';
                            questionCount.style.fontWeight = 'bold';
                            questionCount.style.color = '#ffffff';
                            previewContainer.appendChild(questionCount);
                        
                            const questionList = document.createElement('ul');
                            questionList.style.fontSize = '0.8em';
                            questionList.style.paddingLeft = '20px';
                            questionList.style.margin = '5px 0';
                        
                            // Display only the first question
                            const firstQuestion = data.questions[0];
                            if (firstQuestion) {
                                const li = document.createElement('li');
                                li.textContent = firstQuestion.question || '[No question text]';
                                li.style.color = '#ffffff';
                                li.style.margin = '3px 0';
                                questionList.appendChild(li);
                        
                                // Display correct answer
                                if (firstQuestion.choices) {
                                    const correctAnswer = firstQuestion.choices.find(choice => choice.correct);
                                    if (correctAnswer) {
                                        const answerLi = document.createElement('li');
                                        answerLi.textContent = `Correct Answer: ${correctAnswer.answer}`;
                                        answerLi.style.color = '#00ff00';
                                        answerLi.style.margin = '3px 0';
                                        questionList.appendChild(answerLi);
                                    }
                                }
                            }
                            previewContainer.appendChild(questionList);
                        
                            const linkToKahoot = document.createElement('a');
                            linkToKahoot.href = `https://create.kahoot.it/details/${quizUUID}`;
                            linkToKahoot.target = '_blank';
                            linkToKahoot.textContent = 'View full quiz on Kahoot →';
                            linkToKahoot.style.display = 'inline-block';
                            linkToKahoot.style.margin = '5px 0';
                            linkToKahoot.style.fontSize = '0.8em';
                            linkToKahoot.style.color = '#007bff';
                            previewContainer.appendChild(linkToKahoot);
                        
                            const selectButton = document.createElement('button');
                            selectButton.textContent = 'Select this quiz';
                            selectButton.style.display = 'block';
                            selectButton.style.marginTop = '8px';
                            selectButton.style.width = '100%';
                            selectButton.style.padding = '5px';
                            selectButton.style.cursor = 'pointer';
                            selectButton.style.color = '#ffffff';
                            selectButton.style.backgroundColor = '#555';
                            selectButton.style.border = '1px solid #777';
                            selectButton.style.borderRadius = '5px';
                            selectButton.style.fontSize = '0.85em';
                            selectButton.style.transition = 'background-color 0.3s';
                            selectButton.addEventListener('mouseover', () => {
                                selectButton.style.backgroundColor = '#666';
                            });
                            selectButton.addEventListener('mouseout', () => {
                                selectButton.style.backgroundColor = '#555';
                            });
                            selectButton.addEventListener('click', () => {
                                inputBox.value = quizUUID;
                                dropdown.style.display = 'none';
                                dropdownCloseButton.style.display = 'none';
                                handleInputChange();
                            });
                        
                            previewContainer.appendChild(selectButton);
                            item.appendChild(previewContainer);
                            item.style.flexDirection = 'column';
                            item.style.alignItems = 'flex-start';
                        } catch (err) {
                            console.error("Preview fetch failed:", err);
                        }
                    });
                      
                    dropdown.appendChild(item);
                  });
                  dropdown.style.display = 'block';
                  dropdownCloseButton.style.display = 'inline-block';
              } else {
                  dropdown.style.display = 'none';
                  dropdownCloseButton.style.display = 'none';
              }
          })
          .catch(err => {
              console.error("Fallback search error:", err);
              dropdown.style.display = 'none';
              dropdownCloseButton.style.display = 'none';
          });
    }

    // --- Lookup Function ---
    function handleInputChange() {
        var rawInput = inputBox.value;
        var quizID = sanitizeInput(rawInput);
        const url = 'https://damp-leaf-16aa.johnwee.workers.dev/api-proxy/' + encodeURIComponent(quizID);
        console.log("Direct lookup URL:", url);
        if (quizID !== "") {
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error('Direct lookup failed');
                    return response.json();
                })
                .then(data => {
                    console.log("Direct lookup data:", data);
                    inputBox.style.backgroundColor = 'green';
                    dropdown.style.display = 'none';
                    dropdownCloseButton.style.display = 'none';
                    questions = parseQuestions(data.questions);
                    info.numQuestions = questions.length;
                })
                .catch(error => {
                    console.error("Direct lookup error:", error);
                    inputBox.style.backgroundColor = 'red';
                    info.numQuestions = 0;
                    // Fallback: offer public search suggestions.
                    searchPublicUUID(quizID);
                });
        } else {
            inputBox.style.backgroundColor = '#333333';
            info.numQuestions = 0;
        }
    }

    document.body.appendChild(uiElement);

    function parseQuestions(questionsJson){
        let questions = [];
        questionsJson.forEach(function (question){
            let q = {type: question.type, time: question.time};
            if (['quiz', 'multiple_select_quiz'].includes(question.type)){
                var i = 0;
                q.answers = [];
                q.incorrectAnswers = [];
                question.choices.forEach(function(choice){
                    if (choice.correct) {
                        q.answers.push(i);
                    } else {
                        q.incorrectAnswers.push(i);
                    }
                    i++;
                });
            }
            if (question.type == 'open_ended') {
                q.answers = [];
                question.choices.forEach(function(choice){
                    q.answers.push(choice.answer);
                });
            }
            questions.push(q);
        });
        return questions;
    }

    function onQuestionStart(){
        console.log("onQuestionStart, inputLag =", inputLag);
        var question = questions[info.questionNum];
        if (showAnswers){
            highlightAnswers(question);
        }
        if (autoAnswer){
            answer(question, (question.time - question.time / (500/(PPT-500))) - inputLag);
        }
    }

    function highlightAnswers(question){
        question.answers.forEach(function (answer) {
            setTimeout(function() {
                const answerButton = FindByAttributeValue("data-functional-selector", 'answer-' + answer, "button");
                if (answerButton) answerButton.style.backgroundColor = 'rgb(0, 255, 0)';
            }, 0);
        });
        question.incorrectAnswers.forEach(function (answer) {
            setTimeout(function() {
                const answerButton = FindByAttributeValue("data-functional-selector", 'answer-' + answer, "button");
                if (answerButton) answerButton.style.backgroundColor = 'rgb(255, 0, 0)';
            }, 0);
        });
    }

    function answer(question, time) {
        Answered_PPT = PPT;
        var delay = (question.type == 'multiple_select_quiz') ? 60 : 0;
        setTimeout(function() {
            if (question.type == 'quiz') {
                const key = (+question.answers[0] + 1).toString();
                const event = new KeyboardEvent('keydown', { key: key });
                window.dispatchEvent(event);
            }
            if (question.type == 'multiple_select_quiz') {
                question.answers.forEach(function(answer) {
                    setTimeout(function() {
                        const key = (+answer + 1).toString();
                        const event = new KeyboardEvent('keydown', { key: key });
                        window.dispatchEvent(event);
                    }, 0);
                });
                setTimeout(function() {
                    const submitButton = FindByAttributeValue("data-functional-selector", 'multi-select-submit-button', "button");
                    if (submitButton) submitButton.click();
                }, 0);
            }
        }, time - delay);
    }

    // Keyboard shortcuts for hiding/showing the UI
    document.addEventListener('keydown', (event) => {
        console.log(`Key pressed: "${event.key}"`);
        let overlay = document.querySelector(".floating-ui");
        if (!overlay) return console.log("Overlay not found!");
        if (event.key === ",") {
            console.log("Hiding overlay...");
            overlay.style.display = "none";
        }
        if (event.key === ".") {
            console.log("Showing overlay...");
            overlay.style.display = "block";
        }
    });

    // Interval loop: checks question state, auto-answer logic, etc.
    setInterval(function () {
        var textElement = FindByAttributeValue("data-functional-selector", "question-index-counter", "div");
        if (textElement){
            info.questionNum = +textElement.textContent - 1;
        }
        if (FindByAttributeValue("data-functional-selector", 'answer-0', "button") && info.lastAnsweredQuestion != info.questionNum) {
            info.lastAnsweredQuestion = info.questionNum;
            onQuestionStart();
        }
        if (autoAnswer){
            if (info.ILSetQuestion != info.questionNum){
                var ppt = Answered_PPT;
                if (ppt > 987) ppt = 1000;
                var incrementElement = FindByAttributeValue("data-functional-selector", "score-increment", "span");
                if (incrementElement){
                    info.ILSetQuestion = info.questionNum;
                    var increment = +incrementElement.textContent.split(" ")[1];
                    if (increment != 0){
                        inputLag += (ppt - increment) * 15;
                        if (inputLag < 0) {
                            inputLag -= (ppt - increment) * 15;
                            inputLag += (ppt - increment/2) * 15;
                        }
                        inputLag = Math.round(inputLag);
                    }
                }
            }
        }
        questionsLabel.textContent = 'Question ' + (info.questionNum + 1) + ' / ' + info.numQuestions;
    }, 1);

    // And add this style block to ensure toggle buttons are correctly sized and positioned:
    const toggleStyle = document.createElement('style');
    toggleStyle.textContent = `
        .switch input:checked + .slider:before {
            transform: translateX(20px);
        }
        .switch .slider:before {
            position: absolute;
            content: '';
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        .switch input:checked + .slider {
            background-color: #4CAF50;
        }
        
        /* Responsive styles for mobile */
        @media (max-width: 768px) {
            .floating-ui {
                width: 85vw;
                left: 7.5vw;
                font-size: 14px;
            }
            
            .handle {
                height: 35px;
                line-height: 35px;
            }
            
            .close-button, .minimize-button {
                width: 35px;
                height: 35px;
            }
            
            .switch {
                width: 36px;
                height: 18px;
            }
            
            .switch .slider:before {
                height: 14px;
                width: 14px;
                left: 2px;
                bottom: 2px;
            }
            
            .switch input:checked + .slider:before {
                transform: translateX(18px);
            }
        }
    `;
    document.head.appendChild(toggleStyle);
})();
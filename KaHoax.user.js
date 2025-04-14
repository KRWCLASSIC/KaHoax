// ==UserScript==
// @name         KaHoax
// @version      1.1.5
// @description  A hack for kahoot.it! First tries proxy lookup by Quiz ID. If that fails, uses fallback search and displays a scrollable dropdown for selection.
// @namespace    https://github.com/KRWCLASSIC
// @match        https://kahoot.it/*
// @icon         https://raw.githubusercontent.com/KRWCLASSIC/KaHoax/refs/heads/main/kahoot.svg
// @grant        none
// ==/UserScript==
(function() {
    // Load KRW API
    (function() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/KRWCLASSIC/KaHoax@main/api.js';
        script.onload = () => console.log('✅ KRW API loaded');
        document.head.appendChild(script);
    })();

    var Version = '1.1.5 - TEST';

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
    headerText.textContent = 'QUIZ ID or NAME';
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
    inputBox.placeholder = 'Quiz Id or search for the Quiz here...';
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
    answeringContainer.style.flexDirection = 'column';
    answeringContainer.style.alignItems = 'center';
    answeringContainer.style.margin = '15px auto';
    answeringContainer.style.width = '90%';
    uiElement.appendChild(answeringContainer);

    // Toggle switches container - MOVED BEFORE the slider
    const togglesContainer = document.createElement('div');
    togglesContainer.style.display = 'flex';
    togglesContainer.style.alignItems = 'center';
    togglesContainer.style.justifyContent = 'space-evenly';
    togglesContainer.style.width = '100%';
    togglesContainer.style.marginBottom = '15px';
    answeringContainer.appendChild(togglesContainer);

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

    togglesContainer.appendChild(autoContainer);

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

    togglesContainer.appendChild(showContainer);

    // Points per Question slider - MOVED AFTER the toggles
    const sliderContainer = document.createElement('div');
    sliderContainer.style.width = '100%';
    sliderContainer.style.margin = '0 auto';
    sliderContainer.style.display = 'flex';
    sliderContainer.style.flexDirection = 'column';
    sliderContainer.style.alignItems = 'center';
    sliderContainer.style.justifyContent = 'center';

    const pointsLabel = document.createElement('span');
    pointsLabel.textContent = 'Points per Question: ~900';
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

    pointsSlider.addEventListener('input', () => {
        const points = +pointsSlider.value;
        PPT = points;
        pointsLabel.textContent = 'Points per Question: ~' + points;
    });

    answeringContainer.appendChild(sliderContainer);

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
    function createDeveloperEntry(name, links = [], roles = []) {
        const entry = document.createElement('div');
        entry.style.display = 'flex';
        entry.style.alignItems = 'center';
        entry.style.margin = '8px 0';
        entry.style.position = 'relative';
        
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
        
        // Role-specific badge colors
        const badgeColors = {
            'UI': '#E91E63',          // Pink/Red
            'Mobile': '#2196F3',      // Blue
            'Features': '#9C27B0',    // Purple
            'Base': '#4CAF50',        // Green
            'Bug Tester': '#FF9800',  // Orange
            'Old UI': '#795548',      // Brown
            'API': '#607D8B'          // Blue Gray
        };
        
        // Function to get size factor based on screen width
        const getBadgeSizeFactor = () => {
            return window.innerWidth < 385 ? 0.82 : 1;
        };
        
        // Add roles badges - display multiple small badges
        if (roles && roles.length > 0) {
            const badgesContainer = document.createElement('div');
            badgesContainer.className = 'role-badges-container';
            badgesContainer.style.position = 'absolute';
            badgesContainer.style.right = '0';
            badgesContainer.style.top = '50%';
            badgesContainer.style.transform = 'translateY(-50%)';
            badgesContainer.style.display = 'flex';
            badgesContainer.style.gap = '4px';
            
            roles.forEach((role) => {
                const badge = document.createElement('div');
                badge.className = 'role-badge';
                badge.dataset.role = role;
                badge.style.backgroundColor = badgeColors[role] || '#888888';
                badge.style.color = 'white';
                badge.style.fontSize = '0.7em';
                badge.style.padding = '2px 5px';
                badge.style.borderRadius = '10px';
                badge.style.opacity = '0.7';
                badge.style.cursor = 'default';
                badge.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
                badge.style.whiteSpace = 'nowrap';
                badge.textContent = role;
                
                badgesContainer.appendChild(badge);
            });
            
            entry.appendChild(badgesContainer);
        }
        
        return entry;
    }

    // SVG icons (using the provided SVGs)
    const webIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';

    const toolIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';

    // GitHub icon - using provided SVG
    const githubIcon = '<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none" width="16" height="16"><path stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="12" d="M120.755 170c.03-4.669.059-20.874.059-27.29 0-9.272-3.167-15.339-6.719-18.41 22.051-2.464 45.201-10.863 45.201-49.067 0-10.855-3.824-19.735-10.175-26.683 1.017-2.516 4.413-12.63-.987-26.32 0 0-8.296-2.672-27.202 10.204-7.912-2.213-16.371-3.308-24.784-3.352-8.414.044-16.872 1.14-24.785 3.352C52.457 19.558 44.162 22.23 44.162 22.23c-5.4 13.69-2.004 23.804-.987 26.32C36.824 55.498 33 64.378 33 75.233c0 38.204 23.149 46.603 45.2 49.067-3.551 3.071-6.719 9.138-6.719 18.41 0 6.416.03 22.621.059 27.29M27 130c9.939.703 15.67 9.735 15.67 9.735 8.834 15.199 23.178 10.803 28.815 8.265"></path></svg>';

    // Add developers with their links and roles in the requested order
    // 1. KRWCLASSIC with roles
    linksSection.appendChild(createDeveloperEntry('KRWCLASSIC', [
        {icon: githubIcon, url: 'https://github.com/KRWCLASSIC', title: 'GitHub'},
    ], ['UI', 'Bug Tester', 'Features']));

    // 2. John Wee with roles (removed "Idea")
    linksSection.appendChild(createDeveloperEntry('johnweeky', [
        {icon: githubIcon, url: 'https://github.com/johnweeky', title: 'GitHub'},
        {icon: webIcon, url: 'https://johnw.ee', title: 'Website'},
        {icon: toolIcon, url: 'https://landing.kahoot.space', title: 'JW Tool Suite'}
    ], ['API', 'Mobile', 'Features']));

    // 3. jokeri2222 with roles
    linksSection.appendChild(createDeveloperEntry('jokeri2222', [
        {icon: githubIcon, url: 'https://github.com/jokeri2222', title: 'GitHub'}
    ], ['Base', 'Old UI', 'Features']));

    // 4. Epic0001 with roles
    linksSection.appendChild(createDeveloperEntry('Epic0001', [
        {icon: githubIcon, url: 'https://github.com/Epic0001', title: 'GitHub'}
    ], ['Bug Tester']));

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

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            uiElement.style.left = x + 'px';
            uiElement.style.top = y + 'px';
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
        console.log("Fallback search for:", searchTerm);
        
        // Use the KRW API searchQuizzes function
        searchQuizzes(searchTerm)
          .then(searchResult => {
              console.log("Fallback search data:", searchResult);
              dropdown.innerHTML = "";
              
              if (searchResult.success && searchResult.results.length > 0) {
                  dropdown.appendChild(dropdownHeader); // Re-add the header with X button
                  
                  searchResult.results.forEach(quiz => {
                      let displayTitle = quiz.title || "No title";
                      let displayCover = quiz.cover || 'https://dummyimage.com/50x50/ccc/fff.png&text=No+Image';
                      let quizUUID = quiz.uuid || "";
                      
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
                        try {
                            console.log("Fetching quiz details for:", quizUUID);
                            const quizResult = await fetchQuizById(quizUUID);
                            
                            if (!quizResult.success) throw new Error("Fetch failed");
                            const data = quizResult.data;
                        
                            // If we already have the expanded view, do nothing (avoid duplicates)
                            if (item.classList.contains('expanded-item')) {
                                return;
                            }
                            
                            // Mark this item as expanded
                            item.classList.add('expanded-item');
                            
                            // Save original item styles and content
                            const originalItemStyles = {
                                display: item.style.display,
                                alignItems: item.style.alignItems,
                                padding: item.style.padding,
                                cursor: item.style.cursor,
                                borderBottom: item.style.borderBottom,
                                backgroundColor: item.style.backgroundColor,
                            };
                            const originalContent = item.innerHTML;
                            
                            // Clear existing content
                            item.innerHTML = '';
                            
                            // Create the header container (this will be clickable)
                            const headerContainer = document.createElement('div');
                            headerContainer.className = 'quiz-header-container';
                            headerContainer.style.display = 'flex';
                            headerContainer.style.alignItems = 'center';
                            headerContainer.style.width = '100%';
                            headerContainer.style.padding = '8px';
                            headerContainer.style.boxSizing = 'border-box';
                            headerContainer.style.cursor = 'pointer';
                            
                            // Re-add image and text to header
                            const img = document.createElement('img');
                            img.src = displayCover;
                            img.alt = displayTitle;
                            img.style.width = '40px';
                            img.style.height = '40px';
                            img.style.marginRight = '10px';
                            img.style.borderRadius = '5px';
                            img.style.objectFit = 'cover';
                            headerContainer.appendChild(img);
                            
                            const text = document.createElement('span');
                            text.textContent = displayTitle;
                            text.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
                            text.style.color = '#ffffff';
                            text.style.fontSize = '0.9em';
                            text.style.wordBreak = 'break-word';
                            text.style.flex = '1';
                            headerContainer.appendChild(text);
                            
                            // Create the content container (will be toggled)
                            const contentContainer = document.createElement('div');
                            contentContainer.className = 'quiz-content-container';
                            contentContainer.style.width = '100%';
                            contentContainer.style.marginTop = '10px';
                            contentContainer.style.display = 'block'; // Initially visible
                            
                            // Add question count
                            const questionCount = document.createElement('p');
                            questionCount.textContent = `Questions: ${data.questions?.length || 0}`;
                            questionCount.style.margin = '5px 0';
                            questionCount.style.fontSize = '0.85em';
                            questionCount.style.fontWeight = 'bold';
                            questionCount.style.color = '#ffffff';
                            questionCount.style.padding = '0 10px';
                            contentContainer.appendChild(questionCount);
                            
                            // Create navigation controls and question display
                            const questionList = document.createElement('div');
                            questionList.className = 'question-list';
                            questionList.style.fontSize = '0.8em';
                            questionList.style.margin = '5px 0';
                            questionList.style.padding = '0 10px 10px 10px';
                            questionList.style.backgroundColor = '#333';
                            questionList.style.border = '1px solid #555';
                            questionList.style.borderRadius = '5px';
                            
                            // Add navigation container
                            const navContainer = document.createElement('div');
                            navContainer.style.display = 'flex';
                            navContainer.style.alignItems = 'center';
                            navContainer.style.justifyContent = 'space-between';
                            navContainer.style.marginBottom = '8px';
                            navContainer.style.marginTop = '8px';
                            
                            // Current question indicator
                            const questionIndicator = document.createElement('span');
                            questionIndicator.style.color = '#ffffff';
                            questionIndicator.style.fontSize = '0.9em';
                            
                            // Navigation buttons
                            const prevButton = document.createElement('button');
                            prevButton.textContent = '←';
                            prevButton.style.backgroundColor = '#444';
                            prevButton.style.color = 'white';
                            prevButton.style.border = 'none';
                            prevButton.style.borderRadius = '3px';
                            prevButton.style.padding = '1px 6px';
                            prevButton.style.fontSize = '0.8em';
                            prevButton.style.cursor = 'pointer';
                            prevButton.style.minWidth = '20px';
                            prevButton.style.minHeight = '20px';
                            
                            const nextButton = document.createElement('button');
                            nextButton.textContent = '→';
                            nextButton.style.backgroundColor = '#444';
                            nextButton.style.color = 'white';
                            nextButton.style.border = 'none';
                            nextButton.style.borderRadius = '3px';
                            nextButton.style.padding = '1px 6px';
                            nextButton.style.fontSize = '0.8em';
                            nextButton.style.cursor = 'pointer';
                            nextButton.style.minWidth = '20px';
                            nextButton.style.minHeight = '20px';
                            
                            navContainer.appendChild(prevButton);
                            navContainer.appendChild(questionIndicator);
                            navContainer.appendChild(nextButton);
                            
                            questionList.appendChild(navContainer);
                            
                            // Question content container
                            const questionContent = document.createElement('div');
                            questionContent.className = 'question-content';
                            questionContent.style.border = '1px solid #555';
                            questionContent.style.borderRadius = '3px';
                            questionContent.style.padding = '8px';
                            questionContent.style.marginBottom = '5px';
                            questionList.appendChild(questionContent);
                            
                            // Store current question index
                            let currentQuestionIndex = 0;
                            const totalQuestions = data.questions?.length || 0;
                            
                            // Function to update displayed question
                            const updateQuestionDisplay = () => {
                                questionIndicator.textContent = `Q${currentQuestionIndex + 1}/${totalQuestions}`;
                                
                                // Clear previous content
                                questionContent.innerHTML = '';
                                
                                const question = data.questions[currentQuestionIndex];
                                if (question) {
                                    // Question text
                                    const questionText = document.createElement('p');
                                    questionText.textContent = question.question || '[No question text]';
                                    questionText.style.color = '#ffffff';
                                    questionText.style.margin = '1px 0 5px 0';
                                    questionText.style.fontWeight = 'bold';
                                    questionText.style.fontSize = '0.9em';
                                    questionText.style.lineHeight = '1.1';
                                    questionContent.appendChild(questionText);
                                    
                                    // Display answer choices
                                    if (question.choices && question.choices.length > 0) {
                                        const choicesList = document.createElement('ul');
                                        choicesList.style.listStyleType = 'none';
                                        choicesList.style.padding = '0';
                                        choicesList.style.margin = '5px 0 0 0';
                                        
                                        question.choices.forEach((choice, index) => {
                                            const choiceItem = document.createElement('li');
                                            choiceItem.style.padding = '2px 3px';
                                            choiceItem.style.margin = '2px 0';
                                            choiceItem.style.borderRadius = '3px';
                                            choiceItem.style.backgroundColor = choice.correct ? 'rgba(0, 255, 0, 0.2)' : 'transparent';
                                            choiceItem.style.color = choice.correct ? '#00ff00' : '#ffffff';
                                            choiceItem.style.fontSize = '0.85em';
                                            choiceItem.style.lineHeight = '1.1';
                                            
                                            // Add a colored marker based on correctness
                                            const marker = choice.correct ? '✓' : '○';
                                            choiceItem.textContent = `${marker} ${choice.answer || '[No answer text]'}`;
                                            
                                            choicesList.appendChild(choiceItem);
                                        });
                                        
                                        questionContent.appendChild(choicesList);
                                    }
                                }
                                
                                // Update button states
                                prevButton.disabled = currentQuestionIndex === 0;
                                prevButton.style.opacity = currentQuestionIndex === 0 ? '0.5' : '1';
                                nextButton.disabled = currentQuestionIndex === totalQuestions - 1;
                                nextButton.style.opacity = currentQuestionIndex === totalQuestions - 1 ? '0.5' : '1';
                            };
                            
                            // Set up navigation button events
                            prevButton.addEventListener('click', (e) => {
                                e.stopPropagation(); // Prevent triggering the header click
                                if (currentQuestionIndex > 0) {
                                    currentQuestionIndex--;
                                    updateQuestionDisplay();
                                }
                            });
                            
                            nextButton.addEventListener('click', (e) => {
                                e.stopPropagation(); // Prevent triggering the header click
                                if (currentQuestionIndex < totalQuestions - 1) {
                                    currentQuestionIndex++;
                                    updateQuestionDisplay();
                                }
                            });
                            
                            // Initialize display
                            updateQuestionDisplay();
                            
                            contentContainer.appendChild(questionList);
                        
                            const linkToKahoot = document.createElement('a');
                            linkToKahoot.href = `https://create.kahoot.it/details/${quizUUID}`;
                            linkToKahoot.target = '_blank';
                            linkToKahoot.style.display = 'block';
                            linkToKahoot.style.margin = '5px auto';  // Center horizontally
                            linkToKahoot.style.padding = '5px 10px';
                            linkToKahoot.style.fontSize = '0.9em';
                            linkToKahoot.style.fontWeight = 'bold';
                            linkToKahoot.style.textDecoration = 'none';
                            linkToKahoot.style.backgroundColor = 'transparent';
                            linkToKahoot.style.borderRadius = '5px';
                            linkToKahoot.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
                            linkToKahoot.style.width = 'fit-content';  // Only take as much width as needed
                            linkToKahoot.style.textAlign = 'center';  // Center text

                            // Create background element with more vibrant Kahoot colors
                            const linkBackground = document.createElement('span');
                            linkBackground.style.position = 'relative';
                            linkBackground.style.display = 'inline-block';
                            // More vibrant Kahoot colors
                            linkBackground.style.background = 'linear-gradient(to right, #ff3355, #0088ff, #00cc44, #ffcc00)';
                            linkBackground.style.webkitBackgroundClip = 'text';
                            linkBackground.style.backgroundClip = 'text';
                            linkBackground.style.color = 'transparent';
                            linkBackground.style.textAlign = 'center';
                            linkBackground.textContent = 'View full quiz on Kahoot →';

                            linkToKahoot.textContent = '';
                            linkToKahoot.appendChild(linkBackground);
                            contentContainer.appendChild(linkToKahoot);

                            const selectButton = document.createElement('button');
                            selectButton.textContent = 'Select this quiz';
                            selectButton.className = 'select-quiz-button';
                            selectButton.style.display = 'block';
                            selectButton.style.marginTop = '8px';
                            selectButton.style.width = 'calc(100% - 20px)';
                            selectButton.style.margin = '8px 10px';
                            selectButton.style.padding = '8px 12px';
                            selectButton.style.cursor = 'pointer';
                            selectButton.style.color = '#ffffff';
                            selectButton.style.fontWeight = 'bold';
                            selectButton.style.backgroundColor = '#6c757d';
                            selectButton.style.border = 'none';
                            selectButton.style.borderRadius = '5px';
                            selectButton.style.fontSize = '0.9em';
                            selectButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                            selectButton.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
                            selectButton.style.transition = 'background-color 0.3s';  // Add transition for hover effect

                            // Add Enter button style hover effects (background color change only, no movement)
                            selectButton.addEventListener('mouseover', () => {
                                selectButton.style.backgroundColor = '#5a6268';
                            });

                            selectButton.addEventListener('mouseout', () => {
                                selectButton.style.backgroundColor = '#6c757d';
                            });

                            selectButton.addEventListener('click', (e) => {
                                e.stopPropagation(); // Prevent triggering the header click
                                inputBox.value = quizUUID;
                                dropdown.style.display = 'none';
                                dropdownCloseButton.style.display = 'none';
                                handleInputChange();
                            });

                            contentContainer.appendChild(selectButton);
                            
                            // Add the containers to the item
                            item.appendChild(headerContainer);
                            item.appendChild(contentContainer);
                            
                            // Set necessary item styles
                            item.style.display = 'flex';
                            item.style.flexDirection = 'column';
                            item.style.alignItems = 'flex-start';
                            item.style.borderBottom = '1px solid #444';
                            
                            // Set up the toggle functionality on header click
                            headerContainer.addEventListener('click', (e) => {
                                // Don't toggle if we clicked on a button or link
                                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
                                    return;
                                }
                                
                                // Toggle content visibility
                                if (contentContainer.style.display === 'none') {
                                    contentContainer.style.display = 'block';
                                    // When expanding, make sure we have consistent padding
                                    item.style.padding = '8px 8px 8px 8px'; 
                                } else {
                                    contentContainer.style.display = 'none';
                                    // Reset the padding when collapsed - this is key!
                                    item.style.padding = '0px';
                                }
                                
                                e.stopPropagation();
                            });
                            
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
        console.log("Direct lookup for quiz ID:", quizID);
        
        // Check if the API functions are available
        if (typeof fetchQuizById !== 'function' || typeof searchQuizzes !== 'function') {
            console.error("API not loaded yet. Please try again in a moment.");
            inputBox.style.backgroundColor = 'orange';
            setTimeout(() => {
                inputBox.style.backgroundColor = '#333333';
            }, 2000);
            return;
        }
        
        if (quizID !== "") {
            // Check if valid quiz ID
            if (isValidQuizId(quizID)) {
                fetchQuizById(quizID)
                    .then(result => {
                        console.log("Direct lookup result:", result);
                        if (result.success) {
                            inputBox.style.backgroundColor = 'green';
                            dropdown.style.display = 'none';
                            dropdownCloseButton.style.display = 'none';
                            questions = parseQuestions(result.data.questions);
                            info.numQuestions = questions.length;
                        } else {
                            throw new Error('Quiz not found');
                        }
                    })
                    .catch(error => {
                        console.error("Direct lookup error:", error);
                        inputBox.style.backgroundColor = 'red';
                        info.numQuestions = 0;
                        // Fallback: offer public search suggestions.
                        searchPublicUUID(quizID);
                    });
            } else {
                // Try searching by name instead
                searchPublicUUID(quizID);
            }
        } else {
            inputBox.style.backgroundColor = '#333333';
            info.numQuestions = 0;
        }
    }

    document.body.appendChild(uiElement);

    function parseQuestions(questionsJson){
        let questions = [];
        questionsJson.forEach(function (question){
            // Our API already provides answers and incorrectAnswers for quiz types,
            // so we can just use those properties directly
            let q = {
                type: question.type, 
                time: question.time,
                answers: question.answers || [],
                incorrectAnswers: question.incorrectAnswers || []
            };
            
            // For open-ended questions, make sure we have the answers array
            if (question.type == 'open_ended' && !q.answers.length) {
                q.answers = question.choices ? question.choices.map(c => c.answer) : [];
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
        
        /* Styles for small screens - badges sizing */
        @media (max-width: 385px) and (min-width: 356px) {
            .role-badge {
                font-size: 0.574em !important; /* 0.7 * 0.82 */
                padding: 1.64px 4.1px !important; /* 2px * 0.82, 5px * 0.82 */
                border-radius: 8.2px !important; /* 10px * 0.82 */
            }
            
            .role-badges-container {
                gap: 3.28px !important; /* 4px * 0.82 */
            }
        }
        
        /* Styles for very small screens - even smaller badges */
        @media (max-width: 355px) {
            .role-badge {
                font-size: 0.525em !important; /* 0.7 * 0.75 */
                padding: 1.5px 3.75px !important; /* 2px * 0.75, 5px * 0.75 */
                border-radius: 7.5px !important; /* 10px * 0.75 */
            }
            
            .role-badges-container {
                gap: 3px !important; /* 4px * 0.75 */
            }
        }
    `;
    document.head.appendChild(toggleStyle);
    
    // Add classes to all badges for CSS targeting
    function applyBadgeClasses() {
        const badges = document.querySelectorAll('[data-role]');
        badges.forEach(badge => {
            badge.classList.add('role-badge');
        });
        
        const badgeContainers = document.querySelectorAll('div[style*="position: absolute"][style*="right: 0"][style*="top: 50%"]');
        badgeContainers.forEach(container => {
            container.classList.add('role-badges-container');
        });
    }
    
    // Run after a short delay to ensure DOM is ready
    setTimeout(applyBadgeClasses, 500);
})();
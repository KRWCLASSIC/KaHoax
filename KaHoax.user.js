// ==UserScript==
// @name         KaHoax
// @version      1.1.4.1
// @description  A hack for kahoot.it! First tries proxy lookup by Quiz ID. If that fails, uses fallback search and displays a scrollable dropdown for selection.
// @namespace    https://github.com/KRWCLASSIC
// @match        https://kahoot.it/*
// @icon         https://raw.githubusercontent.com/KRWCLASSIC/KaHoax/refs/heads/main/kahoot.svg
// @grant        none
// ==/UserScript==
(function() {
    var Version = '1.1.4.1';

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
    var inputLag = 100; // Ping compensation
    var lastValidQuizID = null; // Store the last successfully loaded quiz ID

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

    // Check if a string is a valid UUID format game ID
    function isValidGameId(str) {
        // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidPattern.test(str);
    }

    // Function to update the questions list in the browser
    function updateQuestionsList(questionsData) {
        // Clear the question list
        questionList.innerHTML = '';
        
        if (!questionsData || questionsData.length === 0) {
            // If no questions, show the no questions message
            questionList.appendChild(noQuestionsMsg);
            return;
        }
        
        // Count valid questions
        let validQuestionsCount = 0;
        
        // Loop through each question and add to the browser
        questionsData.forEach((question, index) => {
            // Skip questions with no text and no choices
            if ((!question.question || question.question === '[No question text]') && 
                (!question.choices || question.choices.length === 0)) {
                return;
            }
            
            validQuestionsCount++;
            
            // Create question item wrapper
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            questionItem.style.marginBottom = '8px';
            questionItem.style.borderRadius = '3px';
            questionItem.style.overflow = 'hidden';
            questionItem.style.border = '1px solid #444';
            
            // Question header (always visible)
            const questionHeader = document.createElement('div');
            questionHeader.className = 'question-header';
            questionHeader.style.padding = '8px 10px';
            questionHeader.style.backgroundColor = '#333';
            questionHeader.style.display = 'flex';
            questionHeader.style.alignItems = 'center';
            questionHeader.style.cursor = 'pointer';
            questionHeader.style.position = 'relative';
            
            // Question number badge
            const questionBadge = document.createElement('div');
            questionBadge.style.backgroundColor = '#555';
            questionBadge.style.color = 'white';
            questionBadge.style.borderRadius = '3px';
            questionBadge.style.padding = '2px 5px';
            questionBadge.style.fontSize = '0.7em';
            questionBadge.style.marginRight = '8px';
            questionBadge.style.minWidth = '18px';
            questionBadge.style.textAlign = 'center';
            questionBadge.textContent = `${index + 1}`;
            questionHeader.appendChild(questionBadge);
            
            // Question text
            const questionText = document.createElement('div');
            questionText.style.flex = '1';
            questionText.style.fontSize = '0.85em';
            questionText.style.color = 'white';
            questionText.style.fontWeight = 'bold';
            questionText.style.overflow = 'hidden';
            questionText.style.textOverflow = 'ellipsis';
            questionText.style.whiteSpace = 'nowrap';
            // Use innerHTML instead of textContent to preserve HTML formatting
            questionText.innerHTML = question.question || '[No question text]';
            questionHeader.appendChild(questionText);
            
            // Toggle arrow
            const toggleArrow = document.createElement('div');
            toggleArrow.style.marginLeft = '10px';
            toggleArrow.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(0deg); transition: transform 0.3s"><polyline points="6 9 12 15 18 9"></polyline></svg>';
            toggleArrow.style.color = '#999';
            toggleArrow.style.transition = 'transform 0.3s';
            questionHeader.appendChild(toggleArrow);
            
            questionItem.appendChild(questionHeader);
            
            // Content container (hidden by default)
            const contentContainer = document.createElement('div');
            contentContainer.className = 'question-content';
            contentContainer.style.maxHeight = '0';
            contentContainer.style.overflow = 'hidden';
            contentContainer.style.transition = 'max-height 0.3s ease-out';
            contentContainer.style.backgroundColor = '#2a2a2a';
            contentContainer.style.borderTop = '1px solid #444';
            contentContainer.style.padding = '0 10px';
            
            // Full question display
            const fullQuestion = document.createElement('div');
            fullQuestion.style.padding = '10px 0';
            fullQuestion.style.color = 'white';
            fullQuestion.style.fontSize = '0.85em';
            fullQuestion.style.borderBottom = '1px dashed #444';
            // Use innerHTML instead of textContent to preserve HTML formatting
            fullQuestion.innerHTML = question.question || '[No question text]';
            contentContainer.appendChild(fullQuestion);
            
            // Answers section
            const answersSection = document.createElement('div');
            answersSection.style.padding = '10px 0';
            
            if (question.choices && question.choices.length > 0) {
                // Answers title
                const answersTitle = document.createElement('div');
                answersTitle.style.fontWeight = 'bold';
                answersTitle.style.fontSize = '0.8em';
                answersTitle.style.color = '#ccc';
                answersTitle.style.marginBottom = '5px';
                answersTitle.textContent = 'Answers:';
                answersSection.appendChild(answersTitle);
                
                // Answers grid
                const answersGrid = document.createElement('div');
                answersGrid.style.display = 'grid';
                answersGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(45%, 1fr))';
                answersGrid.style.gap = '5px';
                
                question.choices.forEach((choice, choiceIndex) => {
                    // Answer item with icon
                    const answerItem = document.createElement('div');
                    answerItem.style.display = 'flex';
                    answerItem.style.alignItems = 'center';
                    answerItem.style.padding = '5px';
                    answerItem.style.backgroundColor = choice.correct ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.05)';
                    answerItem.style.borderRadius = '3px';
                    answerItem.style.border = choice.correct ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)';
                    answerItem.style.minHeight = '26px';
                    
                    // Answer icon
                    const answerIcon = document.createElement('div');
                    if (choice.correct) {
                        answerIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    } else {
                        answerIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>';
                    }
                    answerIcon.style.marginRight = '5px';
                    answerIcon.style.display = 'flex';
                    answerIcon.style.alignItems = 'center';
                    answerIcon.style.justifyContent = 'center';
                    answerItem.appendChild(answerIcon);
                    
                    // Answer text
                    const answerText = document.createElement('div');
                    answerText.style.fontSize = '0.8em';
                    answerText.style.color = choice.correct ? '#4CAF50' : '#fff';
                    answerText.style.flex = '1';
                    answerText.style.overflow = 'hidden';
                    answerText.style.textOverflow = 'ellipsis';
                    answerText.style.lineHeight = '1.4';
                    answerText.style.display = 'flex';
                    answerText.style.alignItems = 'center';
                    // Use innerHTML instead of textContent to preserve HTML formatting
                    answerText.innerHTML = choice.answer || '[No answer text]';
                    answerItem.appendChild(answerText);
                    
                    answersGrid.appendChild(answerItem);
                });
                
                answersSection.appendChild(answersGrid);
            } else {
                // If no choices available
                const noChoices = document.createElement('p');
                noChoices.textContent = 'No answer choices available';
                noChoices.style.color = '#999';
                noChoices.style.fontStyle = 'italic';
                noChoices.style.fontSize = '0.8em';
                answersSection.appendChild(noChoices);
            }
            
            contentContainer.appendChild(answersSection);
            questionItem.appendChild(contentContainer);
            
            // Toggle functionality
            let isExpanded = false;
            questionHeader.addEventListener('click', () => {
                isExpanded = !isExpanded;
                
                if (isExpanded) {
                    contentContainer.style.maxHeight = '500px';
                    contentContainer.style.padding = '0 10px';
                    toggleArrow.querySelector('svg').style.transform = 'rotate(180deg)';
                    questionHeader.style.backgroundColor = '#3c3c3c';
                } else {
                    contentContainer.style.maxHeight = '0';
                    contentContainer.style.padding = '0 10px';
                    toggleArrow.querySelector('svg').style.transform = 'rotate(0deg)';
                    questionHeader.style.backgroundColor = '#333';
                }
            });
            
            // Hover effects
            questionHeader.addEventListener('mouseover', () => {
                if (!isExpanded) {
                    questionHeader.style.backgroundColor = '#3a3a3a';
                }
            });
            
            questionHeader.addEventListener('mouseout', () => {
                if (!isExpanded) {
                    questionHeader.style.backgroundColor = '#333';
                }
            });
            
            questionList.appendChild(questionItem);
        });
        
        // If no valid questions were rendered, show the no questions message
        if (validQuestionsCount === 0) {
            questionList.appendChild(noQuestionsMsg);
        }
    }
    
    // Reset UI function – clears input, color, questions array, etc.
    function resetUI(restoreLastValidID = false) {
        inputBox.value = restoreLastValidID && lastValidQuizID ? lastValidQuizID : "";
        inputBox.style.backgroundColor = '#333333';
        dropdown.style.display = 'none';
        dropdownCloseButton.style.display = 'none';
        
        // If restoring last valid ID and we have one, reload it
        if (restoreLastValidID && lastValidQuizID) {
            handleInputChange(); // Re-query the API with the last valid ID
            return; // Exit early to prevent clearing questions
        }
        
        questions = [];
        info.numQuestions = 0;
        info.questionNum = -1;
        info.lastAnsweredQuestion = -1;
        questionsLabel.textContent = 'Question 0 / ?';
        
        // Reset questions browser
        updateQuestionsList([]);
        
        // Reset game PIN too
        lastKnownPin = null; // Clear stored PIN
        gamePinLabel.textContent = 'None';
        gamePinBox.removeAttribute('data-pin');
        gamePinBox.removeAttribute('data-has-pin');
        gamePinBox.style.cursor = 'default';
        copyIcon.style.display = 'none';
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

    // Create button container for Enter, Copy, and Paste buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.width = '100%';
    buttonContainer.style.marginTop = '10px';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.justifyContent = 'space-between';
    
    // Kahoot button to open the quiz on kahoot.it
    const kahootButton = document.createElement('button');
    kahootButton.style.width = '35px';
    kahootButton.style.height = '35px';
    kahootButton.style.backgroundColor = '#6c757d';
    kahootButton.style.color = 'white';
    kahootButton.style.border = 'none';
    kahootButton.style.borderRadius = '5px';
    kahootButton.style.cursor = 'pointer';
    kahootButton.style.display = 'flex';
    kahootButton.style.justifyContent = 'center';
    kahootButton.style.alignItems = 'center';
    kahootButton.style.transition = 'background-color 0.3s';
    kahootButton.title = 'Open quiz on Kahoot';
    
    // Use the Kahoot icon with white filter
    const kahootButtonIcon = document.createElement('img');
    kahootButtonIcon.src = 'https://icons.iconarchive.com/icons/simpleicons-team/simple/256/kahoot-icon.png';
    kahootButtonIcon.style.height = '20px';
    kahootButtonIcon.style.width = '20px';
    kahootButtonIcon.style.filter = 'brightness(0) invert(1)'; // Make icon white
    kahootButton.appendChild(kahootButtonIcon);
    
    kahootButton.addEventListener('click', () => {
        if (lastValidQuizID) {
            // Open the quiz in a new tab
            window.open(`https://create.kahoot.it/details/${lastValidQuizID}`, '_blank');
            
            // Visual feedback (green)
            const originalColor = kahootButton.style.backgroundColor;
            kahootButton.style.backgroundColor = '#4CAF50';
            setTimeout(() => {
                kahootButton.style.backgroundColor = originalColor;
            }, 500);
        } else {
            // No quiz loaded - show red feedback
            kahootButton.style.backgroundColor = '#F44336';
            setTimeout(() => {
                kahootButton.style.backgroundColor = '#6c757d';
            }, 500);
        }
    });
    
    kahootButton.addEventListener('mouseover', () => {
        kahootButton.style.backgroundColor = '#5a6268';
    });
    
    kahootButton.addEventListener('mouseout', () => {
        kahootButton.style.backgroundColor = '#6c757d';
    });
    
    buttonContainer.appendChild(kahootButton);
    
    // Enter button with consistent font
    const enterButton = document.createElement('button');
    enterButton.textContent = 'Enter';
    enterButton.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif'; 
    enterButton.style.flexGrow = '1';
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
    buttonContainer.appendChild(enterButton);
    
    // Copy button
    const copyButton = document.createElement('button');
    copyButton.style.width = '35px';
    copyButton.style.height = '35px';
    copyButton.style.backgroundColor = '#6c757d';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '5px';
    copyButton.style.cursor = 'pointer';
    copyButton.style.display = 'flex';
    copyButton.style.justifyContent = 'center';
    copyButton.style.alignItems = 'center';
    copyButton.style.transition = 'background-color 0.3s';
    copyButton.title = 'Copy verified Quiz ID';
    copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    `;
    
    copyButton.addEventListener('click', () => {
        if (lastValidQuizID) {
            navigator.clipboard.writeText(lastValidQuizID).then(() => {
                // Visual feedback
                const originalColor = copyButton.style.backgroundColor;
                copyButton.style.backgroundColor = '#4CAF50';
                setTimeout(() => {
                    copyButton.style.backgroundColor = originalColor;
                }, 500);
            });
        }
    });
    
    copyButton.addEventListener('mouseover', () => {
        copyButton.style.backgroundColor = '#5a6268';
    });
    
    copyButton.addEventListener('mouseout', () => {
        copyButton.style.backgroundColor = '#6c757d';
    });
    
    buttonContainer.appendChild(copyButton);
    
    // Paste button
    const pasteButton = document.createElement('button');
    pasteButton.style.width = '35px';
    pasteButton.style.height = '35px';
    pasteButton.style.backgroundColor = '#6c757d';
    pasteButton.style.color = 'white';
    pasteButton.style.border = 'none';
    pasteButton.style.borderRadius = '5px';
    pasteButton.style.cursor = 'pointer';
    pasteButton.style.display = 'flex';
    pasteButton.style.justifyContent = 'center';
    pasteButton.style.alignItems = 'center';
    pasteButton.style.transition = 'background-color 0.3s';
    pasteButton.title = 'Paste from clipboard';
    pasteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            <path d="M9 12h6"></path>
            <path d="M12 9v6"></path>
        </svg>
    `;
    
    pasteButton.addEventListener('click', () => {
        // Request clipboard permission and paste into input field
        navigator.clipboard.readText()
            .then(text => {
                // Clean up the text and check if it's a valid game ID
                const cleanedText = text.trim();
                
                if (isValidGameId(cleanedText)) {
                    // Valid game ID format - paste and show green feedback
                    inputBox.value = cleanedText;
                    const originalColor = pasteButton.style.backgroundColor;
                    pasteButton.style.backgroundColor = '#4CAF50';
                    setTimeout(() => {
                        pasteButton.style.backgroundColor = originalColor;
                    }, 500);
                } else {
                    // Invalid format - show red feedback without pasting
                    pasteButton.style.backgroundColor = '#F44336';
                    setTimeout(() => {
                        pasteButton.style.backgroundColor = '#6c757d';
                    }, 500);
                }
            })
            .catch(err => {
                console.error('Failed to read clipboard: ', err);
                // Show error feedback
                pasteButton.style.backgroundColor = '#F44336';
                setTimeout(() => {
                    pasteButton.style.backgroundColor = '#6c757d';
                }, 500);
            });
    });
    
    pasteButton.addEventListener('mouseover', () => {
        pasteButton.style.backgroundColor = '#5a6268';
    });
    
    pasteButton.addEventListener('mouseout', () => {
        pasteButton.style.backgroundColor = '#6c757d';
    });
    
    buttonContainer.appendChild(pasteButton);
    
    inputContainer.appendChild(buttonContainer);

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
        resetUI(true); // Pass true to restore the last valid ID
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

    // Custom scrollbars style
    const scrollbarStyle = document.createElement('style');
    scrollbarStyle.textContent = `
    /* Custom scrollbar styles for the KaHoax UI */
    .floating-ui *::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    
    .floating-ui *::-webkit-scrollbar-track {
        background: #222;
        border-radius: 4px;
    }
    
    .floating-ui *::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
        border: 2px solid #222;
    }
    
    .floating-ui *::-webkit-scrollbar-thumb:hover {
        background: #777;
    }
    
    .floating-ui *::-webkit-scrollbar-corner {
        background: #222;
    }
    
    /* For Firefox */
    .floating-ui * {
        scrollbar-width: thin;
        scrollbar-color: #555 #222;
    }
    
    /* Ensure the overflow is visible when needed for all elements */
    .dropdown, .question-list, .question-content {
        scrollbar-width: thin;
    }
    `;
    document.head.appendChild(scrollbarStyle);

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
    questionsLabel.textContent = 'Question 0 / ?';
    questionsLabel.style.display = 'block';
    questionsLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    questionsLabel.style.fontSize = '0.9em';
    questionsLabel.style.textAlign = 'center';
    questionsLabel.style.margin = '10px 0 5px 0';
    questionsLabel.style.color = 'white';
    uiElement.appendChild(questionsLabel);
    
    // Game PIN container
    const gamePinContainer = document.createElement('div');
    gamePinContainer.style.display = 'flex';
    gamePinContainer.style.flexDirection = 'row';
    gamePinContainer.style.alignItems = 'center';
    gamePinContainer.style.justifyContent = 'center';
    gamePinContainer.style.margin = '0 0 8px 0';
    gamePinContainer.style.width = '100%';
    gamePinContainer.style.gap = '6px';
    
    // All Questions browser section (collapsed by default)
    const allQuestionsContainer = document.createElement('div');
    allQuestionsContainer.style.display = 'flex';
    allQuestionsContainer.style.flexDirection = 'column';
    allQuestionsContainer.style.width = '90%';
    allQuestionsContainer.style.margin = '0 auto 10px auto';
    allQuestionsContainer.style.overflow = 'hidden';
    
    // Header row with toggle
    const allQuestionsHeader = document.createElement('div');
    allQuestionsHeader.style.display = 'flex';
    allQuestionsHeader.style.alignItems = 'center';
    allQuestionsHeader.style.padding = '8px 10px';
    allQuestionsHeader.style.cursor = 'pointer';
    allQuestionsHeader.style.backgroundColor = '#2c2c2c';
    allQuestionsHeader.style.borderRadius = '5px';
    allQuestionsHeader.style.border = '1px solid #444';
    allQuestionsHeader.style.transition = 'background-color 0.2s';
    allQuestionsHeader.style.marginBottom = '0';
    
    // Arrow icon
    const arrowIcon = document.createElement('span');
    arrowIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(0deg); transition: transform 0.3s"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    arrowIcon.style.display = 'inline-block';
    arrowIcon.style.marginRight = '8px';
    arrowIcon.style.transition = 'transform 0.3s';
    arrowIcon.style.color = '#999';
    
    // Header text
    const allQuestionsText = document.createElement('span');
    allQuestionsText.textContent = 'All Questions';
    allQuestionsText.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    allQuestionsText.style.color = 'white';
    allQuestionsText.style.fontSize = '0.9em';
    
    allQuestionsHeader.appendChild(arrowIcon);
    allQuestionsHeader.appendChild(allQuestionsText);
    allQuestionsContainer.appendChild(allQuestionsHeader);
    
    // Questions content (hidden by default)
    const questionsContent = document.createElement('div');
    questionsContent.style.maxHeight = '0';
    questionsContent.style.overflow = 'hidden';
    questionsContent.style.transition = 'max-height 0.3s ease-out';
    questionsContent.style.backgroundColor = '#2a2a2a';
    questionsContent.style.borderRadius = '5px';
    questionsContent.style.marginTop = '5px';
    questionsContent.style.padding = '0';
    questionsContent.style.border = 'none';
    questionsContent.style.display = 'none';
    
    // Question list container
    const questionList = document.createElement('div');
    questionList.className = 'question-list';
    questionList.style.fontSize = '0.8em';
    questionList.style.padding = '8px 5px';
    questionList.style.color = '#ffffff';
    questionList.style.maxHeight = '300px';
    questionList.style.overflowY = 'auto';
    
    questionsContent.appendChild(questionList);
    allQuestionsContainer.appendChild(questionsContent);
    
    // No questions message (shown by default)
    const noQuestionsMsg = document.createElement('div');
    noQuestionsMsg.textContent = 'No questions available. Load a quiz first.';
    noQuestionsMsg.style.padding = '10px';
    noQuestionsMsg.style.color = '#999';
    noQuestionsMsg.style.fontStyle = 'italic';
    noQuestionsMsg.style.fontSize = '0.85em';
    noQuestionsMsg.style.textAlign = 'center';
    questionList.appendChild(noQuestionsMsg);
    
    // Toggle function for expanding/collapsing
    let isQuestionsExpanded = false;
    
    // Pre-calculate the expanded height for smoother transitions
    let expandedHeight = '400px';
    
    allQuestionsHeader.addEventListener('click', () => {
        isQuestionsExpanded = !isQuestionsExpanded;
        
        if (isQuestionsExpanded) {
            // First prepare the content div before showing
            questionsContent.style.display = 'block';
            questionsContent.style.border = '1px solid #444';
            questionsContent.style.padding = '5px';
            questionsContent.style.transition = 'max-height 0.15s ease-out'; // Faster transition
            
            // Force reflow to make sure the browser registers the display change
            void questionsContent.offsetHeight;
            
            // Then trigger the expansion animation
            arrowIcon.querySelector('svg').style.transform = 'rotate(180deg)';
            questionsContent.style.maxHeight = expandedHeight;
            questionsContent.style.overflow = 'visible';
            allQuestionsHeader.style.backgroundColor = '#3c3c3c';
        } else {
            // For collapse, set everything immediately without animations or delays
            arrowIcon.querySelector('svg').style.transform = 'rotate(0deg)';
            allQuestionsHeader.style.backgroundColor = '#2c2c2c';
            
            // Hide content immediately without animation
            questionsContent.style.transition = 'none';
            questionsContent.style.maxHeight = '0';
            questionsContent.style.overflow = 'hidden';
            questionsContent.style.border = 'none';
            questionsContent.style.display = 'none';
            questionsContent.style.padding = '0';
        }
    });
    
    // Hover effects for the header
    allQuestionsHeader.addEventListener('mouseover', () => {
        if (!isQuestionsExpanded) {
            allQuestionsHeader.style.backgroundColor = '#383838';
        }
    });
    
    allQuestionsHeader.addEventListener('mouseout', () => {
        if (!isQuestionsExpanded) {
            allQuestionsHeader.style.backgroundColor = '#2c2c2c';
        }
    });
    
    // Title label
    const gamePinTitle = document.createElement('span');
    gamePinTitle.textContent = 'Game PIN:';
    gamePinTitle.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    gamePinTitle.style.fontSize = '0.9em';
    gamePinTitle.style.color = 'white';
    gamePinContainer.appendChild(gamePinTitle);
    
    // Clickable PIN box
    const gamePinBox = document.createElement('div');
    gamePinBox.style.display = 'inline-flex';
    gamePinBox.style.alignItems = 'center';
    gamePinBox.style.justifyContent = 'center';
    gamePinBox.style.width = 'fit-content';
    gamePinBox.style.minWidth = '80px';
    gamePinBox.style.maxWidth = '130px';
    gamePinBox.style.padding = '2px 6px';
    gamePinBox.style.backgroundColor = '#333';
    gamePinBox.style.border = '1px solid #444';
    gamePinBox.style.borderRadius = '3px';
    gamePinBox.style.cursor = 'pointer';
    gamePinBox.style.transition = 'all 0.2s ease';
    gamePinBox.style.whiteSpace = 'nowrap';
    gamePinBox.style.overflow = 'hidden';
    gamePinBox.style.textOverflow = 'ellipsis';
    
    // PIN Text
    const gamePinLabel = document.createElement('span');
    gamePinLabel.textContent = 'None';
    gamePinLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    gamePinLabel.style.fontSize = '0.9em';
    gamePinLabel.style.color = 'white';
    gamePinLabel.style.marginRight = '3px';
    gamePinLabel.style.flex = '1';
    gamePinLabel.style.textAlign = 'center';
    gamePinLabel.style.minWidth = '40px';
    gamePinLabel.style.display = 'inline-block';
    
    // Copy icon
    const copyIcon = document.createElement('span');
    copyIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    `;
    copyIcon.style.color = '#999';
    copyIcon.style.display = 'inline-block';
    copyIcon.style.verticalAlign = 'middle';
    copyIcon.style.flexShrink = '0';
    copyIcon.style.lineHeight = '1';
    
    gamePinBox.appendChild(gamePinLabel);
    gamePinBox.appendChild(copyIcon);
    gamePinContainer.appendChild(gamePinBox);
    
    // Hover effect
    gamePinBox.addEventListener('mouseover', () => {
        if (gamePinBox.getAttribute('data-has-pin') === 'true') {
            gamePinBox.style.backgroundColor = '#444';
            copyIcon.style.color = '#03A9F4';
        }
    });
    
    gamePinBox.addEventListener('mouseout', () => {
        gamePinBox.style.backgroundColor = '#333';
        copyIcon.style.color = '#999';
    });
    
    // Copy PIN functionality
    gamePinBox.addEventListener('click', () => {
        const pin = gamePinBox.getAttribute('data-pin');
        if (pin) {
            navigator.clipboard.writeText(pin).then(() => {
                // Show copy feedback
                const originalText = gamePinLabel.textContent;
                gamePinLabel.textContent = 'Copied!';
                copyIcon.style.color = '#4CAF50';
                
                // Visual feedback animation
                gamePinBox.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
                
                setTimeout(() => {
                    gamePinLabel.textContent = originalText;
                    copyIcon.style.color = '#999';
                    gamePinBox.style.backgroundColor = '#333';
                }, 1000);
            });
        }
    });
    
    uiElement.appendChild(gamePinContainer);
    uiElement.appendChild(allQuestionsContainer);

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
            gamePinContainer.style.display = 'none';
            allQuestionsContainer.style.display = 'none';
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
            gamePinContainer.style.display = 'flex';
            allQuestionsContainer.style.display = 'flex';
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
                                    // Use innerHTML instead of textContent to preserve HTML formatting
                                    questionText.innerHTML = question.question || '[No question text]';
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
                                            // Use createElement and innerHTML for proper formatting
                                            const choiceTextSpan = document.createElement('span');
                                            choiceTextSpan.innerHTML = choice.answer || '[No answer text]';
                                            choiceItem.textContent = ''; // Clear any existing text
                                            choiceItem.appendChild(document.createTextNode(`${marker} `));
                                            choiceItem.appendChild(choiceTextSpan);
                                            
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
                    lastValidQuizID = quizID; // Store the last valid quiz ID
                    
                    // Update the questions browser
                    updateQuestionsList(data.questions);
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
        // Update question label - use "?" for total if no questions loaded
        questionsLabel.textContent = 'Question ' + (info.questionNum + 1) + ' / ' + (info.numQuestions > 0 ? info.numQuestions : '?');
        
        // Check for game PIN
        try {
            // Always look for a PIN regardless of page, but update display conditionally
            let foundPin = null;
            
            // Try to get PIN from the input field
            const pinInputElement = document.querySelector('input[name="gameId"][data-functional-selector="game-pin-input"]');
            if (pinInputElement && pinInputElement.value) {
                const pin = pinInputElement.value.trim();
                if (pin) {
                    foundPin = pin;
                    lastKnownPin = pin; // Store the PIN even when not displayed
                }
            }
            
            // If no PIN found from input, check for displayed PIN in lobby/game
            if (!foundPin) {
                // Look for PIN display in various places
                let gamePinElement = document.querySelector('[data-functional-selector="game-pin"]');
                
                if (!gamePinElement) {
                    gamePinElement = document.querySelector('[data-functional-selector="game-pin-header"]');
                }
                
                if (gamePinElement) {
                    const pin = gamePinElement.textContent.trim();
                    if (pin) {
                        foundPin = pin;
                        lastKnownPin = pin; // Store the PIN even when not displayed
                    }
                }
            }
            
            // As a last resort, try to get from window/app state
            if (!foundPin) {
                if (typeof window.kahoot !== 'undefined' && 
                    window.kahoot.gameBlock && 
                    window.kahoot.gameBlock.pin) {
                    const pin = window.kahoot.gameBlock.pin;
                    foundPin = pin;
                    lastKnownPin = pin; // Store the PIN even when not displayed
                }
                
                // Look in URL params for possible PIN
                if (!foundPin) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const pinParam = urlParams.get('pin');
                    if (pinParam) {
                        foundPin = pinParam;
                        lastKnownPin = pinParam; // Store the PIN even when not displayed
                    }
                }
            }
            
            // If we found a PIN in this check or have a stored PIN, use it
            foundPin = foundPin || lastKnownPin;
            
            // Only update the display based on page state
            if (isGameRelatedPage()) {
                // We're on a game page, so display the PIN if available
                if (foundPin) {
                    gamePinLabel.textContent = foundPin;
                    gamePinBox.setAttribute('data-pin', foundPin);
                    gamePinBox.setAttribute('data-has-pin', 'true');
                    gamePinBox.style.cursor = 'pointer';
                    copyIcon.style.display = 'inline-block';
                } else {
                    gamePinLabel.textContent = 'None';
                    gamePinBox.removeAttribute('data-pin');
                    gamePinBox.removeAttribute('data-has-pin');
                    gamePinBox.style.cursor = 'default';
                    copyIcon.style.display = 'none';
                }
            } else {
                // Not on a game page, no PIN display
                gamePinLabel.textContent = 'None';
                gamePinBox.removeAttribute('data-pin');
                gamePinBox.removeAttribute('data-has-pin');
                gamePinBox.style.cursor = 'default';
                copyIcon.style.display = 'none';
            }
        } catch (e) {
            console.error("Error checking game PIN:", e);
        }
    }, 1);

    // Setup URL change detection for better PIN tracking
    let lastUrl = window.location.href;
    
    // Function to check if current page is a game-related page
    const isGameRelatedPage = () => {
        const currentPath = window.location.pathname;
        return currentPath.includes('/join') || 
               currentPath.includes('/instructions') || 
               currentPath.includes('/start') || 
               currentPath.includes('/getready') || 
               currentPath.includes('/gameblock') ||
               currentPath.includes('/answer') ||
               currentPath.includes('/ranking') ||
               currentPath.includes('/contentblock');
    };
    
    // Variable to store the last known PIN
    let lastKnownPin = null;
    
    // Create a new MutationObserver to watch for URL changes
    const observer = new MutationObserver(() => {
        if (lastUrl !== window.location.href) {
            const previousUrl = lastUrl;  // Save the previous URL
            lastUrl = window.location.href;  // Update to current URL
            
            // If we're navigating to a game page and have a stored PIN
            if (isGameRelatedPage() && lastKnownPin) {
                // Display the stored PIN immediately on game page navigation
                gamePinLabel.textContent = lastKnownPin;
                gamePinBox.setAttribute('data-pin', lastKnownPin);
                gamePinBox.setAttribute('data-has-pin', 'true');
                gamePinBox.style.cursor = 'pointer';
                copyIcon.style.display = 'inline-block';
            } 
            // If navigating away from game pages
            else if (!isGameRelatedPage()) {
                // Hide PIN display but keep the stored PIN
                gamePinLabel.textContent = 'None';
                gamePinBox.removeAttribute('data-pin');
                gamePinBox.removeAttribute('data-has-pin');
                gamePinBox.style.cursor = 'default';
                copyIcon.style.display = 'none';
            }
        }
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document, { subtree: true, childList: true });
    
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
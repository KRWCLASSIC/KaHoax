// ==UserScript==
// @name         Kahoax
// @version      1.1
// @description  A hack for kahoot.it! First tries proxy lookup by Quiz ID. If that fails, uses fallback search and displays a scrollable dropdown for selection.
// @namespace    https://github.com/KRWCLASSIC
// @match        https://kahoot.it/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kahoot.it
// @grant        none
// ==/UserScript==
(function() {
    var Version = '1.1';

    var questions = [];
    var info = {
        numQuestions: 0,
        questionNum: -1,
        lastAnsweredQuestion: -1,
        defaultIL: true,
        ILSetQuestion: -1,
    };
    var PPT = 950;
    var Answered_PPT = 950;
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
        inputBox.style.backgroundColor = 'white';
        dropdown.style.display = 'none';
        dropdownCloseButton.style.display = 'none';
        questions = [];
        info.numQuestions = 0;
        info.questionNum = -1;
        info.lastAnsweredQuestion = -1;
        inputLag = 100;
        questionsLabel.textContent = 'Question 0 / 0';
    }

    // --- UI Creation ---
    const uiElement = document.createElement('div');
    uiElement.className = 'floating-ui';
    uiElement.style.position = 'absolute';
    uiElement.style.top = '5%';
    uiElement.style.left = '5%';
    uiElement.style.width = '33vw';
    uiElement.style.height = 'auto';
    uiElement.style.backgroundColor = '#381272';
    uiElement.style.borderRadius = '1vw';
    uiElement.style.boxShadow = '0px 0px 10px 0px rgba(0, 0, 0, 0.5)';
    uiElement.style.zIndex = '9999';

    const handle = document.createElement('div');
    handle.className = 'handle';
    handle.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    handle.style.fontSize = '1.5vw';
    // Changed top handle text
    handle.textContent = 'Kahoot Exploit';
    handle.style.color = 'white';
    handle.style.width = '97.5%';
    handle.style.height = '2.5vw';
    handle.style.backgroundColor = '#321066';
    handle.style.borderRadius = '1vw 1vw 0 0';
    handle.style.cursor = 'grab';
    handle.style.textAlign = 'left';
    handle.style.paddingLeft = '2.5%';
    handle.style.lineHeight = '2vw';
    uiElement.appendChild(handle);

    const closeButton = document.createElement('div');
    closeButton.className = 'close-button';
    closeButton.textContent = '✕';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '0';
    closeButton.style.right = '0';
    closeButton.style.width = '12.5%';
    closeButton.style.height = '2.5vw';
    closeButton.style.backgroundColor = 'red';
    closeButton.style.color = 'white';
    closeButton.style.borderRadius = '0 1vw 0 0';
    closeButton.style.display = 'flex';
    closeButton.style.justifyContent = 'center';
    closeButton.style.alignItems = 'center';
    closeButton.style.cursor = 'pointer';
    handle.appendChild(closeButton);

    const minimizeButton = document.createElement('div');
    minimizeButton.className = 'minimize-button';
    minimizeButton.textContent = '─';
    minimizeButton.style.color = 'white';
    minimizeButton.style.position = 'absolute';
    minimizeButton.style.top = '0';
    minimizeButton.style.right = '12.5%';
    minimizeButton.style.width = '12.5%';
    minimizeButton.style.height = '2.5vw';
    minimizeButton.style.backgroundColor = 'gray';
    minimizeButton.style.borderRadius = '0 0 0 0';
    minimizeButton.style.display = 'flex';
    minimizeButton.style.justifyContent = 'center';
    minimizeButton.style.alignItems = 'center';
    minimizeButton.style.cursor = 'pointer';
    handle.appendChild(minimizeButton);

    // QUIZ ID/NAME
    const headerText = document.createElement('h2');
    headerText.textContent = 'QUIZ ID/NAME';
    headerText.style.display = 'block';
    headerText.style.margin = '1vw';
    headerText.style.textAlign = 'center';
    headerText.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    headerText.style.fontSize = '2vw';
    headerText.style.color = 'white';
    headerText.style.textShadow = `
      -1px -1px 0 rgb(47, 47, 47),
      1px -1px 0 rgb(47, 47, 47),
      -1px 1px 0 rgb(47, 47, 47),
      1px 1px 0 rgb(47, 47, 47)
    `;
    uiElement.appendChild(headerText);

    // Input container (relative for the dropdown)
    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.flexDirection = 'column';
    inputContainer.style.alignItems = 'center';
    inputContainer.style.position = 'relative';

    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.style.color = 'black';
    inputBox.placeholder = 'Quiz Id/Name of Quiz here...';
    inputBox.style.width = '27.8vw';
    inputBox.style.height = '1.5vw';
    inputBox.style.margin = '0';
    inputBox.style.padding = '0';
    inputBox.style.border = '.1vw solid black';
    inputBox.style.borderRadius = '1vw';
    inputBox.style.outline = 'none';
    inputBox.style.textAlign = 'center';
    inputBox.style.fontSize = '1.15vw';
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
    enterButton.style.marginTop = '0.5vw';
    enterButton.style.width = '27.8vw';
    enterButton.style.fontSize = '1.15vw';
    enterButton.style.cursor = 'pointer';
    enterButton.addEventListener('click', handleInputChange);
    inputContainer.appendChild(enterButton);

    // Dropdown for fallback suggestions
    const dropdown = document.createElement('div');
    dropdown.style.position = 'absolute';
    dropdown.style.top = 'calc(100% + 0.5vw)';
    dropdown.style.left = '0';
    dropdown.style.width = '27.8vw';
    dropdown.style.backgroundColor = 'white';
    dropdown.style.border = '.1vw solid black';
    dropdown.style.borderRadius = '0.5vw';
    dropdown.style.zIndex = '10000';
    dropdown.style.maxHeight = '30vw';
    dropdown.style.overflowY = 'auto';
    dropdown.style.display = 'none';
    inputContainer.appendChild(dropdown);

    // X button to close dropdown & reset
    const dropdownCloseButton = document.createElement('button');
    dropdownCloseButton.textContent = 'X';
    dropdownCloseButton.style.position = 'absolute';
    dropdownCloseButton.style.top = '-2vw';
    dropdownCloseButton.style.right = '0';
    dropdownCloseButton.style.width = '2vw';
    dropdownCloseButton.style.height = '2vw';
    dropdownCloseButton.style.backgroundColor = 'red';
    dropdownCloseButton.style.color = 'white';
    dropdownCloseButton.style.border = 'none';
    dropdownCloseButton.style.borderRadius = '50%';
    dropdownCloseButton.style.cursor = 'pointer';
    dropdownCloseButton.style.fontSize = '1vw';
    dropdownCloseButton.style.display = 'none';
    dropdownCloseButton.addEventListener('click', function() {
        resetUI();
    });
    inputContainer.appendChild(dropdownCloseButton);

    uiElement.appendChild(inputContainer);

    // POINTS PER QUESTION
    const header2 = document.createElement('h2');
    header2.textContent = 'POINTS PER QUESTION';
    header2.style.display = 'block';
    header2.style.margin = '1vw';
    header2.style.textAlign = 'center';
    header2.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    header2.style.fontSize = '2vw';
    header2.style.color = 'white';
    header2.style.textShadow = `
      -1px -1px 0 rgb(47, 47, 47),
      1px -1px 0 rgb(47, 47, 47),
      -1px 1px 0 rgb(47, 47, 47),
      1px 1px 0 rgb(47, 47, 47)
    `;
    uiElement.appendChild(header2);

    const sliderContainer = document.createElement('div');
    sliderContainer.style.width = '80%';
    sliderContainer.style.margin = '1vw auto';
    sliderContainer.style.display = 'flex';
    sliderContainer.style.alignItems = 'center';
    sliderContainer.style.justifyContent = 'center';

    const pointsLabel = document.createElement('span');
    pointsLabel.textContent = 'Points per Question: 950';
    pointsLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    pointsLabel.style.fontSize = '1.5vw';
    pointsLabel.style.margin = '1vw';
    pointsLabel.style.marginLeft = '1vw';
    pointsLabel.style.marginRight = '1vw';
    pointsLabel.style.color = 'white';
    sliderContainer.appendChild(pointsLabel);

    const pointsSlider = document.createElement('input');
    pointsSlider.type = 'range';
    pointsSlider.min = '500';
    pointsSlider.max = '1000';
    pointsSlider.value = '950';
    pointsSlider.style.width = '70%';
    pointsSlider.style.marginLeft = '1vw';
    pointsSlider.style.marginRight = '1vw';
    pointsSlider.style.border = 'none';
    pointsSlider.style.outline = 'none';
    pointsSlider.style.cursor = 'ew-resize';
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
    header3.style.margin = '1vw';
    header3.style.textAlign = 'center';
    header3.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    header3.style.fontSize = '2vw';
    header3.style.color = 'white';
    header3.style.textShadow = `
      -1px -1px 0 rgb(47, 47, 47),
      1px -1px 0 rgb(47, 47, 47),
      -1px 1px 0 rgb(47, 47, 47),
      1px 1px 0 rgb(47, 47, 47)
    `;
    uiElement.appendChild(header3);

    const autoAnswerSwitchContainer = document.createElement('div');
    autoAnswerSwitchContainer.className = 'switch-container';
    autoAnswerSwitchContainer.style.display = 'flex';
    autoAnswerSwitchContainer.style.alignItems = 'center';
    autoAnswerSwitchContainer.style.justifyContent = 'center';
    uiElement.appendChild(autoAnswerSwitchContainer);

    const autoAnswerLabel = document.createElement('span');
    autoAnswerLabel.textContent = 'Auto Answer';
    autoAnswerLabel.className = 'switch-label';
    autoAnswerLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    autoAnswerLabel.style.fontSize = '1.5vw';
    autoAnswerLabel.style.color = 'white';
    autoAnswerLabel.style.margin = '2.5vw';
    autoAnswerSwitchContainer.appendChild(autoAnswerLabel);

    const autoAnswerSwitch = document.createElement('label');
    autoAnswerSwitch.className = 'switch';
    autoAnswerSwitchContainer.appendChild(autoAnswerSwitch);

    const autoAnswerInput = document.createElement('input');
    autoAnswerInput.type = 'checkbox';
    autoAnswerInput.addEventListener('change', function() {
        autoAnswer = this.checked;
        info.ILSetQuestion = info.questionNum;
    });
    autoAnswerSwitch.appendChild(autoAnswerInput);

    const autoAnswerSlider = document.createElement('span');
    autoAnswerSlider.className = 'slider';
    autoAnswerSwitch.appendChild(autoAnswerSlider);

    const showAnswersSwitchContainer = document.createElement('div');
    showAnswersSwitchContainer.className = 'switch-container';
    showAnswersSwitchContainer.style.display = 'flex';
    showAnswersSwitchContainer.style.alignItems = 'center';
    showAnswersSwitchContainer.style.justifyContent = 'center';
    uiElement.appendChild(showAnswersSwitchContainer);

    const showAnswersLabel = document.createElement('span');
    showAnswersLabel.textContent = 'Show Answers';
    showAnswersLabel.className = 'switch-label';
    showAnswersLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    showAnswersLabel.style.fontSize = '1.5vw';
    showAnswersLabel.style.color = 'white';
    showAnswersLabel.style.margin = '2.5vw';
    showAnswersSwitchContainer.appendChild(showAnswersLabel);

    const showAnswersSwitch = document.createElement('label');
    showAnswersSwitch.className = 'switch';
    showAnswersSwitchContainer.appendChild(showAnswersSwitch);

    const showAnswersInput = document.createElement('input');
    showAnswersInput.type = 'checkbox';
    showAnswersInput.addEventListener('change', function() {
        showAnswers = this.checked;
    });
    showAnswersSwitch.appendChild(showAnswersInput);

    const showAnswersSlider = document.createElement('span');
    showAnswersSlider.className = 'slider';
    showAnswersSwitch.appendChild(showAnswersSlider);

    // INFO
    const header4 = document.createElement('h2');
    header4.textContent = 'INFO';
    header4.style.display = 'block';
    header4.style.margin = '1vw';
    header4.style.textAlign = 'center';
    header4.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    header4.style.fontSize = '2vw';
    header4.style.color = 'white';
    header4.style.textShadow = `
      -1px -1px 0 rgb(47, 47, 47),
      1px -1px 0 rgb(47, 47, 47),
      -1px 1px 0 rgb(47, 47, 47),
      1px 1px 0 rgb(47, 47, 47)
    `;
    uiElement.appendChild(header4);

    // questionsLabel
    const questionsLabel = document.createElement('span');
    questionsLabel.textContent = 'Question 0 / 0';
    questionsLabel.style.display = 'block';
    questionsLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    questionsLabel.style.fontSize = '1.5vw';
    questionsLabel.style.textAlign = 'center';
    questionsLabel.style.margin = '1vw';
    questionsLabel.style.marginLeft = '1vw';
    questionsLabel.style.marginRight = '1vw';
    questionsLabel.style.color = 'white';
    uiElement.appendChild(questionsLabel);

    // Removed input lag text from the UI entirely

    // Version label
    const versionLabel = document.createElement('h1');
    versionLabel.textContent = 'Kahoot Exploit V' + Version;
    versionLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    versionLabel.style.fontSize = '2.5vw';
    versionLabel.style.display = 'block';
    versionLabel.style.textAlign = 'center';
    versionLabel.style.marginTop = '3.5vw';
    versionLabel.style.marginLeft = '1vw';
    versionLabel.style.marginRight = '1vw';
    versionLabel.style.color = 'white';
    uiElement.appendChild(versionLabel);

    // "Links:" container
    const githubContainer = document.createElement('div');
    githubContainer.style.textAlign = 'center';
    githubContainer.style.marginTop = '1vw';

    const githubLabel = document.createElement('span');
    githubLabel.textContent = 'Links: ';
    githubLabel.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    githubLabel.style.fontSize = '1.5vw';
    githubLabel.style.margin = '0 1vw';
    githubLabel.style.color = 'white';
    githubContainer.appendChild(githubLabel);

    // 1) JW Tool Suite → https://landing.kahoot.space
    const link1 = document.createElement('a');
    link1.textContent = 'JW Tool Suite';
    link1.href = 'https://landing.kahoot.space';
    link1.target = '_blank';
    link1.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    link1.style.fontSize = '1.5vw';
    link1.style.margin = '0 1vw';
    link1.style.color = 'white';
    githubContainer.appendChild(link1);

    // 2) John Wee → https://johnwee.co
    const link2 = document.createElement('a');
    link2.textContent = 'John Wee';
    link2.href = 'https://johnw.ee';
    link2.target = '_blank';
    link2.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
    link2.style.fontSize = '1.5vw';
    link2.style.margin = '0 1vw';
    link2.style.color = 'white';
    githubContainer.appendChild(link2);

    uiElement.appendChild(githubContainer);

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
            versionLabel.style.display = 'none';
            githubContainer.style.display = 'none';
            sliderContainer.style.display = 'none';
            autoAnswerSwitchContainer.style.display = 'none';
            showAnswersSwitchContainer.style.display = 'none';
            uiElement.style.height = '2.5vw';
            handle.style.height = '100%';
            closeButton.style.height = '100%';
            minimizeButton.style.height = '100%';
        } else {
            headerText.style.display = 'block';
            header2.style.display = 'block';
            header3.style.display = 'block';
            header4.style.display = 'block';
            inputContainer.style.display = 'flex';
            questionsLabel.style.display = 'block';
            versionLabel.style.display = 'block';
            githubContainer.style.display = 'block';
            handle.style.height = '2.5vw';
            uiElement.style.height = 'auto';
            closeButton.style.height = '2.5vw';
            minimizeButton.style.height = '2.5vw';
            sliderContainer.style.display = 'flex';
            autoAnswerSwitchContainer.style.display = 'flex';
            showAnswersSwitchContainer.style.display = 'flex';
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
                  results.forEach(entity => {
                      let card = entity.card || {};
                      let displayTitle = card.title || card.name || "No title";
                      let displayCover = card.cover || card.image || 'https://dummyimage.com/50x50/ccc/fff.png&text=No+Image';
                      let quizUUID = card.uuid || card.id || "";
                      const item = document.createElement('div');
                      item.style.display = 'flex';
                      item.style.alignItems = 'center';
                      item.style.padding = '0.5vw';
                      item.style.cursor = 'pointer';
                      item.addEventListener('mouseover', function() {
                          item.style.backgroundColor = '#ddd';
                      });
                      item.addEventListener('mouseout', function() {
                          item.style.backgroundColor = 'white';
                      });
                      
                      const img = document.createElement('img');
                      img.src = displayCover;
                      img.alt = displayTitle;
                      img.style.width = '3vw';
                      img.style.height = '3vw';
                      img.style.marginRight = '1vw';
                      
                      const text = document.createElement('span');
                      text.textContent = displayTitle;
                      text.style.fontFamily = '"Montserrat", "Noto Sans Arabic", "Helvetica Neue", Helvetica, Arial, sans-serif';
                      item.appendChild(img);
                      item.appendChild(text);
                      
                      item.addEventListener('click', function() {
                          console.log("Selected entity:", card);
                          inputBox.value = quizUUID;
                          dropdown.style.display = 'none';
                          dropdownCloseButton.style.display = 'none';
                          handleInputChange();
                      });
                      
                      dropdown.appendChild(item);
                  });
                  dropdown.style.display = 'block';
                  dropdownCloseButton.style.display = 'block';
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
                    if (!response.ok) { throw new Error('Direct lookup failed'); }
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
            inputBox.style.backgroundColor = 'white';
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
                FindByAttributeValue("data-functional-selector", 'answer-' + answer, "button").style.backgroundColor = 'rgb(0, 255, 0)';
            }, 0);
        });
        question.incorrectAnswers.forEach(function (answer) {
            setTimeout(function() {
                FindByAttributeValue("data-functional-selector", 'answer-' + answer, "button").style.backgroundColor = 'rgb(255, 0, 0)';
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
                    FindByAttributeValue("data-functional-selector", 'multi-select-submit-button', "button").click();
                }, 0);
            }
        }, time - delay);
    }

    let isHidden = false;
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

    // Remove the style element creation and replace it with this:
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/custom/styles.css';
    document.head.appendChild(styleLink);
})();
 
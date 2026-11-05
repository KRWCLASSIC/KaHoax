# Features & Support Matrix

Overview of Kahoot question types, special modes, and their support status in KaHoax.

---

## Question Types

### Quiz (Single Choice)
- **Status:** Supported
- Standard 4-choice questions. KaHoax highlights the correct answer in green (incorrect in red) and auto-submits using direct React click injection.

### True / False
- **Status:** Supported
- Two-choice variant of the classic quiz (Blue Diamond / Red Triangle). Handled automatically alongside regular quiz questions.

### Multi-Select Quiz
- **Status:** Supported
- Questions with multiple correct answers. Kahoot uses checkbox labels and a submit button; KaHoax toggles all valid choices and confirms the submission.

### Type Answer (`open_ended`)
- **Status:** Cheat sheet only
- Text input questions. Accepted answers are parsed and visible in the "All Questions" dropdown for manual reading, but on-screen hints and auto-typing/submitting are not yet implemented.

### Puzzle / Sequence (`jumble`)
- **Status:** Planned
- Questions requiring players to arrange 4 tiles in the correct order. The target sequence is already present in the quiz data and needs a handler to order the tiles and hit submit.

### Slider
- **Status:** Planned
- Guess-the-number questions using a draggable range. The exact number and tolerance margins are available in the quiz data to set the slider position automatically.

### Drop Pin (`drop_pin` / `pin_it`)
- **Status:** Planned
- Image-based questions where players place a pin on target coordinates (e.g. locating an item on a diagram or map).

### Polls & Surveys
- **Status:** Planned
- Non-scoring opinion blocks (`survey`, `multiple_select_poll`, `word_cloud`, `scale`, `nps`).

---

## Content & Special Modes

### Presentation Slides (`content`)
- **Status:** Handled
- Teacher slides and embedded videos shown between questions. They carry no answers; KaHoax safely bypasses them and waits for the next live question without crashing.

### Themed Game Modes
- **Status:** Partial
- Specialized game types featuring mini-games between rounds (Temple, Submarine, Highest Towers, Color Kingdom). Standard question blocks work normally; intermediate mini-game screens require manual player input.

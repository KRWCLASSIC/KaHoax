// api.js

// Constants
const CORS_PROXY = 'https://corsproxy.io/?';
const KAHOOT_BASE_URL = 'https://kahoot.it/rest/kahoots/';
const KAHOOT_SEARCH_URL = 'https://kahoot.it/rest/kahoots/';

/**
 * Creates a proxied URL to bypass CORS restrictions
 * @param {string} url - Original URL
 * @returns {string} - Proxied URL
 */
function createProxiedUrl(url) {
    return CORS_PROXY + encodeURIComponent(url);
}

/**
 * Fetches quiz data directly from Kahoot
 * @param {string} quizId - The Kahoot quiz ID
 * @returns {Promise} Promise object with quiz data
 */
async function fetchQuizById(quizId) {
    try {
        const targetUrl = KAHOOT_BASE_URL + quizId;
        const response = await fetch(createProxiedUrl(targetUrl));
        if (!response.ok) {
            throw new Error('Quiz not found');
        }
        const data = await response.json();
        return {
            success: true,
            data: parseQuizData(data)
        };
    } catch (error) {
        console.error("Error fetching quiz:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Cleans up HTML and special characters from text
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanupText(text) {
    if (!text) return '';
    return text
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Replace HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Trim whitespace
        .trim();
}

/**
 * Parses raw quiz data into a standardized format
 * @param {Object} rawData - Raw quiz data from Kahoot
 * @returns {Object} Parsed quiz data
 */
function parseQuizData(rawData) {
    const questions = rawData.questions.map(question => {
        const parsedQuestion = {
            type: question.type,
            time: question.time,
            question: cleanupText(question.question),
            choices: []
        };

        if (['quiz', 'multiple_select_quiz'].includes(question.type)) {
            let correctAnswers = [];
            let incorrectAnswers = [];
            
            question.choices.forEach((choice, index) => {
                if (choice.correct) {
                    correctAnswers.push(index);
                } else {
                    incorrectAnswers.push(index);
                }
                
                parsedQuestion.choices.push({
                    answer: cleanupText(choice.answer),
                    correct: choice.correct
                });
            });
            
            parsedQuestion.answers = correctAnswers;
            parsedQuestion.incorrectAnswers = incorrectAnswers;
        } else if (question.type === 'open_ended') {
            parsedQuestion.answers = question.choices.map(choice => 
                cleanupText(choice.answer)
            );
        }

        return parsedQuestion;
    });

    return {
        uuid: rawData.uuid,
        title: cleanupText(rawData.title),
        description: cleanupText(rawData.description),
        questions: questions,
        questionCount: questions.length,
        creator: cleanupText(rawData.creator),
        coverMetadata: rawData.cover
    };
}

/**
 * Searches for Kahoot quizzes (fallback functionality)
 * @param {string} query - Search query
 * @returns {Promise} Promise object with search results
 */
async function searchQuizzes(query) {
    try {
        const searchParams = new URLSearchParams({
            query: query,
            limit: 25,
            cursor: 0
        });

        const targetUrl = `${KAHOOT_SEARCH_URL}?${searchParams}`;
        const response = await fetch(createProxiedUrl(targetUrl));
        if (!response.ok) {
            throw new Error('Search failed');
        }

        const data = await response.json();
        return {
            success: true,
            results: data.entities.map(entity => ({
                uuid: entity.card.uuid,
                title: entity.card.title || entity.card.name,
                description: entity.card.description,
                cover: entity.card.cover,
                creator: entity.card.creator,
                questionCount: entity.card.number_of_questions
            }))
        };
    } catch (error) {
        console.error("Error searching quizzes:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Validates a Kahoot quiz ID
 * @param {string} id - Quiz ID to validate
 * @returns {boolean} Whether the ID is valid
 */
function isValidQuizId(id) {
    // Kahoot uses UUID format: 8-4-4-4-12 characters
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Make functions available globally
window.fetchQuizById = fetchQuizById;
window.searchQuizzes = searchQuizzes;
window.isValidQuizId = isValidQuizId;
console.log("KRW API ready");
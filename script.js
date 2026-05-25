// script.js
// Lingo Día app logic. Requires vocab.js to load first.

const levelNames = ["Senderos 1", "Senderos 2", "Senderos 3"];

let selectedLevel = localStorage.getItem("selectedLevel") || "Senderos 1";
let selectedCategory = localStorage.getItem("selectedCategory") || "All Categories";
let missedWords = JSON.parse(localStorage.getItem("missedWords")) || [];
let quizWords = [];
let quizIndex = 0;
let score = 0;
let dailyWord = null;

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function cleanText(text) {
  return text
    .toLowerCase()
    .replace(/[¿?¡!.,]/g, "")
    .trim();
}

function getLevelWords() {
  return words.filter(word => word.level === selectedLevel);
}

function getFilteredWords() {
  const levelWords = getLevelWords();

  if (selectedCategory === "All Categories") {
    return levelWords;
  }

  return levelWords.filter(word => word.category === selectedCategory);
}

function getLevelCategories() {
  const categorySet = new Set(getLevelWords().map(word => word.category));
  return ["All Categories", ...Array.from(categorySet).sort()];
}

function getDailyEligibleWords() {
  const filtered = getFilteredWords().filter(word => word.dailyEligible);
  return filtered.length > 0 ? filtered : getLevelWords().filter(word => word.dailyEligible);
}

function getWordOfTheDay() {
  const eligibleWords = getDailyEligibleWords();

  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const difference = today - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayNumber = Math.floor(difference / oneDay);

  return eligibleWords[dayNumber % eligibleWords.length];
}

function showSection(sectionId) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  document.getElementById(sectionId).classList.add("active");
}

function setLevel(level) {
  selectedLevel = level;
  selectedCategory = "All Categories";

  localStorage.setItem("selectedLevel", selectedLevel);
  localStorage.setItem("selectedCategory", selectedCategory);

  resetQuizDisplay();
  refreshApp();
}

function setCategory(category) {
  selectedCategory = category;
  localStorage.setItem("selectedCategory", selectedCategory);

  resetQuizDisplay();
  refreshApp();
}

function resetQuizDisplay() {
  quizWords = [];
  quizIndex = 0;
  score = 0;

  const quizContainer = document.getElementById("quizContainer");
  const startQuizBtn = document.getElementById("startQuizBtn");

  if (quizContainer) quizContainer.innerHTML = "";
  if (startQuizBtn) {
    startQuizBtn.textContent = "Start Quiz";
    startQuizBtn.style.display = "block";
  }
}

function updateLevelText() {
  const currentLevelText = document.getElementById("currentLevelText");
  if (currentLevelText) {
    currentLevelText.textContent = `Current: ${selectedLevel} • ${selectedCategory}`;
  }
}

function loadLevelButtons() {
  const levelButtonContainer = document.getElementById("levelButtons");
  if (!levelButtonContainer) return;

  levelButtonContainer.innerHTML = "";

  levelNames.forEach(level => {
    const button = document.createElement("button");
    button.textContent = level;

    if (level === selectedLevel) {
      button.classList.add("selected-button");
    }

    button.addEventListener("click", () => setLevel(level));
    levelButtonContainer.appendChild(button);
  });
}

function loadCategoryButtons() {
  const categoryButtonContainer = document.getElementById("categoryButtons");
  if (!categoryButtonContainer) return;

  categoryButtonContainer.innerHTML = "";

  getLevelCategories().forEach(category => {
    const button = document.createElement("button");
    button.textContent = category;

    if (category === selectedCategory) {
      button.classList.add("selected-button");
    }

    button.addEventListener("click", () => setCategory(category));
    categoryButtonContainer.appendChild(button);
  });
}

function displayDailyWord() {
  dailyWord = getWordOfTheDay();

  document.getElementById("dailyWord").textContent = dailyWord.spanish;
  document.getElementById("dailyMeaning").textContent = dailyWord.english;
  document.getElementById("dailyPOS").textContent = dailyWord.pos;
  document.getElementById("dailyExample").textContent = dailyWord.example;
  document.getElementById("dailyTranslation").textContent = dailyWord.translation;
  document.getElementById("dailyTip").textContent = dailyWord.tip;
}

function makeEnglishOptions(correctWord) {
  const pool = getFilteredWords().length >= 4 ? getFilteredWords() : getLevelWords();

  const wrongOptions = shuffle(
    pool.filter(word => word.english !== correctWord.english)
  )
    .slice(0, 3)
    .map(word => word.english);

  return shuffle([correctWord.english, ...wrongOptions]);
}

function removeDailyWordFromExample(word) {
  const escapedWord = word.spanish.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escapedWord, "i");

  if (regex.test(word.example)) {
    return word.example.replace(regex, "").replace(/\s+/g, " ").trim();
  }

  return word.example;
}

function makePlacementQuestion(word) {
  const fullSentence = word.example;
  const sentenceWithoutWord = removeDailyWordFromExample(word);

  const fullWords = fullSentence.split(/\s+/);
  const blankWords = sentenceWithoutWord.split(/\s+/).filter(Boolean);

  const targetIndex = fullWords.findIndex(token => cleanText(token) === cleanText(word.spanish));

  let correctGap = 0;

  if (targetIndex >= 0) {
    const beforeWords = fullWords.slice(0, targetIndex).map(cleanText).filter(Boolean);
    correctGap = beforeWords.length;
  }

  return {
    words: blankWords,
    correctGap
  };
}

function renderPlacementQuestion(word) {
  const placement = makePlacementQuestion(word);
  const container = document.getElementById("placementSentence");

  container.innerHTML = "";

  for (let gap = 0; gap <= placement.words.length; gap++) {
    const gapButton = document.createElement("button");
    gapButton.className = "gap-button";
    gapButton.innerHTML = "＋";
    gapButton.title = `Insert "${word.spanish}" here`;

    gapButton.addEventListener("click", () => {
      const feedback = document.getElementById("placementFeedback");

      document.querySelectorAll(".gap-button").forEach(button => {
        button.classList.remove("gap-correct", "gap-wrong");
      });

      if (gap === placement.correctGap) {
        gapButton.classList.add("gap-correct");
        feedback.innerHTML = `<span class="correct">Correct! "${word.spanish}" belongs there.</span>`;
      } else {
        gapButton.classList.add("gap-wrong");
        feedback.innerHTML = `<span class="incorrect">Not quite. Try a different spot for "${word.spanish}."</span>`;
      }
    });

    container.appendChild(gapButton);

    if (gap < placement.words.length) {
      const wordSpan = document.createElement("span");
      wordSpan.className = "sentence-word";
      wordSpan.textContent = placement.words[gap];
      container.appendChild(wordSpan);
    }
  }
}

function makePOSOptions(correctWord) {
  const possiblePOS = ["noun", "verb", "adjective", "adverb", "phrase", "connector", "conjunction", "command", "interjection"];
  const wrongPOS = shuffle(possiblePOS.filter(pos => pos !== correctWord.pos)).slice(0, 3);

  return shuffle([correctWord.pos, ...wrongPOS]);
}

function loadPractice() {
  const practiceDiv = document.getElementById("practiceContent");
  const meaningOptions = makeEnglishOptions(dailyWord);
  const posOptions = makePOSOptions(dailyWord);

  practiceDiv.innerHTML = `
    <p><strong>1. What does "${dailyWord.spanish}" mean?</strong></p>
    <div id="meaningOptions"></div>
    <p id="meaningFeedback"></p>

    <hr>

    <p><strong>2. Click where "${dailyWord.spanish}" belongs in the sentence:</strong></p>
    <div id="placementSentence" class="placement-sentence"></div>
    <p id="placementFeedback"></p>

    <hr>

    <p><strong>3. What part of speech is "${dailyWord.spanish}"?</strong></p>
    <div id="posOptions"></div>
    <p id="posFeedback"></p>

    <hr>

    <p><strong>4. Write your own sentence using "${dailyWord.spanish}":</strong></p>
    <textarea id="studentSentence" placeholder="Write a full Spanish sentence."></textarea>
    <button onclick="saveSentence()">Save Sentence</button>
    <p id="sentenceSaved"></p>
  `;

  const meaningContainer = document.getElementById("meaningOptions");

  meaningOptions.forEach(option => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.textContent = option;

    button.addEventListener("click", () => {
      const feedback = document.getElementById("meaningFeedback");

      if (option === dailyWord.english) {
        feedback.innerHTML = `<span class="correct">Correct!</span>`;
      } else {
        feedback.innerHTML = `<span class="incorrect">Incorrect. "${dailyWord.spanish}" means "${dailyWord.english}."</span>`;
      }
    });

    meaningContainer.appendChild(button);
  });

  renderPlacementQuestion(dailyWord);

  const posContainer = document.getElementById("posOptions");

  posOptions.forEach(option => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.textContent = option;

    button.addEventListener("click", () => {
      const feedback = document.getElementById("posFeedback");

      if (option === dailyWord.pos) {
        feedback.innerHTML = `<span class="correct">Correct!</span>`;
      } else {
        feedback.innerHTML = `<span class="incorrect">Incorrect. "${dailyWord.spanish}" is a ${dailyWord.pos}.</span>`;
      }
    });

    posContainer.appendChild(button);
  });
}

function saveSentence() {
  const sentence = document.getElementById("studentSentence").value.trim();
  const sentenceSaved = document.getElementById("sentenceSaved");

  if (sentence.length < 3) {
    sentenceSaved.innerHTML = `<span class="incorrect">Write a full sentence first.</span>`;
    return;
  }

  sentenceSaved.innerHTML = `<span class="correct">Saved for this session!</span>`;
}

function startQuiz() {
  quizIndex = 0;
  score = 0;

  const pool = getFilteredWords();

  if (pool.length < 4) {
    document.getElementById("quizContainer").innerHTML = `<p>This category needs at least 4 words for a quiz.</p>`;
    return;
  }

  quizWords = shuffle(pool).slice(0, Math.min(10, pool.length));

  document.getElementById("startQuizBtn").style.display = "none";
  loadQuizQuestion();
}

function loadQuizQuestion() {
  const container = document.getElementById("quizContainer");

  if (quizIndex >= quizWords.length) {
    container.innerHTML = `
      <h3>Quiz Complete!</h3>
      <p>Your Score: ${score}/${quizWords.length}</p>
      <p>${score >= Math.ceil(quizWords.length * 0.8) ? "Strong work." : "Review your missed words and try again."}</p>
    `;

    document.getElementById("startQuizBtn").textContent = "Restart Quiz";
    document.getElementById("startQuizBtn").style.display = "block";

    loadMistakes();
    return;
  }

  const current = quizWords[quizIndex];
  const options = makeEnglishOptions(current);

  container.innerHTML = `
    <p><strong>Question ${quizIndex + 1} of ${quizWords.length}</strong></p>
    <p>What does <strong>"${current.spanish}"</strong> mean?</p>
    <div id="quizOptions"></div>
    <p id="quizFeedback"></p>
  `;

  const optionsContainer = document.getElementById("quizOptions");

  options.forEach(option => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.textContent = option;

    button.addEventListener("click", () => answerQuiz(option, current));
    optionsContainer.appendChild(button);
  });
}

function answerQuiz(selected, current) {
  const feedback = document.getElementById("quizFeedback");

  if (selected === current.english) {
    score++;
    feedback.innerHTML = `<span class="correct">Correct!</span>`;
  } else {
    feedback.innerHTML = `<span class="incorrect">Incorrect. "${current.spanish}" means "${current.english}."</span>`;

    const alreadySaved = missedWords.some(word =>
      word.spanish === current.spanish && word.level === current.level
    );

    if (!alreadySaved) {
      missedWords.push(current);
      localStorage.setItem("missedWords", JSON.stringify(missedWords));
    }
  }

  quizIndex++;
  setTimeout(loadQuizQuestion, 900);
}

function loadUnitButtons() {
  const unitButtons = document.getElementById("unitButtons");
  unitButtons.innerHTML = "";

  getLevelCategories().filter(category => category !== "All Categories").forEach(category => {
    const button = document.createElement("button");
    button.textContent = category;
    button.addEventListener("click", () => showCategory(category));
    unitButtons.appendChild(button);
  });

  document.getElementById("unitWords").innerHTML = `
    <p>Choose a ${selectedLevel} unit to view words.</p>
  `;
}

function showCategory(category) {
  const container = document.getElementById("unitWords");
  const filtered = getLevelWords().filter(word => word.category === category);

  container.innerHTML = filtered.map(word => `
    <div class="word-card">
      <h3>${word.spanish}</h3>
      <p><strong>Meaning:</strong> ${word.english}</p>
      <p><strong>Part of Speech:</strong> ${word.pos}</p>
      <p><strong>Example:</strong> ${word.example}</p>
      <p><strong>Translation:</strong> ${word.translation}</p>
    </div>
  `).join("");
}

function loadMistakes() {
  const container = document.getElementById("mistakeList");

  const levelMistakes = missedWords.filter(word => word.level === selectedLevel);

  if (levelMistakes.length === 0) {
    container.innerHTML = `<p>No missed words yet for ${selectedLevel}. Take a quiz first.</p>`;
    return;
  }

  container.innerHTML = levelMistakes.map(word => `
    <div class="word-card">
      <h3>${word.spanish}</h3>
      <p><strong>Meaning:</strong> ${word.english}</p>
      <p><strong>Example:</strong> ${word.example}</p>
      <p><strong>Translation:</strong> ${word.translation}</p>
    </div>
  `).join("");
}

function refreshApp() {
  updateLevelText();
  loadLevelButtons();
  loadCategoryButtons();
  displayDailyWord();
  loadPractice();
  loadUnitButtons();
  loadMistakes();
}

refreshApp();

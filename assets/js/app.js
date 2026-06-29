// assets/js/app.js

// Constants
const STORAGE_KEY = "madrasati-arabic-unit-one-lesson-one-v1";

// Application State
let state = {
  currentScreen: "home", // "home" | "training" | "result"
  answers: {},           // { [qid]: string }
  revealed: {},          // { [qid]: boolean }
  ratings: {},           // { [qid]: number } (0 | 5 | 10)
  mastery: {},           // { [qid]: "mastered" | "review" | "unmastered" }
  openStates: {},        // { [qid]: boolean }
  currentIndex: 0,       // index of active question (0-19)
  theme: "light"         // "light" | "dark"
};

// Selectors
const appHeader = document.querySelector("header");
const btnThemeToggle = document.getElementById("theme-toggle-btn");
const homeScreen = document.getElementById("home-screen");
const trainingScreen = document.getElementById("training-screen");
const resultScreen = document.getElementById("result-screen");
const questionsListContainer = document.getElementById("questions-list-container");
const progressBarFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");

// Navigation buttons
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnFinish = document.getElementById("btn-finish");

// Confirmation Modal Elements
const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmBody = document.getElementById("confirm-body");
const confirmYesBtn = document.getElementById("confirm-yes");
const confirmNoBtn = document.getElementById("confirm-no");
let onConfirmCallback = null;

// Initialize App
function init() {
  loadState();
  applyTheme();
  renderApp();
  setupEventListeners();
}

// Load State from LocalStorage
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    } catch (e) {
      console.error("Failed to parse saved state, resetting to defaults", e);
    }
  } else {
    // Fresh start: question 1 (p01-a01-i01) is open by default
    state.openStates = { "p01-a01-i01": true };
  }
}

// Save State to LocalStorage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Apply Theme
function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  const icon = btnThemeToggle.querySelector("span");
  if (icon) {
    icon.textContent = state.theme === "dark" ? "☀️" : "🌙";
  }
}

// Toggle Theme
function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveState();
}

// Render screens based on currentState
function renderApp() {
  // Hide all screens
  homeScreen.classList.add("hidden");
  trainingScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");

  // Show header back to home button only if not on home screen
  const btnHeaderHome = document.getElementById("header-home-btn");
  if (state.currentScreen === "home") {
    btnHeaderHome.classList.add("hidden");
  } else {
    btnHeaderHome.classList.remove("hidden");
  }

  if (state.currentScreen === "home") {
    renderHomeScreen();
    homeScreen.classList.remove("hidden");
  } else if (state.currentScreen === "training") {
    renderTrainingScreen();
    trainingScreen.classList.remove("hidden");
  } else if (state.currentScreen === "result") {
    renderResultScreen();
    resultScreen.classList.remove("hidden");
  }
}

function toArabicIndic(num) {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => digits[parseInt(d)] || d).join('');
}

// Screen: Home
function renderHomeScreen() {
  const btnContinue = document.getElementById("btn-continue-training");
  const btnNewAttempt = document.getElementById("btn-new-attempt");
  const homeQuestionsCount = document.getElementById("home-questions-count");

  homeQuestionsCount.textContent = `عدد الأسئلة الكلي في هذا التدريب: ${toArabicIndic(QUESTIONS_DATA.length)} سؤالاً وزارياً.`;

  // Check if we have any existing progress
  const hasProgress = Object.keys(state.answers).length > 0;

  if (hasProgress) {
    btnContinue.classList.remove("hidden");
    btnNewAttempt.classList.remove("hidden");
    document.getElementById("btn-start-training").classList.add("hidden");
  } else {
    btnContinue.classList.add("hidden");
    btnNewAttempt.classList.add("hidden");
    document.getElementById("btn-start-training").classList.remove("hidden");
  }
}

// Screen: Training (The Accordion list of questions)
function renderTrainingScreen() {
  questionsListContainer.innerHTML = "";

  QUESTIONS_DATA.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = `question-card ${state.openStates[q.id] ? "open" : ""}`;
    card.id = `card-${q.id}`;

    // Header snippet text
    let snippet = q.question;
    if (snippet.length > 55) {
      snippet = snippet.substring(0, 52) + "...";
    }

    // Determine status badge
    let statusLabel = "لم تتم الإجابة";
    let statusClass = "";
    if (state.ratings[q.id] !== undefined) {
      statusLabel = `تم التقييم (${state.ratings[q.id]} درجات)`;
      if (state.ratings[q.id] === 0) statusLabel = `تم التقييم (0 درجة)`;
      statusClass = "graded";
    } else if (state.revealed[q.id]) {
      statusLabel = "تم عرض الجواب";
      statusClass = "revealed";
    } else if (state.answers[q.id]) {
      statusLabel = "تمت الإجابة";
      statusClass = "answered";
    }

    // Determine mastery badge
    let masteryLabel = "";
    let masteryClass = "";
    if (state.mastery[q.id]) {
      if (state.mastery[q.id] === "mastered") {
        masteryLabel = "متمكن";
        masteryClass = "mastered";
      } else if (state.mastery[q.id] === "review") {
        masteryLabel = "يحتاج مراجعة";
        masteryClass = "review";
      } else if (state.mastery[q.id] === "unmastered") {
        masteryLabel = "غير متمكن";
        masteryClass = "unmastered";
      }
    }

    // Question Header HTML
    const headerHtml = `
      <div class="question-header" onclick="toggleCard('${q.id}')">
        <div class="question-header-right">
          <span class="question-number">س ${index + 1}</span>
          <span class="question-snippet">${snippet}</span>
          ${q.years ? `<span class="badge badge-year">${q.years}</span>` : ""}
          <span class="badge badge-status ${statusClass}">${statusLabel}</span>
          ${masteryLabel ? `<span class="badge badge-mastery ${masteryClass}">${masteryLabel}</span>` : ""}
        </div>
        <svg class="chevron-icon" viewBox="0 0 24 24" width="24" height="24">
          <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
        </svg>
      </div>
    `;

    // Question Body Content (Quran, poetry, prose, textarea, submit and grading panels)
    let bodyHtml = `
      <div class="question-body">
        <div class="question-meta">
          ${q.years ? `<span class="badge badge-year" style="display:inline-block; margin-bottom:0.75rem;">${q.years}</span>` : ""}
        </div>
    `;

    // 1. Quran Verse Area
    if (q.quranVerse) {
      bodyHtml += `
        <div class="quran-verse" dir="rtl" lang="ar">
          ${q.quranVerse}
        </div>
      `;
    }

    // 2. Poetry Area
    if (q.poetry) {
      if (q.poetry.layout === "two-halves") {
        bodyHtml += `
          <div class="poetry-verse poetry-two-halves" dir="rtl" lang="ar">
            <span class="poetry-hemistich poetry-sadr">${q.poetry.sadr}</span>
            <span class="poetry-separator">—</span>
            <span class="poetry-hemistich poetry-ajuz">${q.poetry.ajuz}</span>
          </div>
        `;
      } else if (q.poetry.layout === "two-lines") {
        bodyHtml += `
          <div class="poetry-verse" dir="rtl" lang="ar">
            <div class="poetry-line">${q.poetry.lines[0]}</div>
            <div class="poetry-line">${q.poetry.lines[1]}</div>
          </div>
        `;
      }
    }

    // 3. Prose Area
    if (q.proseText) {
      bodyHtml += `
        <div class="prose-block" dir="rtl" lang="ar">
          ${q.proseText}
        </div>
      `;
    }

    // 4. Question Text
    bodyHtml += `
        <div class="question-text" dir="rtl" lang="ar">${q.question}</div>
    `;

    // 5. Textarea / Response input
    const isRevealed = !!state.revealed[q.id];
    const savedAnswer = state.answers[q.id] || "";
    bodyHtml += `
        <div class="answer-box-container">
          <label class="answer-label">اكتب جوابك هنا يا بطل:</label>
          <textarea 
            id="textarea-${q.id}" 
            class="answer-textarea" 
            placeholder="اكتب الإعراب أو الإجابة النموذجية كما تراها..."
            oninput="handleTextareaInput('${q.id}')"
            ${isRevealed ? "disabled" : ""}
          >${savedAnswer}</textarea>
        </div>
    `;

    // 6. Action Button (Show Answer)
    if (!isRevealed) {
      bodyHtml += `
        <button 
          id="btn-reveal-${q.id}" 
          class="btn btn-primary" 
          style="width: 100%; padding: 0.75rem;" 
          onclick="revealAnswer('${q.id}')"
          ${savedAnswer.trim() === "" ? "disabled" : ""}
        >
          تمت الإجابة — أظهر الجواب النموذجي
        </button>
      `;
    }

    // 7. Post-reveal Area (Model answer, grading, mastery)
    if (isRevealed) {
      const selectedRating = state.ratings[q.id];
      const selectedMastery = state.mastery[q.id];

      bodyHtml += `
        <div class="revealed-content">
          <h4 class="model-answer-title">الجواب النموذجي من المصدر</h4>
          <div class="model-answer-box" dir="rtl" lang="ar">
            ${q.modelAnswer}
          </div>

          <div class="self-grading-panel">
            <h4 class="grading-title">قيّم جوابك يا بطل</h4>
            <p class="grading-subtitle">اختر الدرجة التي تراها مناسبة بعد مقارنة جوابك بالجواب النموذجي.</p>
            <div class="grading-buttons">
              <button class="grading-btn ${selectedRating === 0 ? "selected" : ""}" onclick="rateQuestion('${q.id}', 0)">0 درجة</button>
              <button class="grading-btn ${selectedRating === 5 ? "selected" : ""}" onclick="rateQuestion('${q.id}', 5)">5 درجات</button>
              <button class="grading-btn ${selectedRating === 10 ? "selected" : ""}" onclick="rateQuestion('${q.id}', 10)">10 درجات</button>
            </div>
          </div>

          <div class="mastery-panel">
            <h4 class="mastery-title">مستوى تمكنك من هذا السؤال</h4>
            <div class="mastery-buttons">
              <button class="mastery-btn ${selectedMastery === "mastered" ? "selected" : ""}" data-mastery="mastered" onclick="masterQuestion('${q.id}', 'mastered')">متمكن من السؤال</button>
              <button class="mastery-btn ${selectedMastery === "review" ? "selected" : ""}" data-mastery="review" onclick="masterQuestion('${q.id}', 'review')">أحتاج إلى مراجعة الموضوع</button>
              <button class="mastery-btn ${selectedMastery === "unmastered" ? "selected" : ""}" data-mastery="unmastered" onclick="masterQuestion('${q.id}', 'unmastered')">غير متمكن</button>
            </div>
          </div>
        </div>
      `;
    }

    bodyHtml += `
      </div>
    `;

    card.innerHTML = headerHtml + bodyHtml;
    questionsListContainer.appendChild(card);
  });

  // Update navigation & progress bar
  updateProgress();
}

// Update progress indicators & active page buttons
function updateProgress() {
  const total = QUESTIONS_DATA.length;
  
  // Progress is computed as how many questions have answers written
  const answeredCount = Object.keys(state.answers).filter(id => state.answers[id] && state.answers[id].trim() !== "").length;
  const percentage = (answeredCount / total) * 100;

  progressBarFill.style.width = `${percentage}%`;
  progressText.textContent = `السؤال ${state.currentIndex + 1} من ${total}`;

  // Configure navigation buttons
  btnPrev.disabled = state.currentIndex === 0;
  btnNext.disabled = state.currentIndex === total - 1;
}

// Toggle an accordion card
function toggleCard(qid) {
  // Toggle the open state of the clicked card
  state.openStates[qid] = !state.openStates[qid];
  
  // Keep track of the index of the newly opened card as currentIndex if opened
  if (state.openStates[qid]) {
    const idx = QUESTIONS_DATA.findIndex(q => q.id === qid);
    if (idx !== -1) {
      state.currentIndex = idx;
    }
  }

  saveState();
  renderTrainingScreen();

  // Scroll card smoothly into view if opened
  if (state.openStates[qid]) {
    setTimeout(() => {
      const el = document.getElementById(`card-${qid}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);
  }
}

// Cycle through cards sequentially
function navigateToQuestion(direction) {
  const currentQid = QUESTIONS_DATA[state.currentIndex].id;
  
  // Collapse currently active card
  state.openStates[currentQid] = false;

  if (direction === "next" && state.currentIndex < QUESTIONS_DATA.length - 1) {
    state.currentIndex++;
  } else if (direction === "prev" && state.currentIndex > 0) {
    state.currentIndex--;
  }

  const newQid = QUESTIONS_DATA[state.currentIndex].id;
  
  // Expand new active card
  state.openStates[newQid] = true;

  saveState();
  renderTrainingScreen();

  // Scroll new card smoothly into view
  setTimeout(() => {
    const el = document.getElementById(`card-${newQid}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, 100);
}

// Input character listener to enable/disable Reveal button
function handleTextareaInput(qid) {
  const textarea = document.getElementById(`textarea-${qid}`);
  const btnReveal = document.getElementById(`btn-reveal-${qid}`);
  const val = textarea.value;

  state.answers[qid] = val;
  saveState();

  if (btnReveal) {
    btnReveal.disabled = val.trim() === "";
  }
}

// Reveal model answer action
function revealAnswer(qid) {
  const val = state.answers[qid] || "";
  if (val.trim() === "") return;

  state.revealed[qid] = true;
  saveState();
  renderTrainingScreen();

  // Scroll to make revealed content visible
  setTimeout(() => {
    const cardEl = document.getElementById(`card-${qid}`);
    if (cardEl) {
      const revealedEl = cardEl.querySelector(".revealed-content");
      if (revealedEl) {
        revealedEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, 100);
}

// Submit rating score
function rateQuestion(qid, score) {
  state.ratings[qid] = score;
  saveState();
  renderTrainingScreen();
}

// Submit mastery level
function masterQuestion(qid, level) {
  state.mastery[qid] = level;
  saveState();
  renderTrainingScreen();
}

// Screen: Results
function renderResultScreen() {
  const total = QUESTIONS_DATA.length;
  
  // Compute metrics
  const answeredCount = Object.keys(state.answers).filter(id => state.answers[id] && state.answers[id].trim() !== "").length;
  const revealedCount = Object.keys(state.revealed).filter(id => state.revealed[id]).length;
  
  // Rated items
  const gradedQids = Object.keys(state.ratings);
  const gradedCount = gradedQids.length;

  let scoreSum = 0;
  gradedQids.forEach(qid => {
    scoreSum += state.ratings[qid] || 0;
  });

  const maxPossibleScore = total * 10;
  const percentageVal = maxPossibleScore > 0 ? Math.round((scoreSum / maxPossibleScore) * 100) : 0;

  // Update UI components
  document.getElementById("res-percentage").textContent = `${percentageVal}%`;
  document.getElementById("res-score-detail").textContent = `مجموع التقييم الذاتي: ${scoreSum} من ${maxPossibleScore} درجة`;
  document.getElementById("res-total-questions").textContent = total;
  document.getElementById("res-answered-questions").textContent = answeredCount;
  document.getElementById("res-revealed-answers").textContent = revealedCount;
  document.getElementById("res-graded-questions").textContent = gradedCount;

  // Mastery summary
  const masteredCount = Object.values(state.mastery).filter(lvl => lvl === "mastered").length;
  const reviewCount = Object.values(state.mastery).filter(lvl => lvl === "review").length;
  const unmasteredCount = Object.values(state.mastery).filter(lvl => lvl === "unmastered").length;

  document.getElementById("res-mastered-count").textContent = masteredCount;
  document.getElementById("res-review-count").textContent = reviewCount;
  document.getElementById("res-unmastered-count").textContent = unmasteredCount;

  // Ungraded questions chips
  const ungradedContainer = document.getElementById("res-ungraded-list");
  const ungradedChipsBox = document.getElementById("res-ungraded-chips");
  ungradedChipsBox.innerHTML = "";

  const ungradedList = QUESTIONS_DATA.filter(q => state.ratings[q.id] === undefined);

  if (ungradedList.length > 0) {
    ungradedContainer.classList.add("has-items");
    ungradedList.forEach(q => {
      const idx = QUESTIONS_DATA.findIndex(item => item.id === q.id);
      const chip = document.createElement("button");
      chip.className = "ungraded-chip";
      chip.textContent = `س ${idx + 1}`;
      chip.onclick = () => {
        // Go back to training, open this question
        state.currentScreen = "training";
        // Collapse all others
        Object.keys(state.openStates).forEach(k => state.openStates[k] = false);
        state.openStates[q.id] = true;
        state.currentIndex = idx;
        saveState();
        renderApp();
        // Scroll to card
        setTimeout(() => {
          const el = document.getElementById(`card-${q.id}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      };
      ungradedChipsBox.appendChild(chip);
    });
  } else {
    ungradedContainer.classList.remove("has-items");
  }
}

// Reset entire training and answers with Custom Confirmation Dialog
function startNewAttempt() {
  showConfirmDialog(
    "تأكيد محاولة جديدة",
    "هل أنت متأكد من حذف جميع الإجابات والتقييمات والبدء من جديد؟ لن يمكنك استرجاع إجاباتك السابقة بعد تأكيد الحذف.",
    () => {
      // Clear all state except theme
      state.answers = {};
      state.revealed = {};
      state.ratings = {};
      state.mastery = {};
      state.currentIndex = 0;
      
      // Default: Question 1 open, others closed
      state.openStates = { "p01-a01-i01": true };
      
      saveState();
      state.currentScreen = "training";
      renderApp();
    }
  );
}

// Custom Cohesive Confirmation Dialog
function showConfirmDialog(title, text, onConfirm) {
  confirmTitle.textContent = title;
  confirmBody.textContent = text;
  onConfirmCallback = onConfirm;
  confirmModal.style.display = "flex";
}

function hideConfirmDialog() {
  confirmModal.style.display = "none";
  onConfirmCallback = null;
}

// Navigation Helper
function navigateTo(screenName) {
  state.currentScreen = screenName;
  saveState();
  renderApp();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme Toggle Button
  btnThemeToggle.addEventListener("click", toggleTheme);

  // Home actions
  document.getElementById("btn-start-training").addEventListener("click", () => {
    navigateTo("training");
  });
  document.getElementById("btn-continue-training").addEventListener("click", () => {
    navigateTo("training");
  });
  document.getElementById("btn-new-attempt").addEventListener("click", startNewAttempt);

  // Training actions
  btnPrev.addEventListener("click", () => navigateToQuestion("prev"));
  btnNext.addEventListener("click", () => navigateToQuestion("next"));
  
  btnFinish.addEventListener("click", () => {
    navigateTo("result");
  });

  // Result actions
  document.getElementById("btn-result-home").addEventListener("click", () => {
    navigateTo("home");
  });
  document.getElementById("btn-result-reset").addEventListener("click", startNewAttempt);

  // Header Back to Home
  document.getElementById("header-home-btn").addEventListener("click", () => {
    navigateTo("home");
  });

  // Modal actions
  confirmYesBtn.addEventListener("click", () => {
    if (onConfirmCallback) {
      onConfirmCallback();
    }
    hideConfirmDialog();
  });
  confirmNoBtn.addEventListener("click", hideConfirmDialog);
}

// Run the application
window.addEventListener("DOMContentLoaded", init);

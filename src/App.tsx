/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  BookOpen, 
  Home, 
  Moon, 
  Sun, 
  Award, 
  HelpCircle, 
  Check, 
  Play, 
  RotateCcw, 
  GraduationCap, 
  Eye, 
  CheckCircle, 
  Lock, 
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Filter,
  LayoutGrid,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { QUESTIONS_DATA, Question } from "./questions";
import madrasatiLogo from "./assets/images/madrasati-logo.png";

const STORAGE_KEY = "madrasati-arabic-unit-one-lesson-one-v1";

interface QuizState {
  currentScreen: "home" | "practice" | "results";
  currentIndex: number;
  answers: Record<string, string>;
  shownAnswers: Record<string, boolean>;
  ratings: Record<string, number>;
  mastery: Record<string, "high" | "mid" | "low">;
  theme: "light" | "dark";
  filter: "all" | "unanswered" | "unrated" | "needs_review" | "not_mastered" | "mastered";
}

const DEFAULT_STATE: QuizState = {
  currentScreen: "home",
  currentIndex: 0,
  answers: {},
  shownAnswers: {},
  ratings: {},
  mastery: {},
  theme: "light",
  filter: "all"
};

const scrollRail = (direction: "left" | "right", elementId: string) => {
  const rail = document.getElementById(elementId);
  if (rail) {
    const scrollAmount = direction === "left" ? -200 : 200;
    rail.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }
};

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
    }
  }
};

export default function App() {
  const [state, setState] = useState<QuizState>(DEFAULT_STATE);
  const [showResetModal, setShowResetModal] = useState(false);
  const [hoveredChartBar, setHoveredChartBar] = useState<number | null>(null);
  const [badgeGlow, setBadgeGlow] = useState(false);

  // Safe fallback objects to prevent crashes if state properties are missing
  const answers = state.answers || {};
  const shownAnswers = state.shownAnswers || {};
  const ratings = state.ratings || {};
  const mastery = state.mastery || {};

  // Load saved state from localStorage
  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setState(prev => {
            const sanitized: QuizState = {
              currentScreen: (parsed.currentScreen === "home" || parsed.currentScreen === "practice" || parsed.currentScreen === "results") ? parsed.currentScreen : "home",
              currentIndex: typeof parsed.currentIndex === "number" ? parsed.currentIndex : 0,
              answers: (parsed.answers && typeof parsed.answers === "object") ? parsed.answers : {},
              shownAnswers: (parsed.shownAnswers && typeof parsed.shownAnswers === "object") ? parsed.shownAnswers : {},
              ratings: (parsed.ratings && typeof parsed.ratings === "object") ? parsed.ratings : {},
              mastery: (parsed.mastery && typeof parsed.mastery === "object") ? parsed.mastery : {},
              theme: (parsed.theme === "dark" || parsed.theme === "light") ? parsed.theme : "light",
              filter: (parsed.filter === "all" || parsed.filter === "unanswered" || parsed.filter === "unrated" || parsed.filter === "needs_review" || parsed.filter === "not_mastered" || parsed.filter === "mastered") ? parsed.filter : "all"
            };
            return sanitized;
          });
        }
      } catch (e) {
        console.error("Error parsing saved state:", e);
      }
    }
  }, []);

  // Save state to localStorage and apply theme
  useEffect(() => {
    if (state !== DEFAULT_STATE) {
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    // Apply theme to document
    document.documentElement.setAttribute("data-theme", state.theme);
  }, [state]);

  // Theme Toggler
  const toggleTheme = () => {
    setState(prev => ({
      ...prev,
      theme: prev.theme === "dark" ? "light" : "dark"
    }));
  };

  // Screen Routing
  const navigateTo = (screen: "home" | "practice" | "results") => {
    setState(prev => ({
      ...prev,
      currentScreen: screen
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset entire attempt
  const performReset = () => {
    setState({
      ...DEFAULT_STATE,
      theme: state.theme
    });
    safeLocalStorage.removeItem(STORAGE_KEY);
    setShowResetModal(false);
  };

  // Filter helper functions
  const getFilteredQuestions = (): Question[] => {
    const currentFilter = state.filter;
    return QUESTIONS_DATA.filter(q => {
      const isAnswered = !!answers[q.id] && answers[q.id].trim().length > 0;
      const hasRating = ratings[q.id] !== undefined;
      const masteryStatus = mastery[q.id];

      if (currentFilter === "unanswered") {
        return !isAnswered;
      }
      if (currentFilter === "unrated") {
        return !hasRating;
      }
      if (currentFilter === "needs_review") {
        return masteryStatus === "mid";
      }
      if (currentFilter === "not_mastered") {
        return masteryStatus === "low";
      }
      if (currentFilter === "mastered") {
        return masteryStatus === "high";
      }
      return true; // "all"
    });
  };

  const getFilteredIndex = (): number => {
    const filtered = getFilteredQuestions();
    const currentQ = QUESTIONS_DATA[state.currentIndex];
    if (!currentQ) return -1;
    return filtered.findIndex(q => q.id === currentQ.id);
  };

  // Ensure active question belongs to selected filter list
  const ensureValidFilterSelection = (newFilter: "all" | "unanswered" | "unrated" | "needs_review" | "not_mastered" | "mastered") => {
    // We update the filter inside state first
    const tempState = { ...state, filter: newFilter };
    const tempAnswers = tempState.answers || {};
    const tempRatings = tempState.ratings || {};
    const tempMastery = tempState.mastery || {};

    const filtered = QUESTIONS_DATA.filter(q => {
      const isAnswered = !!tempAnswers[q.id] && tempAnswers[q.id].trim().length > 0;
      const hasRating = tempRatings[q.id] !== undefined;
      const masteryStatus = tempMastery[q.id];

      if (newFilter === "unanswered") return !isAnswered;
      if (newFilter === "unrated") return !hasRating;
      if (newFilter === "needs_review") return masteryStatus === "mid";
      if (newFilter === "not_mastered") return masteryStatus === "low";
      if (newFilter === "mastered") return masteryStatus === "high";
      return true;
    });

    if (filtered.length > 0) {
      const currentQ = QUESTIONS_DATA[state.currentIndex];
      const idx = filtered.findIndex(q => q.id === currentQ.id);
      if (idx === -1) {
        // Find index of first filtered question in original array
        const origIndex = QUESTIONS_DATA.findIndex(q => q.id === filtered[0].id);
        return origIndex;
      }
    }
    return state.currentIndex;
  };

  const handleFilterChange = (newFilter: "all" | "unanswered" | "unrated" | "needs_review" | "not_mastered" | "mastered") => {
    const nextIndex = ensureValidFilterSelection(newFilter);
    setState(prev => ({
      ...prev,
      filter: newFilter,
      currentIndex: nextIndex
    }));
  };

  // Jump to specific question and collapse others implicitly by modifying index
  const jumpToQuestion = (origIdx: number) => {
    setState(prev => ({
      ...prev,
      currentScreen: "practice",
      currentIndex: origIdx
    }));
    setTimeout(() => {
      const card = document.getElementById(`card-${QUESTIONS_DATA[origIdx].id}`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  // Academic Label Generator
  const getAcademicLabel = (score: number | undefined) => {
    if (score === undefined || score === null) return "غير مقيّم";
    if (score === 0) return "بحاجة لتركيز أكبر وتأسيس كامل ❌";
    if (score <= 2) return "تحتاج جهد إضافي ومراجعة دقيقة ⚠️";
    if (score <= 4) return "مقبول — تحتاج سد بعض الثغرات 👍";
    if (score <= 6) return "جيد — أداء مرضي ومتماسك ✨";
    if (score <= 8) return "جيد جداً — اقتربت من الإتقان الكامل 🌟";
    if (score <= 9) return "ممتاز — فهم عميق ومتميز 🏆";
    return "أداء عبقري ودرجة كاملة! 👑";
  };

  // Typing state sync
  const handleTyping = (qId: string, val: string) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...(prev.answers || {}),
        [qId]: val
      }
    }));
  };

  // Lock response and reveal model answer
  const revealModelAnswer = (qId: string) => {
    setState(prev => ({
      ...prev,
      shownAnswers: {
        ...(prev.shownAnswers || {}),
        [qId]: true
      }
    }));
  };

  // Self assessment score selection
  const rateQuestion = (qId: string, score: number) => {
    setState(prev => ({
      ...prev,
      ratings: {
        ...(prev.ratings || {}),
        [qId]: score
      }
    }));
  };

  // Set mastery status
  const setMasteryStatus = (qId: string, status: "high" | "mid" | "low") => {
    setState(prev => ({
      ...prev,
      mastery: {
        ...(prev.mastery || {}),
        [qId]: status
      }
    }));
  };

  // Compute common stats variables
  const totalQuestions = QUESTIONS_DATA.length;
  const answeredCount = QUESTIONS_DATA.filter(q => (answers[q.id] || "").trim().length > 0).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const ratedCount = QUESTIONS_DATA.filter(q => ratings[q.id] !== undefined).length;
  const ratedPercent = Math.round((ratedCount / totalQuestions) * 100);

  const maxScore = totalQuestions * 10;
  let totalScore = 0;
  QUESTIONS_DATA.forEach(q => {
    if (ratings[q.id] !== undefined) {
      totalScore += ratings[q.id];
    }
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let masteryHigh = 0;
  let masteryMid = 0;
  let masteryLow = 0;
  QUESTIONS_DATA.forEach(q => {
    const m = mastery[q.id];
    if (m === "high") masteryHigh++;
    else if (m === "mid") masteryMid++;
    else if (m === "low") masteryLow++;
  });

  const hasHistory = answeredCount > 0;

  const filtered = getFilteredQuestions();
  const filteredIdx = getFilteredIndex();

  const activeQuestion = filtered[filteredIdx];

  // List of unrated question indices
  const unratedQuestions: { num: number; id: string }[] = [];
  QUESTIONS_DATA.forEach((q, idx) => {
    if (shownAnswers[q.id] && ratings[q.id] === undefined) {
      unratedQuestions.push({ num: idx + 1, id: q.id });
    }
  });

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* 1. Navbar Container */}
      <nav className="navbar">
        <div className="brand" onClick={() => navigateTo("home")} style={{ cursor: "pointer" }}>
          <img 
            src={madrasatiLogo} 
            alt="تطبيق مدرسي" 
            className="app-logo" 
          />
          <span className="brand-name">تطبيق مدرسي</span>
        </div>
        
        <div className="nav-actions">
          {state.currentScreen !== "home" && (
            <button className="btn btn-secondary" onClick={() => navigateTo("home")}>
              <Home className="w-[18px] h-[18px] ml-1 inline-block" />
              <span>الرئيسية</span>
            </button>
          )}

          <button className="btn btn-secondary btn-circle" onClick={toggleTheme} title="تبديل الوضع الليلي والنهاري">
            {state.theme === "dark" ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-900" />
            )}
          </button>
        </div>
      </nav>

      {/* 2. Main Content Wrapper */}
      <main className="container" id="main-content">
        
        {/* ==============================================
            A. HOME SCREEN VIEW
            ============================================== */}
        {state.currentScreen === "home" && (
          <div className="home-screen">
            <h1 className="home-title" style={{ fontSize: "1.8rem", color: "var(--color-primary)", fontWeight: "800", marginBottom: "0.5rem" }}>
              الأسئلة الوزارية حول أسماء الاستفهام
            </h1>
            <p className="home-subtitle" style={{ fontSize: "1.1rem", color: "var(--color-text-muted)", marginBottom: "2rem" }}>
              المجموعة الثانية (مجموعة الزمان والمكان والحال) لقواعد اللغة العربية للصف السادس الإعدادي
            </p>
            
            <div className="home-steps-card">
              <h3 className="home-steps-title">طريقة العمل المختصرة في التطبيق:</h3>
              <ul className="home-steps-list">
                <li>
                  <span className="home-steps-num">١</span>
                  <span>اكتب جوابك الشخصي كاملاً وبكل أمانة في الحقل المخصص.</span>
                </li>
                <li>
                  <span className="home-steps-num">٢</span>
                  <span>اضغط على زر (أظهر الجواب النموذجي) للمقارنة الدقيقة مع المصدر.</span>
                </li>
                <li>
                  <span className="home-steps-num">٣</span>
                  <span>قيّم جوابك يا بطل بموضوعية واختر الدرجة المناسبة من (0 إلى 10).</span>
                </li>
                <li>
                  <span className="home-steps-num">٤</span>
                  <span>حدّد مستوى تمكنك من السؤال لمراجعة نقاط ضعفك لاحقاً بكل سهولة.</span>
                </li>
              </ul>
            </div>

            <div className="home-stats-preview">
              عدد الأسئلة الكلي في هذا التدريب: {totalQuestions} سؤالاً وزارياً.
              {hasHistory && (
                <>
                  <br />
                  <span style={{ color: "var(--color-primary)" }}>
                    لقد أجبت على {answeredCount} من أصل {totalQuestions} سؤالاً سابقاً.
                  </span>
                </>
              )}
            </div>

            <div className="home-actions">
              {hasHistory ? (
                <>
                  <button className="btn btn-primary" onClick={() => navigateTo("practice")}>
                    <Play className="w-5 h-5 ml-1 fill-white inline-block" />
                    متابعة التدريب الحالي
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowResetModal(true)}>
                    <RotateCcw className="w-5 h-5 ml-1 inline-block" />
                    بدء محاولة جديدة تماماً
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={() => navigateTo("practice")}>
                  <GraduationCap className="w-5 h-5 ml-1 inline-block" />
                  ابدأ التدريب الآن
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==============================================
            B. PRACTICE / QUIZ SCREEN VIEW
            ============================================== */}
        {state.currentScreen === "practice" && (
          <div className="practice-view">
            
            {/* 1. Header Progress & Sliders */}
            <div className="practice-header">
              <div className="progress-container" style={{ marginBottom: "0.4rem" }}>
                <span className="progress-label" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--madrasati-medium-purple)", display: "inline-block" }}></span>
                  أسئلة أجبت عليها: {answeredCount} من {totalQuestions}
                </span>
                <span className="progress-label" style={{ fontSize: "0.85rem", color: "var(--madrasati-medium-purple)", fontWeight: 600 }}>{progressPercent}%</span>
              </div>
              <div className="progress-bar-outer" style={{ height: "6px", marginBottom: "0.75rem" }}>
                <div className="progress-bar-inner" style={{ width: `${progressPercent}%`, backgroundColor: "var(--madrasati-medium-purple)" }}></div>
              </div>

              <div className="progress-container" style={{ marginBottom: "0.4rem" }}>
                <span className="progress-label" style={{ fontSize: "0.9rem", color: "var(--color-text-main)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-primary)", display: "inline-block" }}></span>
                  نسبة الأسئلة المقيمة: {ratedCount} من {totalQuestions}
                </span>
                <span className="progress-label" style={{ fontSize: "0.9rem", color: "var(--color-primary)", fontWeight: 700 }}>{ratedPercent}%</span>
              </div>
              <div className="progress-bar-outer" style={{ height: "8px", marginBottom: "1.5rem" }}>
                <div className="progress-bar-inner" style={{ width: `${ratedPercent}%`, backgroundColor: "var(--color-primary)" }}></div>
              </div>

              {/* 2. Filter Bar */}
              <div className="filter-bar">
                <span className="filter-label">
                  <Filter className="w-4 h-4 ml-1 inline-block text-[--color-primary]" />
                  تصفية الأسئلة:
                </span>
                <div className="filter-options">
                  <button className={`filter-btn ${state.filter === "all" ? "active" : ""}`} onClick={() => handleFilterChange("all")}>الكل</button>
                  <button className={`filter-btn ${state.filter === "unanswered" ? "active" : ""}`} onClick={() => handleFilterChange("unanswered")}>غير المحلولة</button>
                  <button className={`filter-btn ${state.filter === "unrated" ? "active" : ""}`} onClick={() => handleFilterChange("unrated")}>لم يتم التقييم</button>
                  <button className={`filter-btn ${state.filter === "needs_review" ? "active" : ""}`} onClick={() => handleFilterChange("needs_review")}>تحتاج مراجعة</button>
                  <button className={`filter-btn ${state.filter === "not_mastered" ? "active" : ""}`} onClick={() => handleFilterChange("not_mastered")}>غير متمكن</button>
                  <button className={`filter-btn ${state.filter === "mastered" ? "active" : ""}`} onClick={() => handleFilterChange("mastered")}>متمكن</button>
                </div>
              </div>

              {/* 3. Horizontal Rail */}
              <div className="relative flex items-center gap-2 mb-6" dir="rtl">
                <button 
                  className="w-9 h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-primary)] flex items-center justify-center hover:bg-[var(--color-accent-bg)] transition-all shrink-0 cursor-pointer shadow-sm"
                  onClick={() => scrollRail("right", "nav-rail")}
                  title="السابق"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div 
                  className="question-navigator flex-1 flex gap-2 overflow-x-auto py-1 scroll-smooth" 
                  id="nav-rail" 
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {filtered.map((q) => {
                    const originalNum = QUESTIONS_DATA.findIndex(item => item.id === q.id) + 1;
                    const isActive = QUESTIONS_DATA[state.currentIndex]?.id === q.id;
                    const isAnswered = !!answers[q.id] && answers[q.id].trim().length > 0;

                    return (
                      <div 
                        key={q.id}
                        className={`nav-dot ${isActive ? 'active' : ''} ${isAnswered ? 'answered' : ''}`}
                        onClick={() => {
                          const origIndex = QUESTIONS_DATA.findIndex(item => item.id === q.id);
                          if (origIndex !== -1) {
                            setState(prev => ({ ...prev, currentIndex: origIndex }));
                          }
                        }}
                        title={`سؤال ${originalNum}`}
                      >
                        {originalNum}
                      </div>
                    );
                  })}
                </div>

                <button 
                  className="w-9 h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-primary)] flex items-center justify-center hover:bg-[var(--color-accent-bg)] transition-all shrink-0 cursor-pointer shadow-sm"
                  onClick={() => scrollRail("left", "nav-rail")}
                  title="التالي"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 4. Active Card / Accordion Card Wrapper */}
            <div className="questions-list">
              {!activeQuestion ? (
                <div className="empty-filter-state">
                  <HelpCircle className="w-16 h-16 text-purple-300 stroke-[1.5]" />
                  <h3>لا توجد أسئلة تطابق التصفية الحالية</h3>
                  <p>حاول تغيير نوع التصفية في الأعلى لعرض الأسئلة المتاحة.</p>
                  <button className="btn btn-primary" onClick={() => handleFilterChange("all")}>عرض جميع الأسئلة</button>
                </div>
              ) : (
                (() => {
                  const q = activeQuestion;
                  const originalIdx = QUESTIONS_DATA.findIndex(item => item.id === q.id);
                  const originalNum = originalIdx + 1;

                  const isAnswered = !!answers[q.id] && answers[q.id].trim().length > 0;
                  const isShown = !!shownAnswers[q.id];
                  const hasRating = ratings[q.id] !== undefined;
                  const masteryStatus = mastery[q.id];

                  let statusText = "لم تتم الإجابة";
                  let statusClass = "status-unanswered";

                  if (hasRating) {
                    statusText = "تم التقييم";
                    statusClass = "status-rated";
                  } else if (isShown) {
                    statusText = "تم عرض الجواب";
                    statusClass = "status-viewed";
                  } else if (isAnswered) {
                    statusText = "تمت الإجابة";
                    statusClass = "status-answered";
                  }

                  return (
                    <div id={`card-${q.id}`} className="accordion-card active">
                      <div className="card-header" style={{ cursor: "default" }}>
                        <div className="card-header-left">
                          <span className="question-num-badge">{originalNum}</span>
                          <span className="question-preview-text">
                            {q.text.substring(0, 45).replace(/\n/g, " ") + (q.text.length > 45 ? "..." : "")}
                          </span>
                        </div>
                        <div className="card-header-right">
                          {masteryStatus && (
                            <span className={`mastery-badge ${
                              masteryStatus === "high" ? "mastery-high" :
                              masteryStatus === "mid" ? "mastery-mid" : "mastery-low"
                            }`}>
                              {masteryStatus === "high" ? "متمكن" : masteryStatus === "mid" ? "يحتاج مراجعة" : "غير متمكن"}
                            </span>
                          )}
                          <span className={`status-badge ${statusClass}`}>{statusText}</span>
                        </div>
                      </div>

                      <div className="card-body" style={{ display: "block" }}>
                        <div className="badges-row">
                          <span className="year-badge">{q.year}</span>
                        </div>

                        {/* Quran Rendering */}
                        {q.type === "quran" && q.verse && (
                          <div className="quran-container">
                            <div className="quran-verse" dir="rtl" lang="ar">{q.verse}</div>
                          </div>
                        )}

                        {/* Poetry Rendering */}
                        {q.type === "poetry" && q.poetryLines && (
                          <div className="poetry-wrapper" style={{ marginBottom: "1.25rem" }}>
                            <div className="poetry-intro-text">قال الشاعر:</div>
                            <div className="poetry-verse poetry-two-halves" dir="rtl" lang="ar">
                              {q.poetryLines.map((line, lIdx) => (
                                <div key={lIdx} className="poetry-two-halves" style={{ display: "contents" }}>
                                  <span className="poetry-hemistich poetry-sadr">{line.first}</span>
                                  <span className="poetry-separator mx-4 text-[var(--color-primary)]">—</span>
                                  <span className="poetry-hemistich poetry-ajuz">{line.second}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prose Rendering */}
                        {q.type === "prose" && q.verse && (
                          <div className="poetry-verse text-right leading-relaxed text-base px-6 py-4 mb-4" style={{ display: "block" }}>
                            {q.verse}
                          </div>
                        )}

                        <h3 className="question-text">{q.text}</h3>

                        {/* Textarea input */}
                        <div className="answer-input-container">
                          <label className="answer-label" htmlFor={`textarea-${q.id}`}>إجابتك الشخصية يا بطل:</label>
                          <textarea 
                            className="answer-textarea" 
                            id={`textarea-${q.id}`} 
                            placeholder="اكتب هنا إجابتك النحوية الكاملة قبل عرض الإجابة النموذجية..."
                            value={answers[q.id] || ""}
                            onChange={(e) => handleTyping(q.id, e.target.value)}
                            disabled={isShown}
                          />
                        </div>

                        <div className="submit-action-row text-center mt-4">
                          <button 
                            className="w-full sm:w-auto mx-auto flex items-center justify-center gap-2 py-3.5 px-8 font-bold text-[1.05rem] rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm bg-[var(--color-accent-bg)] text-[var(--color-primary)] border-[var(--color-border)] hover:bg-[var(--color-border)] disabled:opacity-50 disabled:cursor-not-allowed" 
                            id={`btn-show-${q.id}`} 
                            onClick={() => revealModelAnswer(q.id)}
                            disabled={!isAnswered || isShown}
                          >
                            <Eye className="w-[20px] h-[20px]" />
                            <span>تمت الإجابة — أظهر الجواب النموذجي</span>
                          </button>
                        </div>

                        {/* Model Answer Section */}
                        {isShown && (
                          <div className="model-answer-section" id={`model-${q.id}`} style={{ display: "block" }}>
                            <h4 className="model-answer-title">
                              <Check className="w-[18px] h-[18px] ml-1 inline-block" />
                              الجواب النموذجي من المصدر:
                            </h4>
                            <p className="model-answer-text">{q.modelAnswer}</p>
                          </div>
                        )}

                        {/* Evaluation & Slider Section */}
                        {isShown && (
                          <div className="evaluation-section" id={`eval-${q.id}`} style={{ display: "block" }}>
                            <h4 className="eval-title">
                              <Award className="w-[18px] h-[18px] ml-1 inline-block" />
                              ميزان التقييم الذاتي الأكاديمي (0 - 10 درجات)
                            </h4>
                            <p className="eval-subtitle">قارن إجابتك بالحل النموذجي أعلاه بدقة، ثم اختر الدرجة التي تستحقها على هذا التدريج الأكاديمي:</p>
                            
                            <div className="academic-slider-wrapper">
                              <div className="academic-badge-container">
                                <span className="academic-score-title">التقدير الأكاديمي:</span>
                                <div className="academic-score-badge" id={`score-badge-${q.id}`}>
                                  {ratings[q.id] !== undefined ? `${ratings[q.id]} / 10 — ${getAcademicLabel(ratings[q.id])}` : 'يرجى اختيار درجة التقييم'}
                                </div>
                              </div>

                              <div className="academic-slider-container">
                                <div className="academic-slider-track">
                                  <div className="academic-slider-fill" id={`slider-fill-${q.id}`} style={{ width: `${ratings[q.id] !== undefined ? (ratings[q.id] * 10) : 0}%` }}></div>
                                </div>

                                <div className="academic-slider-steps">
                                  {Array.from({ length: 11 }).map((_, i) => {
                                    const isSelected = ratings[q.id] === i;
                                    const leftPos = i * 10;
                                    return (
                                      <button 
                                        key={i}
                                        className={`step-node ${isSelected ? 'selected' : ''}`} 
                                        style={{ left: `${leftPos}%` }} 
                                        onClick={() => rateQuestion(q.id, i)}
                                        title={`تقييم بـ ${i} درجات`}
                                      >
                                        <span className="step-number">{i}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="academic-milestones">
                                <span className="milestone milestone-low">تأسيس وتركيز مكثف (0-2)</span>
                                <span className="milestone milestone-mid">مقبول إلى جيد (3-6)</span>
                                <span className="milestone milestone-high">ممتاز ومتمكن (7-10)</span>
                              </div>
                            </div>

                            {/* Mastery Buttons */}
                            <div className="mastery-section">
                              <h4 className="mastery-title">تصنيف مستوى تمكنك من مهارة السؤال:</h4>
                              <div className="mastery-buttons">
                                <button 
                                  className={`btn-mastery ${mastery[q.id] === 'high' ? 'selected-high' : ''}`} 
                                  onClick={() => setMasteryStatus(q.id, 'high')}
                                >
                                  متمكن من السؤال
                                </button>
                                <button 
                                  className={`btn-mastery ${mastery[q.id] === 'mid' ? 'selected-mid' : ''}`} 
                                  onClick={() => setMasteryStatus(q.id, 'mid')}
                                >
                                  أحتاج إلى مراجعة الموضوع
                                </button>
                                <button 
                                  className={`btn-mastery ${mastery[q.id] === 'low' ? 'selected-low' : ''}`} 
                                  onClick={() => setMasteryStatus(q.id, 'low')}
                                >
                                  غير متمكن
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* 5. Bottom Pagination / Fast Access Access Panel */}
            <div className="bottom-pagination-container">
              <div className="pagination-header">
                <span className="pagination-title">
                  <LayoutGrid className="w-[18px] h-[18px] ml-1 text-purple-600 inline-block" />
                  الوصول السريع للأسئلة:
                </span>
                <div className="pagination-legend">
                  <span className="legend-item"><span className="legend-dot unanswered"></span>غير مُجاب</span>
                  <span className="legend-item"><span className="legend-dot answered"></span>مُجاب</span>
                  <span className="legend-item"><span className="legend-dot active"></span>السؤال الحالي</span>
                </div>
              </div>

              <div className="relative flex items-center gap-2 mt-4" dir="rtl">
                <button 
                  className="w-8 h-8 rounded-full border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-primary)] flex items-center justify-center hover:bg-[var(--color-accent-bg)] transition-all shrink-0 cursor-pointer shadow-sm"
                  onClick={() => scrollRail("right", "bottom-pagination-list")}
                  title="السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div 
                  className="pagination-list flex-1 flex gap-2 overflow-x-auto py-1 scroll-smooth" 
                  id="bottom-pagination-list"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {filtered.map((q) => {
                    const originalIdx = QUESTIONS_DATA.findIndex(item => item.id === q.id);
                    const originalNum = originalIdx + 1;
                    const isCurrent = state.currentIndex === originalIdx;
                    const isAnswered = !!answers[q.id] && answers[q.id].trim().length > 0;

                    return (
                      <button 
                        key={q.id}
                        className={`pagination-item-btn ${isCurrent ? 'active' : ''} ${isAnswered ? 'answered' : 'unanswered'}`}
                        onClick={() => setState(prev => ({ ...prev, currentIndex: originalIdx }))}
                        title={`سؤال ${originalNum}: ${isAnswered ? 'مُجاب' : 'غير مُجاب'}`}
                      >
                        <span className="btn-num">{originalNum}</span>
                        {isAnswered ? (
                          <span className="status-indicator-badge answered-badge">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        ) : (
                          <span className="status-indicator-badge unanswered-badge"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button 
                  className="w-8 h-8 rounded-full border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-primary)] flex items-center justify-center hover:bg-[var(--color-accent-bg)] transition-all shrink-0 cursor-pointer shadow-sm"
                  onClick={() => scrollRail("left", "bottom-pagination-list")}
                  title="التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 6. Navigation Buttons */}
            <div className="bottom-nav">
              <button 
                className="btn btn-secondary" 
                id="btn-prev-q"
                disabled={filtered.length === 0 || filteredIdx <= 0}
                onClick={() => {
                  if (filteredIdx > 0) {
                    const targetQ = filtered[filteredIdx - 1];
                    const origIndex = QUESTIONS_DATA.findIndex(q => q.id === targetQ.id);
                    if (origIndex !== -1) {
                      setState(prev => ({ ...prev, currentIndex: origIndex }));
                    }
                  }
                }}
              >
                <ArrowRight className="w-5 h-5 inline-block" />
                السؤال السابق
              </button>

              <button className="btn btn-primary" id="btn-finish-practice" onClick={() => navigateTo("results")}>
                إنهاء التدريب وعرض النتيجة
              </button>

              <button 
                className="btn btn-secondary" 
                id="btn-next-q"
                disabled={filtered.length === 0 || filteredIdx === -1 || filteredIdx >= filtered.length - 1}
                onClick={() => {
                  if (filteredIdx < filtered.length - 1) {
                    const targetQ = filtered[filteredIdx + 1];
                    const origIndex = QUESTIONS_DATA.findIndex(q => q.id === targetQ.id);
                    if (origIndex !== -1) {
                      setState(prev => ({ ...prev, currentIndex: origIndex }));
                    }
                  }
                }}
              >
                السؤال التالي
                <ArrowLeft className="w-5 h-5 inline-block" />
              </button>
            </div>
          </div>
        )}

        {/* ==============================================
            C. RESULTS SCREEN VIEW
            ============================================== */}
        {state.currentScreen === "results" && (
          <div className="results-screen">
            <h2 className="results-title">تقرير الأداء والتقييم الذاتي</h2>
            
            <div className="score-circle-container">
              <div className="score-circle">
                <span className="score-value">{totalScore}/{maxScore}</span>
                <span className="score-label">النسبة المئوية: {percentage}%</span>
              </div>
            </div>

            {/* Dynamic Badge Display strictly matching logic */}
            {answeredCount === totalQuestions ? (
              (() => {
                let badgeImg = "";
                let badgeTitle = "";
                let badgeColorClass = "";
                let badgeDesc = "";

                if (percentage >= 90) {
                  badgeImg = "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=200";
                  badgeTitle = "وسام التميز الأكاديمي الذهبي";
                  badgeColorClass = "badge-gold";
                  badgeDesc = "ألف مبروك! لقد أتممت حل جميع الأسئلة وحققت مستوى تمكن استثنائي باهر (90% فما فوق). أنت بطل حقيقي وقائد متميز في قواعد اللغة العربية!";
                } else if (percentage >= 70) {
                  badgeImg = "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=200";
                  badgeTitle = "وسام الإبداع اللغوي الفضي";
                  badgeColorClass = "badge-silver";
                  badgeDesc = "أداء ممتاز جداً! أتممت حل جميع الأسئلة بمهارة عالية ودقة ممتازة (70% - 89%). واصل هذا التميز اللغوي الرائع لتعتلي الصدارة دائماً!";
                } else {
                  badgeImg = "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=200";
                  badgeTitle = "وسام المثابرة والاجتهاد البرونزي";
                  badgeColorClass = "badge-bronze";
                  badgeDesc = "أحسنت صنعاً! لقد أثبتّ التزامك التام وحللت جميع أسئلة الوحدة بجد واجتهاد. استمر في المراجعة والتدرب لتطوير نقاط تمكنك وستصل للذهبي قريباً!";
                }

                return (
                  <div className={`achievement-badge-card ${badgeColorClass}`}>
                    <div className="badge-ribbon">وسام الإنجاز والتمكن</div>
                    <div className="badge-image-container">
                      <img 
                        src={badgeImg} 
                        alt={badgeTitle} 
                        className="badge-glowing-image" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // Beautiful SVG award medal fallback
                          (e.target as HTMLImageElement).style.display = "none";
                          const container = (e.target as HTMLImageElement).parentElement;
                          if (container && !container.querySelector(".svg-award-fallback")) {
                            const svgDiv = document.createElement("div");
                            svgDiv.className = "svg-award-fallback w-full h-full rounded-full flex items-center justify-center text-amber-500 fill-amber-500";
                            svgDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
                            container.appendChild(svgDiv);
                          }
                        }}
                      />
                    </div>
                    <h3 className="badge-card-title">{badgeTitle}</h3>
                    <p className="badge-card-desc">{badgeDesc}</p>
                  </div>
                );
              })()
            ) : (
              <div className="achievement-badge-card badge-locked">
                <div className="badge-image-container">
                  <Lock className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="badge-card-title">أوسمة التمكن مغلقة</h3>
                <p className="badge-card-desc">أكمل حل جميع الأسئلة ({answeredCount} من أصل {totalQuestions}) لتفتح وسام التمكن والتميز وتزين به سجل إنجازاتك في اللغة العربية!</p>
              </div>
            )}

            {/* Recharts style SVG Chart */}
            <div className="recharts-wrapper" style={{ direction: "ltr", position: "relative", width: "100%", maxWidth: "480px", margin: "1.5rem auto", padding: "1.25rem", background: "var(--color-card-bg)", border: "2px solid var(--color-border)", borderRadius: "20px", boxShadow: "var(--shadow-md)" }}>
              <h4 style={{ textAlign: "right", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", direction: "rtl" }}>
                <span>📊 توزيع مستويات التمكن الأكاديمي</span>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: "normal" }}>(تقييم تفاعلي)</span>
              </h4>
              
              <svg viewBox="0 0 450 250" width="100%" height="100%" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity="0.9"/>
                    <stop offset="95%" stopColor="#047857" stopOpacity="0.9"/>
                  </linearGradient>
                  <linearGradient id="colorMid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity="0.9"/>
                    <stop offset="95%" stopColor="#B45309" stopOpacity="0.9"/>
                  </linearGradient>
                  <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity="0.9"/>
                    <stop offset="95%" stopColor="#B91C1C" stopOpacity="0.9"/>
                  </linearGradient>
                </defs>

                {/* Guidelines */}
                <line x1="50" y1="190" x2="400" y2="190" stroke="var(--color-border)" strokeWidth="1.5" />
                <line x1="50" y1="143" x2="400" y2="143" stroke="var(--color-border)" strokeDasharray="3 3" opacity="0.5" />
                <line x1="50" y1="96" x2="400" y2="96" stroke="var(--color-border)" strokeDasharray="3 3" opacity="0.5" />
                <line x1="50" y1="50" x2="400" y2="50" stroke="var(--color-border)" strokeDasharray="3 3" opacity="0.5" />

                {/* Y ticks numbers */}
                <text x="35" y="194" fill="var(--color-text-muted)" fontFamily="var(--font-sans)" fontSize="11" textAnchor="end" fontWeight="600">0</text>
                <text x="35" y="147" fill="var(--color-text-muted)" fontFamily="var(--font-sans)" fontSize="11" textAnchor="end" fontWeight="600">{Math.round(Math.max(masteryHigh, masteryMid, masteryLow, 4) * 0.33)}</text>
                <text x="35" y="100" fill="var(--color-text-muted)" fontFamily="var(--font-sans)" fontSize="11" textAnchor="end" fontWeight="600">{Math.round(Math.max(masteryHigh, masteryMid, masteryLow, 4) * 0.67)}</text>
                <text x="35" y="54" fill="var(--color-text-muted)" fontFamily="var(--font-sans)" fontSize="11" textAnchor="end" fontWeight="600">{Math.max(masteryHigh, masteryMid, masteryLow, 4)}</text>

                {/* High Mastery Bar */}
                {(() => {
                  const maxVal = Math.max(masteryHigh, masteryMid, masteryLow, 4);
                  const hHigh = (masteryHigh / maxVal) * 140;
                  const yHigh = 190 - hHigh;
                  return (
                    <g className="chart-bar-group" style={{ cursor: "pointer" }} onMouseEnter={() => setHoveredChartBar(1)} onMouseLeave={() => setHoveredChartBar(null)}>
                      <rect className="chart-bar" x="90" y={yHigh} width="45" height={hHigh || 2} rx="6" fill="url(#colorHigh)" />
                      <text x="112.5" y={yHigh - 8} fill="#10B981" fontFamily="var(--font-sans)" fontSize="12" fontWeight="800" textAnchor="middle">{masteryHigh}</text>
                      {hoveredChartBar === 1 && (
                        <g className="chart-tooltip" style={{ pointerEvents: "none" }}>
                          <rect x="72.5" y={yHigh - 45} width="80" height="30" rx="6" fill="var(--madrasati-dark-ink)" opacity="0.95" />
                          <text x="112.5" y={yHigh - 26} fill="white" fontFamily="var(--font-sans)" fontSize="11" fontWeight="bold" textAnchor="middle">متمكن: {masteryHigh}</text>
                        </g>
                      )}
                    </g>
                  );
                })()}

                {/* Mid Mastery Bar */}
                {(() => {
                  const maxVal = Math.max(masteryHigh, masteryMid, masteryLow, 4);
                  const hMid = (masteryMid / maxVal) * 140;
                  const yMid = 190 - hMid;
                  return (
                    <g className="chart-bar-group" style={{ cursor: "pointer" }} onMouseEnter={() => setHoveredChartBar(2)} onMouseLeave={() => setHoveredChartBar(null)}>
                      <rect className="chart-bar" x="202.5" y={yMid} width="45" height={hMid || 2} rx="6" fill="url(#colorMid)" />
                      <text x="225" y={yMid - 8} fill="#F59E0B" fontFamily="var(--font-sans)" fontSize="12" fontWeight="800" textAnchor="middle">{masteryMid}</text>
                      {hoveredChartBar === 2 && (
                        <g className="chart-tooltip" style={{ pointerEvents: "none" }}>
                          <rect x="180" y={yMid - 45} width="90" height="30" rx="6" fill="var(--madrasati-dark-ink)" opacity="0.95" />
                          <text x="225" y={yMid - 26} fill="white" fontFamily="var(--font-sans)" fontSize="10" fontWeight="bold" textAnchor="middle">مراجعة: {masteryMid}</text>
                        </g>
                      )}
                    </g>
                  );
                })()}

                {/* Low Mastery Bar */}
                {(() => {
                  const maxVal = Math.max(masteryHigh, masteryMid, masteryLow, 4);
                  const hLow = (masteryLow / maxVal) * 140;
                  const yLow = 190 - hLow;
                  return (
                    <g className="chart-bar-group" style={{ cursor: "pointer" }} onMouseEnter={() => setHoveredChartBar(3)} onMouseLeave={() => setHoveredChartBar(null)}>
                      <rect className="chart-bar" x="315" y={yLow} width="45" height={hLow || 2} rx="6" fill="url(#colorLow)" />
                      <text x="337.5" y={yLow - 8} fill="#EF4444" fontFamily="var(--font-sans)" fontSize="12" fontWeight="800" textAnchor="middle">{masteryLow}</text>
                      {hoveredChartBar === 3 && (
                        <g className="chart-tooltip" style={{ pointerEvents: "none" }}>
                          <rect x="292.5" y={yLow - 45} width="90" height="30" rx="6" fill="var(--madrasati-dark-ink)" opacity="0.95" />
                          <text x="337.5" y={yLow - 26} fill="white" fontFamily="var(--font-sans)" fontSize="10" fontWeight="bold" textAnchor="middle">غير متمكن: {masteryLow}</text>
                        </g>
                      )}
                    </g>
                  );
                })()}

                {/* X labels */}
                <text x="112.5" y="212" fill="var(--color-text-main)" fontFamily="var(--font-sans)" fontSize="11" fontWeight="bold" textAnchor="middle">متمكن</text>
                <text x="225" y="212" fill="var(--color-text-main)" fontFamily="var(--font-sans)" fontSize="11" fontWeight="bold" textAnchor="middle">يحتاج مراجعة</text>
                <text x="337.5" y="212" fill="var(--color-text-main)" fontFamily="var(--font-sans)" fontSize="11" fontWeight="bold" textAnchor="middle">غير متمكن</text>
              </svg>

              {/* Legend */}
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1rem", fontFamily: "var(--font-sans)", fontSize: "0.8rem", direction: "rtl", fontWeight: 700 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "linear-gradient(#10B981, #047857)", display: "inline-block" }}></span>
                  متمكن
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "linear-gradient(#F59E0B, #B45309)", display: "inline-block" }}></span>
                  أحتاج مراجعة
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "linear-gradient(#EF4444, #B91C1C)", display: "inline-block" }}></span>
                  غير متمكن
                </span>
              </div>
            </div>

            {/* Results Grid Stats */}
            <div className="results-grid">
              <div className="stat-item">
                <span className="stat-label">عدد الأسئلة الكلي:</span>
                <span className="stat-val">{totalQuestions}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">الأسئلة التي تمت إجابتها:</span>
                <span className="stat-val">{answeredCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">الإجابات النموذجية المعروضة:</span>
                <span className="stat-val">{Object.keys(shownAnswers).length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">الأسئلة التي تم تقييمها:</span>
                <span className="stat-val">{ratedCount}</span>
              </div>
            </div>

            {/* Mastery Summaries */}
            <div className="mastery-summary">
              <h3 className="mastery-summary-title">ملخص مستوى التمكن:</h3>
              <div className="mastery-summary-grid">
                <div className="mastery-sum-card high">
                  <span className="mastery-sum-count">{masteryHigh}</span>
                  <span className="mastery-sum-label">متمكن من السؤال</span>
                </div>
                <div className="mastery-sum-card mid">
                  <span className="mastery-sum-count">{masteryMid}</span>
                  <span className="mastery-sum-label">أحتاج إلى مراجعة الموضوع</span>
                </div>
                <div className="mastery-sum-card low">
                  <span className="mastery-sum-count">{masteryLow}</span>
                  <span className="mastery-sum-label">غير متمكن</span>
                </div>
              </div>
            </div>

            {/* Unrated alert list strictly matching app.js */}
            {unratedQuestions.length > 0 && (
              <div className="unrated-list">
                <div className="unrated-title">تنبيه: لديك أسئلة تم عرض إجابتها النموذجية ولكن لم تقيمها بعد:</div>
                <div className="unrated-items">
                  {unratedQuestions.map(q => (
                    <span key={q.id} className="unrated-link" onClick={() => jumpToQuestion(q.num - 1)}>
                      سؤال {q.num}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="results-actions">
              <button className="btn btn-primary" id="btn-return-practice" onClick={() => navigateTo("practice")}>
                <Award className="w-[18px] h-[18px] ml-1 inline-block" />
                العودة لتعديل التقييمات
              </button>
              <button className="btn btn-secondary" id="btn-results-reset" onClick={() => setShowResetModal(true)}>
                <RotateCcw className="w-[18px] h-[18px] ml-1 inline-block" />
                بدء محاولة جديدة تماماً
              </button>
            </div>
          </div>
        )}

      </main>

      {/* 3. Reset Confirmation Modal */}
      {showResetModal && (
        <div className="modal" style={{ display: "flex" }}>
          <div className="modal-content">
            <h3 className="modal-title">تنبيه تأكيد إعادة المحاولة</h3>
            <p className="modal-text">هل أنت متأكد من رغبتك في حذف جميع إجاباتك السابقة، التقييمات الذاتية، ومستويات تمكنك وبدء محاولة نظيفة من الصفر؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ backgroundColor: "#991b1b" }} onClick={performReset}>نعم، ابدأ محاولة جديدة</button>
              <button className="btn btn-secondary" onClick={() => setShowResetModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Footer */}
      <footer>
        <p>© ٢٠٢٦ تطبيق مدرسي التعليمي — جميع الأسئلة والأجوبة مأخوذة بأمانة تامة من المصادر الرسمية لوزارة التربية العراقية.</p>
      </footer>

    </div>
  );
}

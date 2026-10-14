import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getVersionById } from './bibleVersions';
import { useBibleBrowser } from './hooks/useBibleBrowser';
import useTheme from './hooks/useTheme';
import { bibleBooks } from './utils/bibleBooks';
import { bibleStructure } from './utils/bibleChapters';
import { bibleVerses } from './utils/bibleVerses';

import VersionSelector from './components/VersionSelector';
import SearchBar from './components/SearchBar';
import NavBar from './components/NavBar';
import BookDrawer from './components/BookDrawer';
import VerseDisplay from './components/VerseDisplay';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';
import { useAuth } from './context/AuthContext';

// ─── Persistence helpers ──────────────────────────────────────────────────────
const LS_KEY = 'bb_state';
function loadState() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}
function saveState(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── Book name fuzzy matcher (robust version) ───────────────────────────────
const commonAbbr = {
  pp: "Philippians", phl: "Philemon", jd: "Jude", jn: "John",
  mt: "Matthew", mk: "Mark", lk: "Luke", ps: "Psalm", psa: "Psalm",
  "1cor": "1 Corinthians", "2cor": "2 Corinthians",
  "1chr": "1 Chronicles", "2chr": "2 Chronicles",
  "1pt": "1 Peter", "2pt": "2 Peter",
  "1jn": "1 John", "2jn": "2 John", "3jn": "3 John",
  gen: "Genesis", exo: "Exodus", ex: "Exodus", lev: "Leviticus",
  num: "Numbers", deut: "Deuteronomy", deu: "Deuteronomy",
  josh: "Joshua", jos: "Joshua", judg: "Judges", jdg: "Judges",
  "1sam": "1 Samuel", "2sam": "2 Samuel",
  "1kgs": "1 Kings", "2kgs": "2 Kings", "1ki": "1 Kings", "2ki": "2 Kings",
  ezr: "Ezra", neh: "Nehemiah", est: "Esther", esth: "Esther",
  prov: "Proverbs", pro: "Proverbs", eccl: "Ecclesiastes", ecc: "Ecclesiastes",
  song: "Song of Songs", sos: "Song of Songs",
  isa: "Isaiah", jer: "Jeremiah", lam: "Lamentations", ezek: "Ezekiel", eze: "Ezekiel",
  dan: "Daniel", hos: "Hosea", joel: "Joel", amos: "Amos",
  obad: "Obadiah", jon: "Jonah", mic: "Micah",
  nah: "Nahum", hab: "Habakkuk", zeph: "Zephaniah", zep: "Zephaniah",
  hag: "Haggai", zech: "Zechariah", zec: "Zechariah", mal: "Malachi",
  acts: "Acts", act: "Acts", rom: "Romans",
  gal: "Galatians", eph: "Ephesians", php: "Philippians",
  col: "Colossians", "1thess": "1 Thessalonians", "1th": "1 Thessalonians",
  "2thess": "2 Thessalonians", "2th": "2 Thessalonians",
  "1tim": "1 Timothy", "1ti": "1 Timothy", "2tim": "2 Timothy", "2ti": "2 Timothy",
  tit: "Titus", philem: "Philemon", phm: "Philemon",
  heb: "Hebrews", jas: "James", jam: "James",
  "1pe": "1 Peter", "2pe": "2 Peter",
  jude: "Jude", rev: "Revelation", reve: "Revelation"
};

function cleanBookName(str) {
  return String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findBookByQuery(input) {
  if (!input) return null;
  const raw = String(input).trim().toLowerCase();
  const key = raw.replace(/[^a-z0-9]/g, "");

  if (commonAbbr[key]) return commonAbbr[key];

  const books = bibleBooks.map((b) => ({ name: b.english, clean: cleanBookName(b.english), tamil: b.tamil }));
  const cleaned = cleanBookName(raw);

  const exact = books.find((b) => b.clean === cleaned || b.tamil === raw);
  if (exact) return exact.name;

  if (cleaned.length < 2) return null;

  const starts = books.filter((b) => b.clean.startsWith(cleaned));
  if (starts.length === 1) return starts[0].name;
  if (starts.length > 1) {
    const fullWord = starts.find((s) => s.clean === cleaned);
    if (fullWord) return fullWord.name;
    return starts[0].name;
  }

  const numMatch = cleaned.match(/^([1-3])(.+)$/);
  if (numMatch) {
    const num = numMatch[1];
    const rest = cleanBookName(numMatch[2]);
    const candidate = books.find((b) => b.clean === num + rest);
    if (candidate) return candidate.name;
    const fallback = books.find((b) => b.clean.startsWith(num) && b.clean.includes(rest));
    if (fallback) return fallback.name;
  }

  const substr = books.find((b) => b.clean.includes(cleaned) && cleaned.length >= 3);
  if (substr) return substr.name;

  return null;
}

// ─── Reference parser (robust version) ────────────────────────────────────────
// Parses: "John 3:16", "Psalm 23", "gen316", "1 Cor 13:4", "1sam3 4"
function parseSearchQuery(raw) {
  if (!raw || !String(raw).trim()) return null;
  let t = String(raw).trim().toLowerCase();

  t = t.replace(/[^\w\s:]/g, " ").replace(/\s+/g, " ").trim();
  let m;
  let bookRaw = null, chapter = 1, verse = null;

  if ((m = t.match(/^([1-3])\s*([a-z]+)\s*(\d+)\s*:\s*(\d+)$/i))) {
    bookRaw = `${m[1]}${m[2]}`; chapter = Number(m[3]); verse = Number(m[4]);
  } else if ((m = t.match(/^([1-3])\s*([a-z]+)\s+(\d+)\s+(\d+)$/i))) {
    bookRaw = `${m[1]}${m[2]}`; chapter = Number(m[3]); verse = Number(m[4]);
  } else if ((m = t.match(/^([1-3])\s*([a-z]+)\s*(\d+)\s+(\d+)$/i))) {
    bookRaw = `${m[1]}${m[2]}`; chapter = Number(m[3]); verse = Number(m[4]);
  } else if ((m = t.match(/^([a-z]+)\s*(\d+)\s*:\s*(\d+)$/i))) {
    bookRaw = m[1]; chapter = Number(m[2]); verse = Number(m[3]);
  } else if ((m = t.match(/^([a-z]+)\s+(\d+)\s+(\d+)$/i))) {
    bookRaw = m[1]; chapter = Number(m[2]); verse = Number(m[3]);
  } else if ((m = t.match(/^([1-3]?[a-z]+)(\d{1,})$/i))) {
    bookRaw = m[1];
    const nums = m[2];
    if (nums.length === 1) { chapter = Number(nums); }
    else if (nums.length === 2) { chapter = Number(nums[0]); verse = Number(nums.slice(1)); }
    else { chapter = Number(nums.slice(0, -2)); verse = Number(nums.slice(-2)); }
  } else if ((m = t.match(/^([1-3])\s*([a-z]+)\s+(\d+)$/i))) {
    bookRaw = `${m[1]}${m[2]}`; chapter = Number(m[3]);
  } else if ((m = t.match(/^([a-z]+)\s+(\d+)$/i))) {
    bookRaw = m[1]; chapter = Number(m[2]);
  } else {
    const nums = t.match(/(\d+)/g);
    if (nums && nums.length >= 1) {
      if (nums.length === 1) {
        bookRaw = t.replace(nums[0], "").trim(); chapter = Number(nums[0]);
      } else {
        verse = Number(nums.pop()); chapter = Number(nums.pop());
        bookRaw = t.replace(/\d/g, "").trim();
      }
    } else {
      bookRaw = t;
    }
  }

  const book = findBookByQuery(bookRaw);
  if (!book) return null;

  return { book, chapter, verse };
}

// ─── Mobile detection hook ────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

// ─── OT / NT split ───────────────────────────────────────────────────────────
const OT_COUNT = 39;
const allBooks = bibleBooks.map((b) => b.english);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function BibleBrowserApp() {
  const saved = useMemo(() => loadState(), []);
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  const [versionId, setVersionId] = useState(() => {
    if (saved.versionId === 'tamil-bsi') return 'tamil';
    return saved.versionId || 'tamil';
  });
  const [book, setBook]         = useState(saved.book || 'John');
  const [chapter, setChapter]   = useState(saved.chapter || 1);
  const [highlightVerse, setHighlightVerse] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const { user, logout } = useAuth();

  const [bookDrawer, setBookDrawer] = useState(false);

  const version = useMemo(() => getVersionById(versionId), [versionId]);
  const { loading, error, getChapterVerses } = useBibleBrowser(version);

  // Compute verses for the current book+chapter
  const verses = useMemo(
    () => getChapterVerses(book, chapter),
    [getChapterVerses, book, chapter]
  );

  // Persist state to localStorage
  useEffect(() => {
    saveState({ versionId, book, chapter });
  }, [versionId, book, chapter]);

  // Auto-clear toast
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);



  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleVersionSelect = (id) => {
    setVersionId(id);
    setHighlightVerse(null);
  };

  const handleBookSelect = (b, ch = 1) => {
    setBook(b);
    setChapter(ch);
    setHighlightVerse(null);
  };

  const handleChapterSelect = (ch) => {
    setChapter(ch);
    setHighlightVerse(null);
  };

  const handlePrev = () => {
    if (chapter > 1) {
      setChapter((c) => c - 1);
    } else {
      // Go to previous book, last chapter
      const idx = allBooks.indexOf(book);
      if (idx > 0) {
        const prevBook = allBooks[idx - 1];
        const prevTotal = bibleStructure[prevBook] || 1;
        setBook(prevBook);
        setChapter(prevTotal);
      }
    }
    setHighlightVerse(null);
  };

  const handleNext = () => {
    const total = bibleStructure[book] || 1;
    if (chapter < total) {
      setChapter((c) => c + 1);
    } else {
      // Go to next book, chapter 1
      const idx = allBooks.indexOf(book);
      if (idx < allBooks.length - 1) {
        setBook(allBooks[idx + 1]);
        setChapter(1);
      }
    }
    setHighlightVerse(null);
  };

  const handleSearch = useCallback((query) => {
    const parsed = parseSearchQuery(query);
    if (!parsed) {
      setToastMsg(`Could not find "${query}". Try "John 3:16" or "Psalm 23".`);
      return;
    }

    const totalChapters = bibleStructure[parsed.book] || 1;
    
    // Check chapter validity
    if (parsed.chapter > totalChapters) {
      if (totalChapters === 1 && !parsed.verse) {
        // Single chapter book (like Jude), where users type "Jude 5" meaning verse 5. Let it pass.
      } else {
        setToastMsg(`${parsed.book} only has ${totalChapters} chapter(s).`);
        return;
      }
    }

    let finalChapter = parsed.chapter;
    let finalVerse   = parsed.verse;

    // For single-chapter books (Jude, Obadiah, etc.)
    if (totalChapters === 1 && parsed.chapter > 1 && !parsed.verse) {
      finalChapter = 1;
      finalVerse   = parsed.chapter;
    }

    // Clamp and check verse validity
    if (finalVerse) {
      const maxVerse = (bibleVerses[parsed.book] || {})[finalChapter] || 999;
      if (finalVerse > maxVerse) {
        setToastMsg(`${parsed.book} ${finalChapter} only has ${maxVerse} verse(s).`);
        return;
      }
      finalVerse = Math.max(1, finalVerse);
    }

    setBook(parsed.book);
    setChapter(Math.max(1, finalChapter));
    setHighlightVerse(finalVerse || null);

    // Close drawers if open
    setBookDrawer(false);
  }, []);

  // isTamil — used for book label language
  const isTamil = version.lang === 'ta';
  const bookDisplay = isTamil ? (bibleBooks.find((b) => b.english === book)?.tamil || book) : book;

  // Desktop book list section labels + items
  const otBooks = bibleBooks.slice(0, OT_COUNT);
  const ntBooks = bibleBooks.slice(OT_COUNT);

  const renderSidebarBook = (b) => {
    const isActive = b.english === book;
    const idx = bibleBooks.indexOf(b) + 1;
    return (
      <div
        key={b.english}
        ref={isActive ? sidebarSelectedRef : null}
        className={`bb-book-item${isActive ? ' active' : ''}`}
        onClick={() => { setBook(b.english); setChapter(1); setHighlightVerse(null); }}
      >
        <span className="bb-book-num">{idx}</span>
        <span>{isTamil ? b.tamil : b.english}</span>
      </div>
    );
  };

  const sidebarSelectedRef = useRef(null);
  useEffect(() => {
    sidebarSelectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [book]);

  const chapterScrollRef = useRef(null);
  useEffect(() => {
    if (chapterScrollRef.current) {
      const activeEl = chapterScrollRef.current.querySelector('.bb-ch-num.active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [book, chapter]);

  return (
    <div className={`bb-app ${theme} ${isTamil ? 'lang-ta' : 'lang-en'}`}>
      {/* ── Header (Row 1: Logo, App Name, Theme, User ID) ────────────────── */}
      <header className="bb-header">
        <span className="bb-logo">
          <img src="/icon.png" alt="logo" className="bb-logo-img" />
          <span className="bb-logo-text">Scripture Screen</span>
        </span>

        <div className="bb-header-nav">
          <button className="bb-theme-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {user ? (
            <div className="bb-user-wrap">
              <div
                className="bb-user-pill"
                title="Click to view profile"
                onClick={() => setProfileModalOpen(true)}
                role="button"
                tabIndex={0}
              >
                <span className="bb-user-avatar">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </span>
                <span className="bb-user-name">
                  {user.displayName || user.email?.split('@')[0] || 'User'}
                </span>
              </div>
              <button 
                className="bb-icon-btn" 
                title="Sign Out" 
                onClick={() => setLogoutConfirm(true)}
                aria-label="Sign Out"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          ) : (
            <button className="bb-signin-btn" title="Sign In" onClick={() => setAuthModalOpen(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Mobile Rows (Row 2: Search + Version, Row 3: Book + Chapter) ───── */}
      {isMobile && (
        <div className="bb-mobile-controls-wrap">
          {/* Row 2: Search bar and Language/Version selector */}
          <div className="bb-mobile-search-row">
            <div className="bb-mobile-search-cell">
              <SearchBar onSearch={handleSearch} placeholder="Search e.g. jer 33 3" />
            </div>
            <div className="bb-mobile-version-cell">
              <VersionSelector versionId={versionId} onSelect={handleVersionSelect} isMobile={true} />
            </div>
          </div>

          {/* Row 3: Bible books selector and chapter prev-next button */}
          <NavBar
            book={bookDisplay}
            chapter={chapter}
            onOpenBooks={() => setBookDrawer(true)}
            onPrev={handlePrev}
            onNext={handleNext}
            isMobile={true}
          />
        </div>
      )}

      {/* ── Layout ─────────────────────────────────────────────────────────── */}
      <div className="bb-layout">

        {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
        <aside className="bb-sidebar">
          {/* Search */}
          <div className="bb-sidebar-search">
            <SearchBar onSearch={handleSearch} placeholder="Search e.g. Psa 133 1" />
          </div>

          {/* Version selector */}
          <div className="bb-sidebar-versions">
            <VersionSelector versionId={versionId} onSelect={handleVersionSelect} />
          </div>

          {/* Book list */}
          <div className="bb-sidebar-books">
            <div className="bb-book-section-label">Old Testament</div>
            {otBooks.map(renderSidebarBook)}
            <div className="bb-book-section-label">New Testament</div>
            {ntBooks.map(renderSidebarBook)}
            <div style={{ height: 16 }} />
          </div>
        </aside>

        {/* ── Main Panel ──────────────────────────────────────────────────── */}
        <main className="bb-main">

          {/* Desktop: chapter grid inline */}
          {!isMobile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 14px',
              borderBottom: '1px solid var(--bb-border)',
              flexShrink: 0,
            }}>
              {/* Navigation Arrows */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginRight: 12 }}>
                <button
                  className="bb-nav-arrow"
                  onClick={handlePrev}
                  title="Previous chapter"
                >
                  ‹
                </button>
                <button
                  className="bb-nav-arrow"
                  onClick={handleNext}
                  title="Next chapter"
                >
                  ›
                </button>
              </div>

              {/* Chapter Grid */}
              <div ref={chapterScrollRef} className="bb-desktop-ch-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: 1, paddingBottom: 4 }}>
                {Array.from({ length: bibleStructure[book] || 1 }, (_, i) => i + 1).map((ch) => (
                  <div
                    key={ch}
                    className={`bb-ch-num${chapter === ch ? ' active' : ''}`}
                    style={{ minWidth: 40, width: 40, height: 36, borderRadius: 8, fontSize: 13, flexShrink: 0 }}
                    onClick={() => handleChapterSelect(ch)}
                  >
                    {ch}
                  </div>
                ))}
              </div>
            </div>
          )}

          <VerseDisplay
            verses={verses}
            book={bookDisplay}
            chapter={chapter}
            versionId={versionId}
            highlightVerse={highlightVerse}
            loading={loading}
            error={error}
            lang={version.lang}
            onToast={setToastMsg}
          />
        </main>
      </div>

      {/* Mobile Drawers ──────────────────────────────────────────────────── */}
      {bookDrawer && (
        <BookDrawer
          selectedBook={book}
          onSelect={handleBookSelect}
          onClose={() => setBookDrawer(false)}
          isTamil={isTamil}
        />
      )}

      {/* Toast ───────────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="bb-toast">
          {toastMsg}
        </div>
      )}
      
      {/* Auth Modal ──────────────────────────────────────────────────────── */}
      {authModalOpen && (
        <AuthModal 
          onClose={() => setAuthModalOpen(false)} 
          onSuccess={() => setToastMsg('Successfully logged in!')} 
          onToast={setToastMsg}
        />
      )}

      {/* User Profile Modal ────────────────────────────────────────────── */}
      {profileModalOpen && (
        <UserProfileModal
          user={user}
          onClose={() => setProfileModalOpen(false)}
          onLogout={() => {
            logout();
            setToastMsg('Logged out successfully');
          }}
          onToast={setToastMsg}
        />
      )}

      {/* Sign Out Confirmation Modal (Center View) ───────────────────────── */}
      {logoutConfirm && (
        <div className="bb-modal-overlay" onClick={() => setLogoutConfirm(false)}>
          <div
            className="bb-modal bb-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm Sign Out"
          >
            <div className="bb-modal-header">
              <h2>Sign Out</h2>
              <button className="bb-modal-close" onClick={() => setLogoutConfirm(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="bb-confirm-modal-body">
              <p className="bb-confirm-modal-text">
                Are you sure you want to sign out?
              </p>
              <div className="bb-confirm-modal-actions">
                <button
                  type="button"
                  className="bb-confirm-modal-yes"
                  onClick={() => {
                    logout();
                    setToastMsg('Logged out successfully');
                    setLogoutConfirm(false);
                  }}
                >
                  Yes, Sign Out
                </button>
                <button
                  type="button"
                  className="bb-confirm-modal-cancel"
                  onClick={() => setLogoutConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

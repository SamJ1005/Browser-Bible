
import { bibleStructure } from '../utils/bibleChapters';
import { bibleBooks } from '../utils/bibleBooks';

export default function NavBar({
  book, chapter,
  onOpenBooks,
  onPrev, onNext,
  children
}) {
  const globalIdx = bibleBooks.findIndex(b => b.english === book || b.tamil === book);
  const totalChapters = bibleStructure[book] || bibleStructure[bibleBooks[globalIdx]?.english] || 1;
  const canPrev = globalIdx > 0 || chapter > 1;
  const canNext = globalIdx > -1 && (globalIdx < bibleBooks.length - 1 || chapter < totalChapters);

  return (
    <div className="bb-nav">
      {/* Book & Chapter combined button */}
      <button className="bb-nav-book-btn" onClick={onOpenBooks} aria-label="Select Book and Chapter">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <span className="bb-nav-book-title">{book} {chapter}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Prev / Next buttons */}
      <div className="bb-nav-arrows">
        <button
          className="bb-nav-arrow"
          onClick={onPrev}
          disabled={!canPrev}
          title="Previous chapter"
          aria-label="Previous chapter"
        >
          ‹
        </button>

        <button
          className="bb-nav-arrow"
          onClick={onNext}
          disabled={!canNext}
          title="Next chapter"
          aria-label="Next chapter"
        >
          ›
        </button>
      </div>

      {children && (
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}

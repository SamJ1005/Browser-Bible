import { useEffect, useRef, useState } from 'react';
import { useIssueReports } from '../hooks/useIssueReports';
import ReportModal from './ReportModal';
import { useAuth } from '../context/AuthContext';

export default function VerseDisplay({ verses, book, chapter, versionId, highlightVerse, loading, error, lang, onToast }) {
  const highlightRef = useRef(null);
  const scrollRef = useRef(null);
  
  const { reportedVerses, addReport } = useIssueReports(book, chapter, versionId);
  const { user } = useAuth();

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportVerse, setReportVerse] = useState(null);

  const handleReportClick = (verse) => {
    if (!user) {
      onToast("Please Sign In to report an issue.");
      return;
    }
    setReportVerse(verse);
    setReportModalOpen(true);
  };

  const handleReportSubmit = async (verse, type, desc) => {
    await addReport(verse, type, desc);
    onToast(`Issue reported for ${book} ${chapter}:${verse}`);
  };

  // Scroll to top when book/chapter changes, unless a verse is highlighted
  useEffect(() => {
    if (!highlightVerse && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [book, chapter, highlightVerse]);

  // Auto-scroll to highlighted verse
  useEffect(() => {
    if (highlightVerse && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightVerse, verses]);

  if (loading) {
    return (
      <div className="bb-loading">
        <div className="bb-spinner" />
        <div style={{ fontSize: 14 }}>Loading Bible…</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          {lang === 'ta' ? 'This may take a moment for large Bible files.' : ''}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bb-loading" style={{ color: 'var(--bb-danger)' }}>
        <div className="bb-empty-icon">⚠️</div>
        <div style={{ fontSize: 14 }}>{error}</div>
      </div>
    );
  }

  if (!verses || verses.length === 0) {
    return (
      <div className="bb-empty">
        <div className="bb-empty-icon">📖</div>
        <div style={{ fontSize: 14 }}>No verses found</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          {book} Chapter {chapter}
        </div>
      </div>
    );
  }

  const isEnglish = lang === 'en';

  return (
    <div className="bb-verse-scroll" ref={scrollRef}>
      <div className="bb-chapter-title">
        {book} — Chapter {chapter}
      </div>
      <div className="bb-verse-list">
        {verses.map(({ verse, text }) => {
          const isHighlighted = highlightVerse === verse;
          const isReported = reportedVerses.includes(verse);
          
          return (
            <div
              key={verse}
              ref={isHighlighted ? highlightRef : null}
              className={`bb-verse-item ${isHighlighted ? 'highlighted' : ''} ${isReported ? 'reported' : ''}`}
            >
              <span className="bb-verse-num">{verse}</span>
              <span className={`bb-verse-text${isEnglish ? ' en' : ''}`}>
                {text}
              </span>
              {user && (
                <div className="bb-verse-actions">
                  <button className="bb-verse-flag" title="Report Issue" onClick={() => handleReportClick(verse)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                      <line x1="4" y1="22" x2="4" y2="15"></line>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {reportModalOpen && (
        <ReportModal 
          onClose={() => setReportModalOpen(false)}
          onSubmit={handleReportSubmit}
          verseNum={reportVerse}
          book={book}
          chapter={chapter}
        />
      )}
    </div>
  );
}

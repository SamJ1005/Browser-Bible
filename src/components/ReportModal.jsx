import { useState } from 'react';

export default function ReportModal({ onClose, onSubmit, verseNum, book, chapter }) {
  const [issueType, setIssueType] = useState('Typo');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit(verseNum, issueType, description);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bb-modal-overlay" onClick={onClose}>
      <div className="bb-modal" onClick={e => e.stopPropagation()}>
        <div className="bb-modal-header">
          <h2>Report Issue</h2>
          <button className="bb-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="bb-modal-body">
          <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--bb-text-2)' }}>
            Reporting issue for <strong>{book} {chapter}:{verseNum}</strong>
          </div>
          {error && <div className="bb-alert-error">{error}</div>}
          <div className="bb-form-group">
            <label>Issue Type</label>
            <select value={issueType} onChange={e => setIssueType(e.target.value)}>
              <option value="Mistake">Spelling mistake</option>
              <option value="Translation Error">Translation Error</option>
              <option value="Formatting">Formatting</option>
              <option value="Verse misorder">Verse misorder</option>
              <option value="Missing verse">Missing verse</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="bb-form-group">
            <label>Description</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              rows={4}
              placeholder="Please describe the issue (optional)..."
            />
          </div>
          <button type="submit" disabled={loading} className="bb-btn-primary">
            Submit Report
          </button>
        </form>
      </div>
    </div>
  );
}

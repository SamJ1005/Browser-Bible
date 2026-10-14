import { useState } from 'react';

export default function UserProfileModal({ user, onClose, onLogout }) {
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  if (!user) return null;

  const displayName = user.displayName || 'Reader';
  const email = user.email || 'Not provided';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bb-modal-overlay" onClick={onClose}>
      <div
        className="bb-modal bb-profile-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="User Profile"
      >
        <div className="bb-modal-header">
          <h2>User Profile</h2>
          <button className="bb-modal-close" onClick={onClose} aria-label="Close profile">
            ✕
          </button>
        </div>

        <div className="bb-profile-body">
          {/* Dummy Profile Picture */}
          <div className="bb-profile-avatar-wrap">
            <div className="bb-profile-avatar-ring">
              <div className="bb-profile-avatar-img">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="bb-profile-avatar-badge">{initial}</span>
              </div>
            </div>
            <div className="bb-profile-status-dot" title="Active Account" />
          </div>

          <div className="bb-profile-info-list">
            {/* User Name */}
            <div className="bb-profile-field">
              <span className="bb-profile-label">User Name</span>
              <span className="bb-profile-val font-bold">{displayName}</span>
            </div>

            {/* Email */}
            <div className="bb-profile-field">
              <span className="bb-profile-label">Email</span>
              <span className="bb-profile-val">{email}</span>
            </div>
          </div>

          {/* Action buttons / Confirmation */}
          <div className="bb-profile-actions">
            {confirmSignOut ? (
              <div className="bb-profile-confirm-box">
                <p className="bb-profile-confirm-text">
                  Are you sure you want to sign out?
                </p>
                <div className="bb-profile-confirm-btn-row">
                  <button
                    type="button"
                    className="bb-profile-confirm-yes"
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                  >
                    Yes, Sign Out
                  </button>
                  <button
                    type="button"
                    className="bb-profile-confirm-cancel"
                    onClick={() => setConfirmSignOut(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="bb-profile-logout-btn"
                onClick={() => setConfirmSignOut(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

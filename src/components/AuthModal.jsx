import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function AuthModal({ onClose, onSuccess, onToast }) {
  const [isLogin, setIsLogin] = useState(true);
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, logout } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Attempt to login with User_id (username)
        const userDoc = await getDoc(doc(db, 'usernames', userId));
        let loginEmail = email;
        if (userDoc.exists()) {
          loginEmail = userDoc.data().email;
        } else {
          throw new Error("User ID not found");
        }
        const userCredential = await login(loginEmail, password);
        
        // Patch missing displayName for old test accounts
        if (userCredential.user.displayName !== userId) {
          await updateProfile(userCredential.user, { displayName: userId });
          // Force page reload so the React Context perfectly catches the updated profile
          window.location.reload();
          return;
        }

        onSuccess && onSuccess();
        onClose();
      } else {
        // Sign-up
        // Check if username is already taken
        const existingDoc = await getDoc(doc(db, 'usernames', userId));
        if (existingDoc.exists()) {
          throw new Error("User ID is already taken");
        }
        
        const userCredential = await signup(email, password);
        
        // Save userId into the user's Firebase Auth profile
        await updateProfile(userCredential.user, { displayName: userId });
        
        // Save to firestore mapping (must include uid to satisfy security rules)
        await setDoc(doc(db, 'usernames', userId), { 
          email: email, 
          uid: userCredential.user.uid 
        });
        
        // Log out immediately so they have to log in manually
        await logout();
        
        onToast("Sign up successful! Please log in.");
        setIsLogin(true); // switch to login mode
        setPassword('');
      }
    } catch (err) {
      onToast(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bb-modal-overlay" onClick={onClose}>
      <div className="bb-modal" onClick={e => e.stopPropagation()}>
        <div className="bb-modal-header">
          <h2>{isLogin ? 'Sign In' : 'Sign Up'}</h2>
          <button className="bb-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="bb-modal-body">
          
          <div className="bb-form-group">
            <label>User ID</label>
            <input type="text" value={userId} onChange={e => setUserId(e.target.value)} required placeholder="Enter User ID" />
          </div>
          
          {!isLogin && (
            <div className="bb-form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" />
            </div>
          )}
          
          <div className="bb-form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Password" />
          </div>
          
          <button type="submit" disabled={loading} className="bb-btn-primary">
            {isLogin ? 'Login' : 'Create Account'}
          </button>
          
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--bb-text-3)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" className="bb-link-btn" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

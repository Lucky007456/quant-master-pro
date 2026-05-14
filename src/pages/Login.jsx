import { useState } from 'react';
import { FiUser, FiArrowRight, FiZap } from 'react-icons/fi';

export default function Login({ onLogin, loading }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      setError('Name must be at least 3 characters.');
      return;
    }
    setError('');
    try {
      await onLogin(username.trim());
    } catch (err) {
      setError('Something went wrong. Try a different name.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <FiZap className="logo-icon" style={{ color: 'var(--accent-amber)' }} />
            <h1>QuantMaster</h1>
          </div>
          <p className="login-subtitle">Enter your Scholar Name to begin.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="input-group">
            <label><FiUser /> Scholar Name</label>
            <input 
              type="text" 
              placeholder="e.g. Ramanujan" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              autoFocus
            />
          </div>

          <button className="btn btn-amber btn-lg login-btn" type="submit" disabled={loading}>
            {loading ? (
              <div className="loading-dots"><span></span><span></span><span></span></div>
            ) : (
              <>
                Enter Arena <FiArrowRight />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Your progress will be saved automatically to the cloud.</p>
        </div>
      </div>

      <div className="login-features">
        <div className="feature-item">
          <span className="feature-icon">🏅</span>
          <h3>Personal Profile</h3>
          <p>Your name, level, and badges are unique to you.</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">☁️</span>
          <h3>Cloud Sync</h3>
          <p>Login with the same name anywhere to restore progress.</p>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔥</span>
          <h3>Daily Goals</h3>
          <p>Keep your streak alive and climb the ranks.</p>
        </div>
      </div>
    </div>
  );
}

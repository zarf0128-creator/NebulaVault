import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="glass-card border-b border-white/10 rounded-none sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <svg className="h-8 w-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              <span className="text-2xl font-bold gradient-text">NebulaVault</span>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              {user ? (
                <Link to="/dashboard" className="btn-primary">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-gray-300 hover:text-white font-medium transition-colors text-sm sm:text-base">
                    Login
                  </Link>
                  <Link to="/signup" className="btn-primary">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center fade-in">
          <h1 className="hero-title font-extrabold text-white mb-6 leading-tight">
            Secure <span className="gradient-text">Zero-Knowledge</span>
            <br className="hidden sm:block" />
            Cloud Storage
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-3xl mx-auto px-4">
            Your files, encrypted in your browser. We never see your data or keys.
            True end-to-end encryption for ultimate privacy.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 px-4">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-lg px-8 py-4">
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn-primary text-lg px-8 py-4">
                  Get Started Free
                </Link>
                <Link to="/login" className="btn-secondary text-lg px-8 py-4">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="card-hover hover-lift">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="h-7 w-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h3 className="section-title font-bold text-white mb-2 text-center">
              Client-Side Encryption
            </h3>
            <p className="text-gray-400 text-center text-sm sm:text-base">
              All files encrypted in browser using AES-256-GCM before upload. 
              Your encryption keys never leave your device.
            </p>
          </div>

          <div className="card-hover hover-lift" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="h-7 w-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
            </div>
            <h3 className="section-title font-bold text-white mb-2 text-center">
              Secure Sharing
            </h3>
            <p className="text-gray-400 text-center text-sm sm:text-base">
              Share files securely with download limits and expiry times. 
              Share keys never stored on servers.
            </p>
          </div>

          <div className="card-hover hover-lift" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="h-7 w-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <h3 className="section-title font-bold text-white mb-2 text-center">
              Integrity Verification
            </h3>
            <p className="text-gray-400 text-center text-sm sm:text-base">
              SHA-256 hashing ensures files haven't been tampered with. 
              Verify integrity on every download.
            </p>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-16 sm:mt-24 glass-card p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">
            Built with Security in Mind
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Encryption Standard</h3>
              <ul className="space-y-2 text-gray-300">
                {['AES-256-GCM authenticated encryption', 'PBKDF2 key derivation (100,000 iterations)', 'SHA-256 integrity verification', 'Unique encryption key per file'].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <svg className="h-6 w-6 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Zero-Knowledge Architecture</h3>
              <ul className="space-y-2 text-gray-300">
                {['All encryption happens in your browser', 'Server never sees plaintext files', 'Server never sees encryption keys', 'Only encrypted data stored'].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <svg className="h-6 w-6 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="glass-card border-t border-white/10 rounded-none mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <svg className="h-8 w-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              <span className="ml-2 text-2xl font-bold gradient-text">NebulaVault</span>
            </div>
            <p className="text-gray-400 mb-2 text-sm sm:text-base">
              Zero-Knowledge Encrypted Cloud Storage
            </p>
            <p className="text-gray-500 text-xs sm:text-sm">
              © {new Date().getFullYear()} NebulaVault. Your files, encrypted. Your keys, never shared.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

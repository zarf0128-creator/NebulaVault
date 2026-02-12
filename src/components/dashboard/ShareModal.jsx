import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CryptoUtils } from '../../lib/crypto';

export default function ShareModal({ file, masterKey, user, onClose }) {
  const [usageLimit, setUsageLimit] = useState(1);
  const [expiryHours, setExpiryHours] = useState(24);
  const [shareLink, setShareLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generateShareLink = async () => {
    setGenerating(true);
    setError('');

    try {
      const wrappedKey = CryptoUtils.hexToArrayBuffer(file.wrapped_file_key);
      const wrapIV = CryptoUtils.hexToArrayBuffer(file.wrapped_key_iv);
      const fileKey = await CryptoUtils.unwrapFileKey(wrappedKey, wrapIV, masterKey);

      const shareKey = await CryptoUtils.generateFileKey();
      const { encryptedFileKey, iv } = await CryptoUtils.encryptFileKeyForSharing(fileKey, shareKey);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + Number(expiryHours));

      // Only insert columns that exist in the shares table
      const { data, error: insertError } = await supabase
        .from('shares')
        .insert({
          file_id: file.id,
          encrypted_file_key: CryptoUtils.arrayBufferToHex(encryptedFileKey),
          encrypted_file_key_iv: CryptoUtils.arrayBufferToHex(iv),
          usage_limit: Number(usageLimit),
          download_count: 0,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const shareKeyHex = await CryptoUtils.exportShareKey(shareKey);
      const url = `${window.location.origin}/share/${data.id}#key=${shareKeyHex}`;
      setShareLink(url);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-md mx-4 scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Share File</h2>
              <p className="text-xs text-gray-400 truncate max-w-[200px]">{file.filename}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {!shareLink ? (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Download Limit</label>
                <input type="number" min="1" max="100" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} className="input-field" />
                <p className="mt-1 text-xs text-gray-500">Max times this link can be downloaded</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Expires After (hours)</label>
                <input type="number" min="1" max="720" value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)} className="input-field" />
                <p className="mt-1 text-xs text-gray-500">
                  Expires {new Date(Date.now() + expiryHours * 3600000).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="alert-info mb-6">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-blue-300">The encryption key is in the link fragment and never stored on our servers.</p>
              </div>
            </div>

            <button onClick={generateShareLink} disabled={generating} className="btn-primary w-full">
              {generating ? (
                <span className="flex items-center justify-center">
                  <div className="spinner-sm mr-2"></div>
                  Generating secure link...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Generate Share Link
                </span>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-300">Share link generated!</p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">Share Link</label>
              <input value={shareLink} readOnly className="input-field text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleCopy} className={copied ? 'btn-success w-full' : 'btn-primary w-full'}>
                {copied ? (
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Copy Link
                  </span>
                )}
              </button>
              <button onClick={onClose} className="btn-secondary w-full">Done</button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4">
              ⚠️ Share with trusted recipients only. The key cannot be regenerated.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

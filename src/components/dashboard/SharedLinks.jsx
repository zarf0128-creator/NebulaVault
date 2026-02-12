import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function SharedLinks({ user }) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadShares();
  }, [user]);

  const loadShares = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shares')
        .select(`
          id,
          usage_limit,
          download_count,
          expires_at,
          created_at,
          files (
            filename,
            file_size,
            mime_type
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShares(data || []);
    } catch (err) {
      console.error('Error loading shares:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shareId) => {
    if (!confirm('Delete this share link? Recipients will no longer be able to download.')) return;
    setDeletingId(shareId);
    try {
      const { error } = await supabase.from('shares').delete().eq('id', shareId);
      if (error) throw error;
      setShares(prev => prev.filter(s => s.id !== shareId));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (shareId) => {
    // Note: the share key is NOT stored — we can only copy the base URL.
    // The full link with the key was only available at generation time.
    const url = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatus = (share) => {
    const expired = new Date(share.expires_at) < new Date();
    const exhausted = share.download_count >= share.usage_limit;
    if (expired) return { label: 'Expired', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    if (exhausted) return { label: 'Used Up', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    return { label: 'Active', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
  };

  const formatExpiry = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date - now;
    if (diffMs < 0) return 'Expired ' + date.toLocaleDateString();
    const diffHrs = Math.floor(diffMs / 3600000);
    if (diffHrs < 24) return `Expires in ${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    return `Expires in ${diffDays}d`;
  };

  if (loading) {
    return (
      <div className="glass-card flex justify-center items-center py-16">
        <div className="spinner"></div>
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No shared links yet</h3>
        <p className="text-sm text-gray-500">
          Go to <span className="text-purple-400">My Files</span> and click the share icon on any file to create a link.
        </p>
      </div>
    );
  }

  const activeCount = shares.filter(s => {
    const expired = new Date(s.expires_at) < new Date();
    const exhausted = s.download_count >= s.usage_limit;
    return !expired && !exhausted;
  }).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-white">{shares.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Links</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-1">Active</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">
            {shares.reduce((sum, s) => sum + s.download_count, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Downloads</p>
        </div>
      </div>

      {/* Links list */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your Shared Links</h2>
          <button
            onClick={loadShares}
            className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {shares.map((share) => {
            const status = getStatus(share);
            const downloadsLeft = share.usage_limit - share.download_count;

            return (
              <div key={share.id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* File info */}
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {share.files?.filename || 'Unknown file'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        {/* Status badge */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                          {status.label}
                        </span>
                        {/* Downloads */}
                        <span className="text-xs text-gray-500">
                          {share.download_count}/{share.usage_limit} downloads used
                        </span>
                        {/* Expiry */}
                        <span className="text-xs text-gray-500">
                          {formatExpiry(share.expires_at)}
                        </span>
                      </div>
                      {/* Share ID for reference */}
                      <p className="text-xs text-gray-700 mt-1 font-mono truncate">
                        /share/{share.id}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Copy URL (base only — key is gone after generation) */}
                    <button
                      onClick={() => handleCopy(share.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
                      title="Copy link (base URL only — key was in original link)"
                    >
                      {copiedId === share.id ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(share.id)}
                      disabled={deletingId === share.id}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                      title="Revoke share link"
                    >
                      {deletingId === share.id ? (
                        <div className="spinner-sm"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress bar for downloads */}
                <div className="mt-3 ml-12">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Downloads used</span>
                    <span className="text-xs text-gray-500">{share.download_count} / {share.usage_limit}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (share.download_count / share.usage_limit) * 100)}%`,
                        backgroundColor: share.download_count >= share.usage_limit ? '#f97316' : '#a855f7'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="alert-info">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-blue-300">
            The encryption key is embedded in the original share link only. It is never stored on the server — so only the person you sent the full link to can decrypt the file.
          </p>
        </div>
      </div>
    </div>
  );
}

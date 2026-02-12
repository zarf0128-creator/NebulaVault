import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CryptoUtils } from '../../lib/crypto';

export default function FileList({ files, loading, masterKey, onFileDeleted, onShareClick }) {
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  const handleDownload = async (file) => {
    setDownloadingId(file.id);
    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from('encrypted-files')
        .download(file.storage_path);
      if (downloadError) throw downloadError;

      const wrappedKey = CryptoUtils.hexToArrayBuffer(file.wrapped_file_key);
      const wrapIV = CryptoUtils.hexToArrayBuffer(file.wrapped_key_iv);
      const fileKey = await CryptoUtils.unwrapFileKey(wrappedKey, wrapIV, masterKey);

      const encryptedBuffer = await blob.arrayBuffer();
      const iv = CryptoUtils.hexToArrayBuffer(file.encryption_iv);
      const decrypted = await CryptoUtils.decryptFile(encryptedBuffer, iv, fileKey);

      const hash = await CryptoUtils.calculateHash(decrypted);
      if (hash !== file.sha256_hash) throw new Error('File integrity check failed!');

      const downloadBlob = new Blob([decrypted], { type: file.mime_type });
      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Delete "${file.filename}"? This cannot be undone.`)) return;
    setDeletingId(file.id);
    try {
      const { error: storageError } = await supabase.storage.from('encrypted-files').remove([file.storage_path]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from('files').delete().eq('id', file.id);
      if (dbError) throw dbError;
      onFileDeleted();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleVerify = async (file) => {
    setVerifyingId(file.id);
    try {
      const { data: blob, error: downloadError } = await supabase.storage.from('encrypted-files').download(file.storage_path);
      if (downloadError) throw downloadError;

      const wrappedKey = CryptoUtils.hexToArrayBuffer(file.wrapped_file_key);
      const wrapIV = CryptoUtils.hexToArrayBuffer(file.wrapped_key_iv);
      const fileKey = await CryptoUtils.unwrapFileKey(wrappedKey, wrapIV, masterKey);

      const encryptedBuffer = await blob.arrayBuffer();
      const iv = CryptoUtils.hexToArrayBuffer(file.encryption_iv);
      const decrypted = await CryptoUtils.decryptFile(encryptedBuffer, iv, fileKey);

      const hash = await CryptoUtils.calculateHash(decrypted);
      alert(hash === file.sha256_hash
        ? '✓ Integrity verified! File has not been tampered with.'
        : '✗ Integrity check failed! File may have been modified.');
    } catch (err) {
      alert('Verification failed: ' + err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-card flex justify-center items-center py-16">
        <div className="spinner"></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-1">No files yet</h3>
        <p className="text-sm text-gray-500">Upload your first file to get started.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Table header */}
      <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/10 bg-white/5">
        <div className="col-span-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</div>
        <div className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Size</div>
        <div className="col-span-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</div>
        <div className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</div>
      </div>

      <div className="divide-y divide-white/5">
        {files.map((file) => (
          <div key={file.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors group">
            {/* Name */}
            <div className="col-span-12 sm:col-span-5 flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.filename}</p>
                <p className="text-xs text-gray-500">{file.mime_type}</p>
              </div>
            </div>

            {/* Size */}
            <div className="hidden sm:block col-span-2 text-sm text-gray-400">
              {CryptoUtils.formatFileSize(file.file_size)}
            </div>

            {/* Date */}
            <div className="hidden sm:block col-span-3 text-sm text-gray-400">
              {new Date(file.created_at).toLocaleDateString()}
            </div>

            {/* Actions */}
            <div className="col-span-12 sm:col-span-2 flex items-center justify-end space-x-1">
              {/* Download */}
              <button
                onClick={() => handleDownload(file)}
                disabled={!!downloadingId || !!deletingId || !!verifyingId}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 disabled:opacity-40 transition-all"
                title="Download"
              >
                {downloadingId === file.id ? (
                  <div className="spinner-sm"></div>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
              </button>

              {/* Verify */}
              <button
                onClick={() => handleVerify(file)}
                disabled={!!downloadingId || !!deletingId || !!verifyingId}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-green-400 hover:text-green-300 hover:bg-green-500/10 disabled:opacity-40 transition-all"
                title="Verify Integrity"
              >
                {verifyingId === file.id ? (
                  <div className="spinner-sm"></div>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
              </button>

              {/* Share */}
              <button
                onClick={() => onShareClick(file)}
                disabled={!!deletingId}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 disabled:opacity-40 transition-all"
                title="Share"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(file)}
                disabled={!!downloadingId || !!deletingId || !!verifyingId}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-40 transition-all"
                title="Delete"
              >
                {deletingId === file.id ? (
                  <div className="spinner-sm"></div>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

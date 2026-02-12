import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { CryptoUtils } from '../../lib/crypto';

export default function FileUpload({ user, masterKey, onUploadComplete, uploading, setUploading }) {
  const [progress, setProgress] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !masterKey) return;

    setUploading(true);
    setProgress('Preparing file...');

    try {
      setProgress('Generating encryption key...');
      const fileKey = await CryptoUtils.generateFileKey();

      setProgress('Encrypting file...');
      const { encrypted, iv } = await CryptoUtils.encryptFile(selectedFile, fileKey);

      setProgress('Calculating integrity hash...');
      const originalBuffer = await selectedFile.arrayBuffer();
      const hash = await CryptoUtils.calculateHash(originalBuffer);

      setProgress('Wrapping encryption key...');
      const { wrappedKey, iv: wrapIV } = await CryptoUtils.wrapFileKey(fileKey, masterKey);

      setProgress('Uploading encrypted file...');
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('encrypted-files')
        .upload(fileName, new Blob([encrypted], { type: 'application/octet-stream' }), {
          contentType: 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setProgress('Saving metadata...');
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          filename: selectedFile.name,
          storage_path: fileName,
          file_size: selectedFile.size,
          mime_type: selectedFile.type || 'application/octet-stream',
          encryption_iv: CryptoUtils.arrayBufferToHex(iv),
          wrapped_file_key: CryptoUtils.arrayBufferToHex(wrappedKey),
          wrapped_key_iv: CryptoUtils.arrayBufferToHex(wrapIV),
          sha256_hash: hash
        });

      if (dbError) throw dbError;

      setProgress('Upload complete!');
      setTimeout(() => {
        setProgress('');
        setSelectedFile(null);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onUploadComplete();
      }, 1000);

    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + err.message);
      setUploading(false);
      setProgress('');
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Upload File</h3>
      
      {!selectedFile ? (
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            dragOver
              ? 'border-purple-400 bg-purple-500/10'
              : 'border-white/20 hover:border-purple-500/60 hover:bg-white/5'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center">
            <svg className="w-10 h-10 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-1 text-sm text-gray-400">
              <span className="font-semibold text-purple-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-600">All files are encrypted before upload</p>
          </div>
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-white text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{CryptoUtils.formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {!uploading && (
              <button onClick={handleCancel} className="text-gray-500 hover:text-white transition-colors ml-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {uploading && progress && (
            <div className="flex items-center space-x-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <div className="spinner-sm flex-shrink-0"></div>
              <p className="text-sm font-medium text-purple-300">{progress}</p>
            </div>
          )}

          {!uploading && (
            <button onClick={handleUpload} className="btn-primary w-full">
              <span className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v-8m0 0l-3 3m3-3l3 3M3 17v1a2 2 0 002 2h14a2 2 0 002-2v-1" />
                </svg>
                Encrypt & Upload
              </span>
            </button>
          )}
        </div>
      )}

      <div className="mt-4 alert-info">
        <div className="flex items-start space-x-2">
          <svg className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-blue-300">
            Files are encrypted with AES-256-GCM before upload. The server never sees your plaintext files or encryption keys.
          </p>
        </div>
      </div>
    </div>
  );
}

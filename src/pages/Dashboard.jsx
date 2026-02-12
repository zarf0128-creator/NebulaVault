import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { CryptoUtils } from '../lib/crypto';
import FileUpload from '../components/dashboard/FileUpload';
import FileList from '../components/dashboard/FileList';
import ShareModal from '../components/dashboard/ShareModal';
import SharedLinks from '../components/dashboard/SharedLinks';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, masterKey, signOut } = useAuth();
  
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [shareModalFile, setShareModalFile] = useState(null);
  const [activeTab, setActiveTab] = useState('files');
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    if (!user || !masterKey) {
      navigate('/login');
      return;
    }
    loadFiles();
  }, [user, masterKey]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
      const totalBytes = (data || []).reduce((sum, file) => sum + file.file_size, 0);
      setStorageUsed(totalBytes);
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen">
      {/* Top Navigation */}
      <nav className="glass-card border-b border-white/10 rounded-none sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              <span className="ml-2 text-xl font-bold gradient-text">NebulaVault</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
              <span className="text-sm text-gray-500 hidden sm:block">{CryptoUtils.formatFileSize(storageUsed)} used</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-300 hover:text-white font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-56 flex-shrink-0">
            <div className="glass-card overflow-hidden">
              <nav className="flex lg:flex-col flex-row">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`flex items-center px-5 py-4 text-left font-medium transition-all flex-1 lg:flex-none ${
                    activeTab === 'files'
                      ? 'bg-purple-500/20 text-purple-300 border-b-2 lg:border-b-0 lg:border-r-4 border-purple-500'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <svg className="h-5 w-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  My Files
                </button>
                <button
                  onClick={() => setActiveTab('shared')}
                  className={`flex items-center px-5 py-4 text-left font-medium transition-all flex-1 lg:flex-none ${
                    activeTab === 'shared'
                      ? 'bg-purple-500/20 text-purple-300 border-b-2 lg:border-b-0 lg:border-r-4 border-purple-500'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <svg className="h-5 w-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Shared Links
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'files' && (
              <div className="space-y-6">
                <FileUpload
                  user={user}
                  masterKey={masterKey}
                  onUploadComplete={loadFiles}
                  uploading={uploading}
                  setUploading={setUploading}
                />
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Your Files</h2>
                  <FileList
                    files={files}
                    loading={loading}
                    masterKey={masterKey}
                    onFileDeleted={loadFiles}
                    onShareClick={setShareModalFile}
                  />
                </div>
              </div>
            )}

            {activeTab === 'shared' && (
              <SharedLinks user={user} />
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {shareModalFile && (
        <ShareModal
          file={shareModalFile}
          masterKey={masterKey}
          user={user}
          onClose={() => setShareModalFile(null)}
        />
      )}
    </div>
  );
}

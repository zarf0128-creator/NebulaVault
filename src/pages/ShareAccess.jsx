import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CryptoUtils } from "../lib/crypto";

export default function ShareAccess() {
  const { shareId } = useParams();

  const [shareData, setShareData] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    loadShare();
  }, [shareId]);

  const loadShare = async () => {
    try {
      setLoading(true);
      setError("");

      // ✅ FIXED JOIN (no more "metadata missing")
      const { data: share, error: shareError } = await supabase
        .from("shares")
        .select(`
          id,
          file_id,
          encrypted_file_key,
          encrypted_file_key_iv,
          usage_limit,
          download_count,
          expires_at,
          files!shares_file_id_fkey (
            filename,
            storage_path,
            file_size,
            mime_type,
            encryption_iv,
            sha256_hash
          )
        `)
        .eq("id", shareId)
        .maybeSingle();

      if (shareError) throw new Error(shareError.message);
      if (!share) throw new Error("Share link not found or expired");
      if (!share.files) throw new Error("Shared file metadata missing");

      if (share.download_count >= share.usage_limit) {
        throw new Error("Download limit reached");
      }

      const expiry = new Date(share.expires_at);
      if (expiry < new Date()) throw new Error("Share link expired");

      setShareData(share);
      setFileData(share.files);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load share");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setDownloadError("");

      if (!shareData || !fileData) {
        throw new Error("Share not loaded");
      }

      // ---------- Extract key from URL ----------
      const fragment = window.location.hash.substring(1);
      const params = new URLSearchParams(fragment);
      const shareKeyHex = params.get("key");

      if (!shareKeyHex) {
        throw new Error("Missing encryption key in URL");
      }

      const shareKey = await CryptoUtils.importShareKey(shareKeyHex);

      // ---------- Decrypt file key ----------
      const encKey = CryptoUtils.hexToArrayBuffer(shareData.encrypted_file_key);
      const keyIV = CryptoUtils.hexToArrayBuffer(shareData.encrypted_file_key_iv);

      const fileKey = await CryptoUtils.decryptFileKeyFromShare(
        encKey,
        keyIV,
        shareKey
      );

      // ---------- Generate signed URL (WORKS WITHOUT LOGIN) ----------
      const { data: signed, error: signError } = await supabase.storage
        .from("encrypted-files")
        .createSignedUrl(fileData.storage_path, 300);

      if (signError || !signed?.signedUrl) {
        throw new Error("Could not generate download URL");
      }

      // ---------- Fetch encrypted file ----------
      const res = await fetch(signed.signedUrl);
      if (!res.ok) throw new Error("File download failed");

      const encryptedBuffer = await res.arrayBuffer();

      // ---------- Decrypt ----------
      const iv = CryptoUtils.hexToArrayBuffer(fileData.encryption_iv);
      const decrypted = await CryptoUtils.decryptFile(
        encryptedBuffer,
        iv,
        fileKey
      );

      // ---------- Integrity check ----------
      const hash = await CryptoUtils.calculateHash(decrypted);
      if (hash !== fileData.sha256_hash) {
        throw new Error("File integrity check failed");
      }

      // ---------- Increase download count ----------
      await supabase
        .from("shares")
        .update({ download_count: shareData.download_count + 1 })
        .eq("id", shareId);

      // ---------- Trigger download ----------
      const blob = new Blob([decrypted], {
        type: fileData.mime_type || "application/octet-stream",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);

      setTimeout(() => {
        setDownloadSuccess(false);
        loadShare();
      }, 2000);
    } catch (err) {
      console.error(err);
      setDownloadError(err.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  // ---------- LOADING ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          Loading share...
        </div>
      </div>
    );
  }

  // ---------- ERROR ----------
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl mb-4">Access Error</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <Link to="/" className="btn-primary">Home</Link>
        </div>
      </div>
    );
  }

  const remaining = shareData.usage_limit - shareData.download_count;
  const expiryDate = new Date(shareData.expires_at);

  return (
    <div className="min-h-screen text-white flex items-center justify-center">
      <div className="glass-card p-8 max-w-md w-full text-center">
        <h1 className="text-2xl mb-2">{fileData.filename}</h1>
        <p className="text-gray-400 mb-4">
          Remaining downloads: {remaining}
        </p>

        {downloadError && (
          <p className="text-red-400 mb-3">{downloadError}</p>
        )}

        {downloadSuccess && (
          <p className="text-green-400 mb-3">Download successful</p>
        )}

        <button
          onClick={handleDownload}
          disabled={downloading || remaining === 0}
          className="btn-primary w-full"
        >
          {downloading ? "Decrypting..." : "Download"}
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Expires: {expiryDate.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

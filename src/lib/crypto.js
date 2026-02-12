/**
 * CryptoUtils - Zero-Knowledge Encryption Library
 * 
 * SECURITY MODEL:
 * - All encryption happens client-side
 * - Master key derived from password (never stored)
 * - Unique file key per file
 * - File keys wrapped with master key
 * - Share keys generated per share (never stored)
 * - AES-256-GCM for authenticated encryption
 * - PBKDF2 for key derivation (100k iterations)
 * - SHA-256 for integrity verification
 */

export class CryptoUtils {
  /**
   * Generate cryptographically secure random salt
   * @returns {Uint8Array} 16-byte random salt
   */
  static generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * Generate random IV for AES-GCM
   * @returns {Uint8Array} 12-byte random IV
   */
  static generateIV() {
    return crypto.getRandomValues(new Uint8Array(12));
  }

  /**
   * Generate random AES-256 key for file encryption
   * @returns {Promise<CryptoKey>} AES-256 key
   */
  static async generateFileKey() {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive master key from password using PBKDF2
   * @param {string} password - User password
   * @param {Uint8Array} salt - Random salt (stored per user)
   * @returns {Promise<CryptoKey>} Derived AES-256 master key
   */
  static async deriveMasterKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES-256 key using PBKDF2
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // OWASP recommended minimum
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Wrap (encrypt) file key with master key
   * @param {CryptoKey} fileKey - File encryption key
   * @param {CryptoKey} masterKey - Master key (from password)
   * @returns {Promise<{wrappedKey: Uint8Array, iv: Uint8Array}>}
   */
  static async wrapFileKey(fileKey, masterKey) {
    const iv = this.generateIV();
    
    // Export file key to raw bytes
    const exportedKey = await crypto.subtle.exportKey('raw', fileKey);
    
    // Encrypt file key with master key
    const wrapped = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      masterKey,
      exportedKey
    );

    return {
      wrappedKey: new Uint8Array(wrapped),
      iv: iv
    };
  }

  /**
   * Unwrap (decrypt) file key with master key
   * @param {Uint8Array} wrappedKeyBuffer - Encrypted file key
   * @param {Uint8Array} iv - IV used for wrapping
   * @param {CryptoKey} masterKey - Master key (from password)
   * @returns {Promise<CryptoKey>} Decrypted file key
   */
  static async unwrapFileKey(wrappedKeyBuffer, iv, masterKey) {
    // Decrypt file key
    const unwrapped = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      masterKey,
      wrappedKeyBuffer
    );

    // Import as CryptoKey
    return await crypto.subtle.importKey(
      'raw',
      unwrapped,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt file data with file key
   * @param {File} file - File to encrypt
   * @param {CryptoKey} fileKey - AES-256 file key
   * @returns {Promise<{encrypted: Uint8Array, iv: Uint8Array}>}
   */
  static async encryptFile(file, fileKey) {
    const iv = this.generateIV();
    const arrayBuffer = await file.arrayBuffer();
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      fileKey,
      arrayBuffer
    );

    return {
      encrypted: new Uint8Array(encrypted),
      iv: iv
    };
  }

  /**
   * Decrypt file data with file key
   * @param {ArrayBuffer} encryptedBuffer - Encrypted file data
   * @param {Uint8Array} iv - IV used for encryption
   * @param {CryptoKey} fileKey - AES-256 file key
   * @returns {Promise<ArrayBuffer>} Decrypted file data
   */
  static async decryptFile(encryptedBuffer, iv, fileKey) {
    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      fileKey,
      encryptedBuffer
    );
  }

  /**
   * Calculate SHA-256 hash of data
   * @param {ArrayBuffer} data - Data to hash
   * @returns {Promise<string>} Hex-encoded hash
   */
  static async calculateHash(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * Convert ArrayBuffer to hex string
   * @param {ArrayBuffer} buffer - Buffer to convert
   * @returns {string} Hex string
   */
  static arrayBufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to Uint8Array
   * @param {string} hex - Hex string
   * @returns {Uint8Array} Byte array
   */
  static hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Convert ArrayBuffer to Base64
   * @param {ArrayBuffer} buffer - Buffer to convert
   * @returns {string} Base64 string
   */
  static arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to Uint8Array
   * @param {string} base64 - Base64 string
   * @returns {Uint8Array} Byte array
   */
  static base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Encrypt file key with share key for secure sharing
   * @param {CryptoKey} fileKey - File encryption key to share
   * @param {CryptoKey} shareKey - Random share key
   * @returns {Promise<{encryptedFileKey: Uint8Array, iv: Uint8Array}>}
   */
  static async encryptFileKeyForSharing(fileKey, shareKey) {
    const iv = this.generateIV();
    
    // Export file key to raw bytes
    const exportedFileKey = await crypto.subtle.exportKey('raw', fileKey);
    
    // Encrypt file key with share key
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      shareKey,
      exportedFileKey
    );

    return {
      encryptedFileKey: new Uint8Array(encrypted),
      iv: iv
    };
  }

  /**
   * Decrypt file key using share key (recipient side)
   * @param {Uint8Array} encryptedFileKey - Encrypted file key
   * @param {Uint8Array} iv - IV used for encryption
   * @param {CryptoKey} shareKey - Share key from URL
   * @returns {Promise<CryptoKey>} Decrypted file key
   */
  static async decryptFileKeyFromShare(encryptedFileKey, iv, shareKey) {
    // Decrypt file key
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      shareKey,
      encryptedFileKey
    );

    // Import as CryptoKey
    return await crypto.subtle.importKey(
      'raw',
      decrypted,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    );
  }

  /**
   * Import share key from hex string (from URL fragment)
   * @param {string} shareKeyHex - Hex-encoded share key
   * @returns {Promise<CryptoKey>} Share key
   */
  static async importShareKey(shareKeyHex) {
    const shareKeyBuffer = this.hexToArrayBuffer(shareKeyHex);
    return await crypto.subtle.importKey(
      'raw',
      shareKeyBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  /**
   * Export share key to hex string (for URL fragment)
   * @param {CryptoKey} shareKey - Share key
   * @returns {Promise<string>} Hex-encoded share key
   */
  static async exportShareKey(shareKey) {
    const exported = await crypto.subtle.exportKey('raw', shareKey);
    return this.arrayBufferToHex(exported);
  }

  /**
   * Format bytes to human-readable size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size (e.g., "1.5 MB")
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

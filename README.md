# NebulaVault - Zero-Knowledge Cloud Storage

A production-ready, secure cloud storage SaaS application with end-to-end encryption. Built with React, Vite, Tailwind CSS, and Supabase.

## Features

- **Zero-Knowledge Architecture**: Server never sees your files or encryption keys
- **Client-Side Encryption**: AES-256-GCM encryption in browser
- **Secure File Sharing**: One-time share links with download limits and expiry
- **Integrity Verification**: SHA-256 hashing ensures files haven't been tampered with
- **Google OAuth**: Sign in with Google (in addition to email/password)
- **Modern UI**: Clean, responsive interface similar to Google Drive
- **Production-Ready**: Full error handling, loading states, and user feedback

## Security Model

### Encryption Flow

```
Password + Salt → PBKDF2 (100k iterations) → Master Key
```

For each file:
1. Generate random File Key (AES-256)
2. Encrypt file with File Key
3. Wrap (encrypt) File Key with Master Key
4. Store wrapped key in database
5. Upload encrypted file to storage

### Share Flow

When sharing:
1. Unwrap File Key with Master Key
2. Generate random Share Key (AES-256)
3. Encrypt File Key with Share Key
4. Store encrypted File Key (NOT Share Key!)
5. Put Share Key in URL fragment: `/share/{id}#key=HEXKEY`

When recipient downloads:
1. Extract Share Key from URL fragment
2. Decrypt File Key using Share Key
3. Download encrypted file
4. Decrypt file using File Key
5. Verify integrity with SHA-256

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Crypto**: Web Crypto API (AES-256-GCM, PBKDF2, SHA-256)
- **Routing**: React Router v6

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Run `database-schema.sql` in SQL Editor
4. Create storage bucket named "encrypted-files" (private)
5. Configure storage policies (see database-schema.sql)

### 3. Configure Environment

Create `.env` file:

```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### 5. Build for Production

```bash
npm run build
```

Deploy `dist/` folder to any static hosting (Netlify, Vercel, etc.)

## Project Structure

```
nebulavault/
├── src/
│   ├── components/
│   │   └── dashboard/
│   │       ├── FileUpload.jsx
│   │       ├── FileList.jsx
│   │       └── ShareModal.jsx
│   ├── lib/
│   │   ├── crypto.js           # Encryption utilities
│   │   ├── supabase.js         # Supabase client
│   │   └── AuthContext.jsx     # Auth state management
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── Dashboard.jsx
│   │   └── ShareAccess.jsx
│   ├── styles/
│   │   └── index.css
│   ├── App.jsx
│   └── main.jsx
├── database-schema.sql
├── package.json
└── README.md
```

## Database Schema

### Tables

**profiles**
- Stores user salt for PBKDF2 key derivation

**files**
- Stores encrypted file metadata
- wrapped_file_key: File key encrypted with master key
- encryption_iv: IV for file encryption
- sha256_hash: Integrity verification hash

**shares**
- Stores share link data
- encrypted_file_key: File key encrypted with share key
- usage_limit, download_count, expires_at

## Security Features

### What We Protect Against
✅ Server compromise (encrypted data only)
✅ Database breach (all keys wrapped)
✅ Storage breach (files encrypted)
✅ Man-in-the-middle (AES-GCM auth)
✅ File tampering (SHA-256 verification)
✅ Unauthorized access (Row Level Security)

### Known Limitations
⚠️ Lost password = lost files (by design)
⚠️ Client-side XSS can steal keys
⚠️ Share links grant full access
⚠️ Share key visible in browser history

## API Documentation

### CryptoUtils

```javascript
// Generate salt
const salt = CryptoUtils.generateSalt();

// Derive master key from password
const masterKey = await CryptoUtils.deriveMasterKey(password, salt);

// Generate file key
const fileKey = await CryptoUtils.generateFileKey();

// Encrypt file
const { encrypted, iv } = await CryptoUtils.encryptFile(file, fileKey);

// Wrap file key
const { wrappedKey, iv } = await CryptoUtils.wrapFileKey(fileKey, masterKey);

// Calculate hash
const hash = await CryptoUtils.calculateHash(data);
```

## Deployment

### Netlify

```bash
# Build command
npm run build

# Publish directory
dist
```

### Vercel

```bash
vercel deploy
```

### Environment Variables

Set these in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Testing

### Manual Testing Checklist

**Authentication**
- [ ] Sign up with email
- [ ] Log in
- [ ] Sign in with Google
- [ ] Log out

**File Operations**
- [ ] Upload file
- [ ] Download file
- [ ] Delete file
- [ ] Verify integrity

**Sharing**
- [ ] Create share link
- [ ] Download via share link
- [ ] Verify download limit
- [ ] Verify expiry

## Contributing

This is a complete reference implementation. Feel free to:
- Fork and customize
- Report issues
- Suggest improvements

## License

MIT License - Free to use for personal and commercial projects

## Support

For issues or questions, please check:
1. Database schema is correctly applied
2. Storage bucket is created and private
3. Storage policies are configured
4. Environment variables are set
5. Browser console for errors

## Security Disclosure

If you discover a security vulnerability, please email security@example.com

## Credits

Built with ❤️ using:
- React
- Vite
- Tailwind CSS
- Supabase
- Web Crypto API

---

**NebulaVault** - Your files, encrypted. Your keys, never shared.

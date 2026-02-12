# NebulaVault - Complete Setup Instructions

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
3. Fill in project details and wait for initialization
4. Go to **SQL Editor** and run `database-schema.sql`
5. Go to **Storage** → Create bucket "encrypted-files" (PRIVATE)
6. Go to **Settings** → **API** → Copy URL and anon key

### Step 3: Configure Environment

Create `.env` file:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 4: Enable Google OAuth (Optional)

1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Add your OAuth credentials
4. Add callback URL: `http://localhost:3000/auth/callback`

### Step 5: Run Application

```bash
npm run dev
```

Visit: http://localhost:3000

## 📋 Detailed Setup

### Database Schema Setup

Run this in Supabase SQL Editor:

```sql
-- Copy entire content of database-schema.sql
```

This creates:
- `profiles` table (user salts)
- `files` table (encrypted metadata)
- `shares` table (share links)
- RLS policies
- Indexes
- Triggers

### Storage Bucket Setup

1. Go to **Storage** in Supabase
2. Click "Create bucket"
3. Name: `encrypted-files`
4. **Make it PRIVATE** (uncheck public)
5. Click "Create"

### Storage Policies

The database schema includes storage policies. If they don't apply automatically, go to Storage → encrypted-files → Policies and ensure these exist:

1. **Users can upload own files**
2. **Users can read own files**  
3. **Users can delete own files**

## 🔒 Security Configuration

### Row Level Security

All tables have RLS enabled. Policies ensure:
- Users can only access their own files
- Share links are publicly readable (for recipients)
- File owners can manage shares

### Authentication

Enable in Supabase:
1. Go to **Authentication** → **Settings**
2. Enable Email confirmations (production)
3. Configure email templates
4. Set site URL and redirect URLs

## 🏗️ Build for Production

```bash
npm run build
```

Output: `dist/` folder

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

Set environment variables in Netlify dashboard.

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Set environment variables in Vercel dashboard.

## ✅ Testing Checklist

### Authentication
- [ ] Sign up with email
- [ ] Verify email (if enabled)
- [ ] Log in with email/password
- [ ] Log in with Google (if enabled)
- [ ] Log out
- [ ] Password requirements enforced

### File Operations
- [ ] Upload small file (<1MB)
- [ ] Upload medium file (1-10MB)
- [ ] Upload large file (>10MB)
- [ ] Download file
- [ ] Verify file integrity
- [ ] Delete file
- [ ] Multiple files in list

### Sharing
- [ ] Create share link
- [ ] Copy share link
- [ ] Open share link (incognito)
- [ ] Download via share
- [ ] Download count increments
- [ ] Expiry enforced
- [ ] Usage limit enforced

### Security
- [ ] Files encrypted in storage (check raw data - should be gibberish)
- [ ] Keys not in database (check wrapped_file_key - should be hex)
- [ ] Hash verification works
- [ ] RLS prevents cross-user access

## 🐛 Troubleshooting

### "Failed to fetch" Error
- Check Supabase URL in .env
- Check anon key in .env
- Verify Supabase project is running
- Check browser console for CORS errors

### Upload Fails
- Verify storage bucket exists
- Check bucket is named "encrypted-files"
- Verify storage policies are set
- Check browser console

### Download Fails
- Check file exists in storage
- Verify RLS policies
- Check browser console
- Try integrity verification

### Share Link Doesn't Work
- Verify URL has `#key=` fragment
- Check share hasn't expired
- Verify download limit not exceeded
- Check browser console

## 📊 Project Structure

```
nebulavault/
├── src/
│   ├── components/dashboard/
│   │   ├── FileUpload.jsx       # File upload with encryption
│   │   ├── FileList.jsx          # File list with download/delete
│   │   └── ShareModal.jsx        # Share link creation
│   ├── lib/
│   │   ├── crypto.js             # Encryption utilities
│   │   ├── supabase.js           # Supabase client
│   │   └── AuthContext.jsx       # Authentication state
│   ├── pages/
│   │   ├── Landing.jsx           # Home page
│   │   ├── Login.jsx             # Login page
│   │   ├── Signup.jsx            # Signup page
│   │   ├── Dashboard.jsx         # Main dashboard
│   │   └── ShareAccess.jsx       # Share download page
│   └── styles/
│       └── index.css             # Global styles
├── database-schema.sql           # Supabase schema
├── package.json                  # Dependencies
└── vite.config.js                # Vite configuration
```

## 🔐 Security Notes

### Master Key
- Derived from password using PBKDF2
- Never stored anywhere
- Exists only in memory during session
- Destroyed on logout

### File Keys
- Unique AES-256 key per file
- Wrapped (encrypted) with master key
- Stored in database as `wrapped_file_key`
- Unwrapped only when needed

### Share Keys
- Random AES-256 key per share
- Never stored in database
- Only in URL fragment (#key=...)
- Recipients use to decrypt file key

## 📝 Environment Variables

```bash
# Required
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Optional (for production)
VITE_APP_URL=https://your-domain.com
```

## 🎯 Next Steps

1. Customize branding (colors, logo)
2. Add file size limits
3. Implement file versioning
4. Add usage analytics
5. Create mobile app
6. Add team features

## 💡 Tips

- Use strong passwords (master key security depends on it)
- Test in incognito to verify share links
- Check raw storage data to confirm encryption
- Monitor Supabase usage in dashboard
- Set up error tracking (Sentry, etc.)

## 📞 Support

For issues:
1. Check browser console
2. Verify Supabase configuration
3. Review this setup guide
4. Check database logs in Supabase

---

**NebulaVault** - Secure. Private. Zero-Knowledge.

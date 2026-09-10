# Set Default Artist Account as Verified

## Instructions

Run the following command in your backend directory to set the default artist (or demo artist) account as verified:

```bash
cd backend
node verify_default_artist.js
```

## What This Does

The script will:
1. Connect to your MySQL database
2. Look for an artist account named "Default Artist" or with "default" in the name
3. If not found, it will look for the demo artist account (`artist.demo@example.test`)
4. Set the `is_verified` flag to `1` for that account
5. Clear any verification tokens

## Database Schema

The `users` table has the following relevant columns:
- `id` - User ID
- `name` - User name
- `email` - User email
- `is_verified` - Boolean flag (0 = not verified, 1 = verified)
- `verification_token` - Token used for email verification (cleared when verified)

## Manual SQL Alternative

If you prefer to run the SQL directly, use:

```sql
-- For Default Artist
UPDATE users SET is_verified = 1, verification_token = NULL WHERE name LIKE '%Default Artist%' LIMIT 1;

-- For Demo Artist
UPDATE users SET is_verified = 1, verification_token = NULL WHERE email = 'artist.demo@example.test' LIMIT 1;
```

## Environment Variables Required

Make sure your `.env` file has:
- `MYSQLHOST`
- `MYSQLPORT`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLDATABASE`


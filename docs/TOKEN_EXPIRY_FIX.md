# Token Expiry & Session Management Fix

## Problem

Users were getting "access denied" errors and being forced to log in again after approximately 10-30 minutes of inactivity. This was happening even though the backend JWT token expiration was set to 12 hours.

## Root Cause

The frontend had **no token expiry validation** mechanism:

1. **No client-side token validation** - The frontend never checked if the JWT token was expired before making API requests
2. **No automatic logout** - When the token expired on the backend, the frontend would continue to send it until getting a 401 error
3. **No expiry monitoring** - There was no periodic check to detect when tokens expired
4. **Poor error handling** - 401 errors didn't automatically clear tokens or redirect to login

## Solution Implemented

### 1. Token Manager Utility (`utils/tokenManager.ts`)

Created a centralized token management utility with:
- ✅ **Token expiry validation** - Checks if JWT tokens are expired using the `exp` claim
- ✅ **Token info extraction** - Gets expiry time, time until expiry, etc.
- ✅ **Auto cleanup** - Clears expired tokens from localStorage/sessionStorage
- ✅ **Periodic monitoring** - Setup function for automatic token expiry checks

```typescript
import { isTokenExpired, clearAuthTokens, validateCurrentToken } from '@/utils/tokenManager';
```

### 2. Enhanced AuthProvider (`components/providers/AuthProvider.tsx`)

Updated the AuthProvider with:
- ✅ **Initial token validation** - Checks token expiry on app load
- ✅ **Periodic monitoring** - Checks token expiry every 60 seconds
- ✅ **Automatic logout** - Automatically logs out users when token expires
- ✅ **User notification** - Alerts users when their session expires (can be enhanced with toast notifications)
- ✅ **Auto redirect** - Redirects to login page when token expires

### 3. Enhanced fetchWithAuth (`utils/fetchWithAuth.ts`)

Updated the fetch utility with:
- ✅ **Pre-request validation** - Checks token expiry before making API requests
- ✅ **401 error handling** - Automatically clears tokens and redirects on authentication errors
- ✅ **Smart error detection** - Distinguishes between expired tokens and permission errors

## How It Works

### Token Lifecycle

```
User Logs In
    ↓
Token Stored (localStorage/sessionStorage)
    ↓
Periodic Checks (every 60s) ←─┐
    ↓                          │
Is Token Expired?              │
    ↓                          │
    ├─ No ────────────────────┘
    │
    ├─ Yes
    ↓
Clear Tokens & User Data
    ↓
Show Expiry Message
    ↓
Redirect to Login
```

### API Request Flow

```
API Request Initiated
    ↓
Check Token Expiry
    ↓
    ├─ Expired → Clear Tokens → Redirect → Abort Request
    │
    ├─ Valid → Make Request
    ↓
Response Received
    ↓
    ├─ 200 OK → Return Data
    │
    ├─ 401/403 → Clear Tokens → Redirect → Throw Error
```

## Configuration

### Backend Token Expiration

Set in `.env`:
```bash
JWT_EXPIRES_IN=12h  # 12 hours (current setting)
```

You can adjust this to:
- `30m` - 30 minutes (more secure)
- `1h` - 1 hour
- `24h` - 24 hours
- etc.

### Frontend Monitoring Interval

In `AuthProvider.tsx`, the token expiry check runs every 60 seconds:
```typescript
setupTokenExpiryCheck(handleTokenExpired, 60000); // 60 seconds
```

You can adjust this interval:
- `30000` - 30 seconds (more responsive, more CPU)
- `120000` - 2 minutes (less responsive, less CPU)

## Testing

### Test Token Expiry

1. **Set short expiry** (backend `.env`):
   ```bash
   JWT_EXPIRES_IN=2m  # 2 minutes
   ```

2. **Login and wait** - After 2 minutes you should:
   - See console warning: `[Auth] Session expired. Please log in again.`
   - Get an alert (can be replaced with toast)
   - Be redirected to `/auth/signin`

3. **Check token manually** in browser console:
   ```javascript
   const token = localStorage.getItem('unite_token');
   const decoded = JSON.parse(atob(token.split('.')[1]));
   console.log('Expires at:', new Date(decoded.exp * 1000));
   console.log('Time until expiry:', decoded.exp * 1000 - Date.now(), 'ms');
   ```

### Test API Request with Expired Token

1. Manually set an expired token in localStorage
2. Try to make an API request
3. Should automatically clear token and redirect to login

## Future Enhancements

Consider adding:

1. **Token Refresh** - Implement automatic token refresh before expiry
   ```typescript
   // Refresh token 5 minutes before expiry
   if (timeUntilExpiry < 5 * 60 * 1000) {
     refreshToken();
   }
   ```

2. **Toast Notifications** - Replace `alert()` with a nicer notification system (e.g., react-hot-toast, sonner)

3. **Idle Timeout** - Additional timeout based on user inactivity
   ```typescript
   // Logout after 30 minutes of inactivity
   const idleTimeout = new IdleTimer(30 * 60 * 1000, logout);
   ```

4. **Remember Me** - Longer token expiry for "Remember Me" users
   ```typescript
   const expiresIn = rememberMe ? '30d' : '12h';
   ```

5. **Graceful Degradation** - Instead of hard redirect, show inline login modal

## Troubleshooting

### Still getting "access denied" after 10 minutes?

1. **Check backend logs** - Look for JWT expiry errors
2. **Verify JWT_EXPIRES_IN** - Ensure it's set correctly in backend `.env`
3. **Check browser console** - Look for token expiry warnings
4. **Inspect token** - Verify the `exp` claim in the JWT payload
5. **Check server time** - Ensure backend server time is synchronized (JWT uses server time for expiry)

### Token expiry alert not showing?

The current implementation uses `alert()`. You can enhance this with a toast notification library:

```typescript
// Install: npm install react-hot-toast
import toast from 'react-hot-toast';

// Replace alert with toast
toast.error('Your session has expired. Please log in again.');
```

## Files Modified

1. ✅ `utils/tokenManager.ts` (new file)
2. ✅ `components/providers/AuthProvider.tsx` (enhanced)
3. ✅ `utils/fetchWithAuth.ts` (enhanced)

## Migration Notes

- ✅ **Backward compatible** - Existing tokens will work normally
- ✅ **No database changes** - All changes are frontend-only
- ✅ **No breaking changes** - Existing API calls will work
- ⚠️ **Users will be logged out** - If their token is expired when they return to the app

---

**Last Updated:** January 2, 2026

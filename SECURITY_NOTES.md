# Security and Technical Debt Notes

This document tracks security concerns and technical debt items identified during the merge of main and currentV branches.

## Security Concerns

### 1. Hardcoded Google Maps API Key ⚠️ HIGH PRIORITY
**Location**: `app.json` lines 17, 32

**Issue**: Google Maps API key is hardcoded in the configuration file:
```json
"googleMapsApiKey": "AIzaSyB4h-d5WnRe6V0Jc_WIELxaNRbs8Gc-BiI"
```

**Risk**: 
- API key is exposed in version control
- Cannot use different keys for different environments
- Risk of unauthorized usage if key has no restrictions
- Potential for quota exhaustion or unexpected charges

**Recommendation**:
1. **Immediate**: Check Google Cloud Console and restrict this API key:
   - Add application restrictions (iOS bundle ID, Android package name)
   - Add API restrictions (limit to Maps SDK only)
   - Set up usage quotas

2. **Short-term**: Move to environment variables:
   ```javascript
   // In app.config.js (rename app.json)
   export default {
     expo: {
       ios: {
         config: {
           googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
         }
       },
       android: {
         config: {
           googleMaps: {
             apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID
           }
         }
       }
     }
   }
   ```

3. **Best Practice**: Regenerate a new API key and revoke the exposed one

**Status**: ⏸️ Deferred - Pre-existing in currentV, outside merge scope

---

## Technical Debt

### 1. Legacy FileSystem API Usage 📦 MEDIUM PRIORITY
**Location**: `lib/storage.ts` lines 5-6, 66-69

**Issue**: Code uses the legacy FileSystem API from expo-file-system:
```typescript
import * as FileSystem from 'expo-file-system/legacy';
```

**Risk**:
- Legacy APIs may be removed in future versions
- Missing out on performance improvements in current API
- Potential compatibility issues with newer Expo versions

**Recommendation**:
Migrate to current FileSystem API:
```typescript
import * as FileSystem from 'expo-file-system';

// Update the readAsStringAsync call
const base64 = await FileSystem.readAsStringAsync(uri, {
  encoding: FileSystem.EncodingType.Base64,
});
```

**Status**: ✅ Documented - Migration tracked for future update

---

### 2. Duplicate Dependency (Fixed) ✅
**Location**: `package.json` line 62

**Issue**: expo-location was listed in both dependencies and devDependencies

**Status**: ✅ Fixed - Removed from devDependencies

---

### 3. Missing Error Handling for API Key
**Location**: `app/(tabs)/explore.tsx` lines 117-120

**Issue**: No validation that Google Maps API key exists before making requests

**Recommendation**:
```typescript
const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  console.error("Google Maps API key not configured");
  Alert.alert("Configuration Error", "Maps functionality is not available");
  return;
}
```

**Status**: ⏸️ Deferred - Requires API key migration first

---

## Dependency Vulnerabilities

### Current Status
```
4 vulnerabilities (2 moderate, 2 high)
```

### Vulnerabilities Identified

1. **glob** (10.2.0 - 10.4.5)
   - Severity: HIGH
   - Issue: Command injection via -c/--cmd
   - Fix: `npm audit fix`

2. **js-yaml** (<3.14.2 || >=4.0.0 <4.1.1)
   - Severity: MODERATE
   - Issue: Prototype pollution in merge
   - Fix: `npm audit fix`

3. **node-forge** (<=1.3.1)
   - Severity: HIGH
   - Issue: ASN.1 vulnerabilities
   - Fix: `npm audit fix`

4. **tar** (7.5.1)
   - Severity: MODERATE
   - Issue: Race condition leading to uninitialized memory exposure
   - Fix: `npm audit fix`

**Recommendation**: Run `npm audit fix` to address these vulnerabilities

**Status**: ⏸️ Deferred - Development dependencies, low immediate risk

---

## Environment Configuration

### Required Environment Variables

#### Supabase (Production)
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
```

#### Google Maps (If migrating from hardcoded)
```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS=your_ios_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID=your_android_key
```

#### Firebase (Legacy - Not Needed)
The following are NO LONGER REQUIRED after migration to Supabase:
- ~~EXPO_PUBLIC_FIREBASE_API_KEY~~
- ~~EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN~~
- ~~EXPO_PUBLIC_FIREBASE_PROJECT_ID~~
- ~~EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET~~
- ~~EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID~~
- ~~EXPO_PUBLIC_FIREBASE_APP_ID~~

---

## Action Items

### Immediate (Before Production)
- [ ] Restrict Google Maps API key in Google Cloud Console
- [ ] Verify API key has usage quotas set
- [ ] Test all authentication flows with Supabase
- [ ] Ensure `.env` file is properly excluded from version control

### Short-term (Next Sprint)
- [ ] Move Google Maps API key to environment variables
- [ ] Regenerate and rotate the exposed API key
- [ ] Run `npm audit fix` to address vulnerabilities
- [ ] Add error handling for missing API keys

### Medium-term (Next Quarter)
- [ ] Migrate from legacy FileSystem API to current API
- [ ] Set up proper secrets management (e.g., Expo EAS Secrets)
- [ ] Implement API key rotation process
- [ ] Add automated security scanning to CI/CD

### Long-term (Future)
- [ ] Consider using a backend proxy for API keys
- [ ] Implement comprehensive error tracking
- [ ] Set up monitoring and alerting for API usage

---

## Testing Checklist

Before deploying to production:

### Security Testing
- [ ] Verify API keys are not in version control
- [ ] Test with invalid/missing API keys
- [ ] Verify authentication flows are secure
- [ ] Check that secure storage is working correctly

### Functionality Testing
- [ ] Test Maps functionality on iOS
- [ ] Test Maps functionality on Android
- [ ] Test image upload to Supabase
- [ ] Test user authentication (sign up, sign in, sign out)
- [ ] Test all new features (edit-profile, checklist, records)

### Performance Testing
- [ ] Monitor API usage and quotas
- [ ] Check for memory leaks
- [ ] Verify image upload performance
- [ ] Test on low-end devices

---

## References

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Google Maps API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/security)
- [Expo FileSystem API](https://docs.expo.dev/versions/latest/sdk/filesystem/)

---

**Last Updated**: December 12, 2025  
**Status**: Active tracking  
**Next Review**: Before production deployment

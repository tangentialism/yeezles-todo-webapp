# Secure "Remember Me" Implementation Plan

## Overview

This document outlines the implementation plan for secure "remember me" functionality in the Yeezles Todo webapp. The design follows security best practices from the Stack Exchange community discussion on [secure persistent login cookies](https://security.stackexchange.com/questions/281357/best-implementation-or-methods-practices-for-making-a-secure-as-possible-remem).

## Current Architecture Analysis

### Strengths of Current System
- ✅ Google OAuth ID tokens (short-lived, ~1 hour)
- ✅ No tokens stored in localStorage (security-first)
- ✅ Single authorized user (`tangentialism@gmail.com`)
- ✅ Bearer token authentication with proper validation
- ✅ Cross-platform support (web, iOS, MCP)

### Current Limitation
- Users must re-authenticate when Google ID tokens expire (~1 hour)
- No persistent session beyond token lifetime

## Proposed Architecture

### 1. Database Schema Addition

Create a new `persistent_sessions` table in the backend API:

```sql
CREATE TABLE persistent_sessions (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL, -- 'tangentialism@gmail.com'
  selector VARCHAR(64) NOT NULL UNIQUE, -- Random token for lookup
  validator_hash VARCHAR(255) NOT NULL, -- Hashed validator
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Security fingerprinting
  user_agent_hash VARCHAR(255), -- Hashed user agent
  ip_address_hash VARCHAR(255), -- Hashed IP (for basic tracking)
  
  -- Metadata
  platform VARCHAR(20), -- 'web', 'ios', 'mcp'
  is_revoked BOOLEAN DEFAULT FALSE,
  
  INDEX idx_selector (selector),
  INDEX idx_user_email (user_email),
  INDEX idx_expires_at (expires_at)
);
```

### 2. Token Architecture (Selector/Validator Pattern)

Following security best practices, implement the secure selector/validator pattern:

**Components:**
- **Selector**: Random 32-byte token for database lookup (stored in cookie)
- **Validator**: Random 32-byte token for authentication (stored in cookie, hashed in database)
- **Combined Cookie**: `remember_token=selector:validator` (64 characters total)

**Security Properties:**
- ✅ Prevents timing attacks (selector used for lookup, validator for verification)
- ✅ Database stores only hashed validator
- ✅ Tokens are cryptographically random
- ✅ Each session has unique selector/validator pair

### 3. Cookie Configuration

Secure cookie settings following security recommendations:

```typescript
const REMEMBER_ME_COOKIE_OPTIONS = {
  name: '__Host-remember_token', // Cookie prefix for security
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  httpOnly: true, // Prevent XSS access
  secure: true, // HTTPS only
  sameSite: 'strict' as const, // CSRF protection
  path: '/', // Root path
  // domain: undefined // Let browser set domain (more secure)
};
```

## Implementation Flow

### A. Login with Remember Me

1. User completes Google OAuth (existing flow)
2. If "remember me" checked:
   - Generate cryptographically random selector (32 bytes)
   - Generate cryptographically random validator (32 bytes)
   - Hash validator with bcrypt/scrypt
   - Store session in database: `(selector, hashed_validator, user_email, expires_at, metadata)`
   - Set cookie: `__Host-remember_token=selector:validator`

### B. Persistent Session Validation

1. Check for `__Host-remember_token` cookie
2. Extract selector and validator from cookie
3. Look up session by selector in database
4. Verify:
   - Session exists and not expired
   - Session not revoked
   - Validator matches hashed validator in database
   - Optional: Basic fingerprinting checks (with flexibility for VPN users)
5. If valid: Issue new Google OAuth token or create authenticated session
6. Update `last_used_at` timestamp

### C. Token Rotation (Enhanced Security)

- On each successful validation, generate new selector/validator pair
- Update database record with new tokens
- Set new cookie
- This prevents token reuse attacks

## Security Enhancements

### A. Fingerprinting (Flexible Implementation)
- Store hashed user agent (for basic device consistency)
- Store hashed IP address (with VPN considerations)
- **Important**: Make fingerprinting optional/configurable for VPN users

### B. Session Management
- Limit concurrent remember-me sessions per user (e.g., 5 devices)
- Automatic cleanup of expired sessions (cron job)
- Revoke all sessions on password change (though not applicable with Google OAuth)
- Manual session revocation in user settings

### C. Rate Limiting
- Limit remember-me token validation attempts
- Temporary lockout on repeated failures
- Log suspicious activity

## Frontend Integration

### A. Login Component Updates

```typescript
interface LoginState {
  rememberMe: boolean; // New checkbox state
}

// Send remember-me preference to backend
const loginWithRememberMe = async (googleToken: string, rememberMe: boolean) => {
  const response = await api.post('/auth/login', {
    googleToken,
    rememberMe
  });
  // Backend sets cookie if rememberMe=true
};
```

### B. Auth Context Updates

```typescript
// Check for persistent session on app startup
const checkPersistentSession = async () => {
  try {
    const response = await api.post('/auth/validate-persistent');
    if (response.data.success) {
      // User has valid persistent session
      setAuthState({
        user: response.data.user,
        idToken: response.data.idToken, // New short-lived token
        // ... other state
      });
    }
  } catch (error) {
    // No valid persistent session, proceed with normal auth flow
  }
};
```

### C. UI Components

**Login Button Component:**
- Add "Remember me for 30 days" checkbox
- Style consistently with existing design system
- Clear explanation of what "remember me" does

**User Settings:**
- Session management section
- List of active sessions with device/browser info
- "Sign out of all devices" option
- Individual session revocation

## Backend API Endpoints

### A. Enhanced Login Endpoint
```typescript
POST /auth/login
{
  googleToken: string,
  rememberMe: boolean
}
// Sets persistent session cookie if rememberMe=true
```

### B. Persistent Session Validation
```typescript
POST /auth/validate-persistent
// Checks __Host-remember_token cookie
// Returns new short-lived Google token or authenticated session
```

### C. Session Management
```typescript
GET /auth/sessions     // List user's active sessions
DELETE /auth/sessions/:id // Revoke specific session
DELETE /auth/sessions     // Revoke all sessions
```

## Security Considerations & Mitigations

### A. XSS Protection
- ✅ HttpOnly cookies prevent JavaScript access
- ✅ Input sanitization and CSP headers

### B. CSRF Protection
- ✅ SameSite=Strict cookies
- ✅ CSRF tokens for sensitive operations

### C. Session Hijacking
- ✅ HTTPS-only cookies
- ✅ Token rotation on each use
- ✅ Basic fingerprinting (flexible)

### D. Timing Attacks
- ✅ Selector/validator pattern prevents timing leaks
- ✅ Constant-time comparison for validator verification

## Implementation Scope and Impact Analysis

### Current Codebase Size
- **Total Source Files**: ~93 TypeScript/React files
- **Non-test Source Files**: ~50 files
- **Frontend (webapp)**: ~38 files
- **Backend (API)**: ~24 files
- **Current Lines of Code**: Estimated ~8,000-12,000 lines

### Code Impact Summary
- **New Code**: ~1,600-2,100 lines
- **Modified Code**: ~300-400 lines
- **Total Impact**: ~1,900-2,500 lines
- **Percentage Increase**: ~20-25% of current codebase
- **Files Affected**: ~21-28 files (23-30% of total files)

### System Components Affected

#### High Impact Areas
1. **Authentication System** (Major changes)
   - New persistent session model
   - Enhanced auth middleware
   - Session management endpoints

2. **Database Schema** (Structural change)
   - New `persistent_sessions` table
   - Migration scripts
   - Backup considerations

#### Medium Impact Areas
3. **Frontend Auth Flow** (Moderate changes)
   - AuthContext enhancements
   - Login component updates
   - API service additions

4. **Security Infrastructure** (New features)
   - Cookie handling
   - Token generation/validation
   - Session cleanup jobs

#### Low Impact Areas
5. **UI Components** (Additive changes)
   - Settings page
   - Session management
   - User preferences

### Complexity Assessment

#### High Complexity Components (Require careful implementation)
- **Selector/Validator token system** - Crypto security critical
- **Session validation middleware** - Performance and security sensitive
- **Token rotation logic** - Race condition prevention
- **Database migration** - Data integrity critical

#### Medium Complexity Components
- **Frontend auth state management** - React context complexity
- **Cookie security configuration** - Browser compatibility
- **Session cleanup jobs** - Background processing

#### Low Complexity Components
- **UI forms and displays** - Standard React patterns
- **Configuration management** - Straightforward additions
- **Basic API endpoints** - CRUD operations

### Risk Assessment

#### High Risk Areas
1. **Security vulnerabilities** - Token handling, session hijacking
2. **Authentication disruption** - Breaking existing login flow
3. **Database performance** - Session table growth
4. **Cross-browser compatibility** - Cookie behavior differences

#### Medium Risk Areas
1. **User experience** - Session expiration handling
2. **Testing complexity** - Security and edge cases
3. **Deployment coordination** - Frontend/backend sync

#### Low Risk Areas
1. **UI components** - Isolated, non-critical
2. **Configuration** - Backward compatible
3. **Documentation** - No functional impact

## Development Strategy and Branching

### Git Branching Strategy

To safely implement this feature with the ability to walk back from anything that doesn't work, we'll use a structured branching approach:

#### Main Branch Structure
```
main
├── feature/remember-me-backend
├── feature/remember-me-frontend
├── feature/remember-me-ui-enhancements
└── feature/remember-me-integration
```

#### Branch Implementation Plan

**1. Backend Implementation Branch**
```bash
git checkout -b feature/remember-me-backend
```
- Implement database schema and migrations
- Add session models and utilities
- Update auth middleware
- Create auth endpoints
- Add comprehensive tests
- **Merge criteria**: All backend tests pass, security review complete

**2. Frontend Core Branch**
```bash
git checkout -b feature/remember-me-frontend
```
- Update AuthContext for persistent sessions
- Modify login components
- Add API service methods
- Implement session validation flow
- **Merge criteria**: Frontend auth flow works with backend, tests pass

**3. UI Enhancement Branch**
```bash
git checkout -b feature/remember-me-ui-enhancements
```
- Create session management pages
- Add user settings
- Implement session revocation UI
- **Merge criteria**: UI components functional, UX approved

**4. Integration and Polish Branch**
```bash
git checkout -b feature/remember-me-integration
```
- End-to-end testing
- Security testing
- Performance optimization
- Documentation updates
- **Merge criteria**: Full feature working, security approved, performance acceptable

#### Safety Measures

**1. Feature Flag Implementation**
- Add `ENABLE_REMEMBER_ME` environment variable
- Allow feature to be disabled instantly if issues arise
- Gradual rollout capability

**2. Database Migration Safety**
- Non-destructive migrations only
- Rollback scripts prepared
- Database backup before deployment
- Test migrations on staging data

**3. Rollback Strategy**
- Each phase can be independently rolled back
- Database migrations are reversible
- Feature flag provides instant disable
- Clear rollback procedures documented

**4. Testing Strategy**
- Unit tests for each component
- Integration tests for auth flow
- Security penetration testing
- Performance testing under load
- Cross-browser compatibility testing

### Branch Merge Criteria

Each branch must meet specific criteria before merging:

#### Backend Branch Merge Criteria
- [ ] All unit tests pass (>95% coverage)
- [ ] Integration tests pass
- [ ] Security review completed
- [ ] Database migration tested
- [ ] Performance benchmarks met
- [ ] Code review approved by 2+ reviewers

#### Frontend Branch Merge Criteria
- [ ] All React component tests pass
- [ ] Auth flow integration tests pass
- [ ] Cross-browser testing completed
- [ ] UX review approved
- [ ] No breaking changes to existing functionality

#### UI Enhancement Branch Merge Criteria
- [ ] All UI components tested
- [ ] Accessibility standards met
- [ ] Design system compliance verified
- [ ] User acceptance testing completed

#### Integration Branch Merge Criteria
- [ ] End-to-end tests pass
- [ ] Security penetration testing passed
- [ ] Performance testing under load completed
- [ ] Documentation updated
- [ ] Deployment procedures tested

## Migration Strategy

### Phase 1: Database Schema and Backend Implementation (5-7 days)
**Branch**: `feature/remember-me-backend`

- [ ] Create `persistent_sessions` table migration
- [ ] Implement session creation logic (~200 lines)
- [ ] Implement session validation logic (~150 lines)
- [ ] Add session management endpoints (~300 lines)
- [ ] Add cleanup cron job (~50 lines)
- [ ] Comprehensive backend testing (~400 lines)
- [ ] Security review and penetration testing
- [ ] Performance benchmarking

**Estimated Code Addition**: ~800-1,000 lines

### Phase 2: Frontend "Remember Me" Logic (3-4 days)
**Branch**: `feature/remember-me-frontend`

- [ ] Add checkbox to login component (+30-50 lines)
- [ ] Update AuthContext for persistent session checking (+80-120 lines)
- [ ] Implement session validation on app startup (+20-30 lines)
- [ ] Update API service for remember-me endpoints (+40-60 lines)
- [ ] Frontend integration testing (~200 lines)

**Estimated Code Addition**: ~500-700 lines

### Phase 3: Enhanced Session Management UI (2-3 days)
**Branch**: `feature/remember-me-ui-enhancements`

- [ ] Create session management page (~150 lines)
- [ ] Add active sessions list (~200 lines)
- [ ] Implement session revocation (~50 lines)
- [ ] Add "sign out all devices" functionality (~30 lines)
- [ ] UI component testing (~100 lines)

**Estimated Code Addition**: ~300-400 lines

### Phase 4: Security Monitoring and Integration (2-3 days)
**Branch**: `feature/remember-me-integration`

- [ ] Add security event logging
- [ ] Implement rate limiting
- [ ] Add suspicious activity detection
- [ ] Create monitoring dashboard
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Final security review

**Total Development Time**: 12-17 days across all phases

## Configuration Options

```typescript
interface RememberMeConfig {
  enabled: boolean;
  maxAge: number; // 30 days default
  maxConcurrentSessions: number; // 5 default
  enableFingerprinting: boolean; // true default
  rotateTokensOnUse: boolean; // true default
  cleanupInterval: number; // 24 hours default
}
```

## Testing Strategy

### Unit Tests
- [ ] Session creation and validation logic
- [ ] Token generation and verification
- [ ] Cookie handling and security
- [ ] Database operations

### Integration Tests
- [ ] End-to-end login flow with remember me
- [ ] Session persistence across browser restarts
- [ ] Session expiration and cleanup
- [ ] Cross-device session management

### Security Tests
- [ ] Token rotation functionality
- [ ] Session hijacking prevention
- [ ] CSRF protection validation
- [ ] Rate limiting effectiveness

## Monitoring and Metrics

### Key Metrics to Track
- Number of active persistent sessions
- Session creation/validation rates
- Failed validation attempts
- Session cleanup statistics
- User adoption of remember-me feature

### Security Alerts
- Unusual session validation patterns
- High number of failed attempts
- Session validation from unexpected locations
- Rapid session creation/destruction

## Documentation Updates Required

- [ ] Update API documentation with new endpoints
- [ ] Add security section to deployment guide
- [ ] Update environment setup for new configuration
- [ ] Create user guide for session management
- [ ] Document rollback procedures for operations team
- [ ] Update monitoring and alerting documentation

## Deployment Strategy and Safety

### Deployment Phases

#### Phase 1: Backend Deployment
**Branch**: `feature/remember-me-backend` → `main`

**Pre-deployment Checklist**:
- [ ] Database backup completed
- [ ] Migration scripts tested on staging
- [ ] Feature flag `ENABLE_REMEMBER_ME=false` set
- [ ] Rollback procedures documented
- [ ] Monitoring alerts configured

**Deployment Steps**:
1. Deploy backend with feature flag disabled
2. Run database migrations
3. Verify API health checks pass
4. Test existing authentication still works
5. Enable feature flag gradually (staging → production)

**Rollback Plan**:
- Disable feature flag immediately if issues arise
- Revert database migration if necessary (prepared scripts)
- Rollback to previous backend version if critical

#### Phase 2: Frontend Deployment
**Branch**: `feature/remember-me-frontend` → `main`

**Pre-deployment Checklist**:
- [ ] Backend successfully deployed and tested
- [ ] Cross-browser testing completed
- [ ] Performance benchmarks met
- [ ] Rollback to previous frontend build prepared

**Deployment Steps**:
1. Deploy frontend with remember-me UI hidden (CSS/feature flag)
2. Test existing login flow works
3. Gradually enable remember-me checkbox
4. Monitor authentication success rates
5. Full rollout after validation

**Rollback Plan**:
- Hide remember-me UI via feature flag
- Revert to previous frontend build
- Disable persistent session validation if needed

#### Phase 3: Full Feature Rollout
**Branch**: `feature/remember-me-integration` → `main`

**Monitoring During Rollout**:
- Authentication success/failure rates
- Session creation/validation metrics
- Database performance (session table)
- User adoption rates
- Security event logs

### Feature Flag Strategy

```typescript
// Environment variables for gradual rollout
ENABLE_REMEMBER_ME=true|false           // Master switch
REMEMBER_ME_ROLLOUT_PERCENTAGE=0-100    // Gradual rollout
REMEMBER_ME_MAX_SESSIONS=5              // Session limits
REMEMBER_ME_TOKEN_LIFETIME=2592000      // 30 days in seconds
```

### Rollback Procedures

#### Immediate Rollback (< 5 minutes)
1. Set `ENABLE_REMEMBER_ME=false`
2. Restart application servers
3. Verify existing auth still works
4. Monitor for any residual issues

#### Database Rollback (if needed)
1. Stop application servers
2. Run prepared rollback migration
3. Verify data integrity
4. Restart with feature disabled
5. Investigate and fix issues

#### Complete Feature Removal (last resort)
1. Revert to previous application version
2. Run database rollback scripts
3. Clear any persistent session cookies
4. Communicate with users about temporary disruption

### Monitoring and Alerts

#### Key Metrics to Monitor
- Authentication success rate (should remain >99%)
- Session creation rate
- Session validation rate
- Failed authentication attempts
- Database query performance
- Memory usage (session storage)

#### Alert Thresholds
- Authentication success rate drops below 95%
- Failed session validations exceed 5% of attempts
- Database response time exceeds 200ms
- Memory usage increases by >20%
- Unusual geographic login patterns

### Communication Plan

#### Internal Team
- Pre-deployment: Technical briefing and rollback procedures
- During deployment: Real-time status updates
- Post-deployment: Success metrics and lessons learned

#### User Communication
- Feature announcement (optional - security features often deployed silently)
- If rollback needed: Transparent communication about temporary issues
- Post-deployment: User guide for session management features

## References

- [Stack Exchange: Secure Remember Me Implementation](https://security.stackexchange.com/questions/281357/best-implementation-or-methods-practices-for-making-a-secure-as-possible-remem)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Using HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

---

**Status**: Planning Phase  
**Last Updated**: January 2025  
**Next Review**: After Phase 1 completion

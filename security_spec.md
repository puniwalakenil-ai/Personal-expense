# Security Specification: Strictly Private Personal Finance Vault

## 1. Data Invariants
1. Only the verified owner (`puniwalakenil@gmail.com`) can authenticate, read, write, or delete any financial records.
2. All financial records (bank accounts, transactions, categories, credit cards, loans, UPI, saved item names, settings) belong strictly under the path `/users/{userId}/...` where `userId == request.auth.uid`.
3. Unauthenticated requests are rejected immediately across all documents and collections (`request.auth != null`).
4. Other authenticated users (any email != `puniwalakenil@gmail.com`) are rejected with `PERMISSION_DENIED` across all collections and documents.
5. Email verification is mandatory (`request.auth.token.email_verified == true`) to prevent email spoofing attacks.
6. Catch-all `match /{document=**} { allow read, write: if false; }` enforces zero-trust default-deny.
7. Document ID path variables are guarded with `isValidId()` to prevent path injection and ID poisoning attacks.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Unauthenticated Read**: Attempting to `get` `/users/someUser/transactions/tx1` with `request.auth = null`. (Expected: PERMISSION_DENIED)
2. **Unauthenticated Write**: Attempting to create a transaction without signing in. (Expected: PERMISSION_DENIED)
3. **Cross-User Snooping**: Authenticated user B attempting to read user A's `/users/{userA}/bankAccounts`. (Expected: PERMISSION_DENIED)
4. **Cross-User Injection**: User B writing a malicious transaction into `/users/{userA}/transactions`. (Expected: PERMISSION_DENIED)
5. **Spoofed Email Write**: Attacker signs up with `puniwalakenil@gmail.com` without verification (`email_verified = false`). (Expected: PERMISSION_DENIED)
6. **Different Email Access**: Authenticated user with email `other@gmail.com` attempts to create their own `/users/{otherUid}/transactions`. (Expected: PERMISSION_DENIED)
7. **Top-Level Injection**: Attempting to write into `/transactions/tx1` or `/bankAccounts/b1` outside of `/users/`. (Expected: PERMISSION_DENIED)
8. **Malicious ID Poisoning**: Attempting to create a document with a 2048-byte ID or SQL/Script injection chars. (Expected: PERMISSION_DENIED)
9. **Arbitrary Collection Probe**: Attempting to read or query `/secrets`, `/config`, or `/admin`. (Expected: PERMISSION_DENIED)
10. **Shadow Field Attack**: Injecting administrative privilege keys (`isAdmin: true`, `role: 'superadmin'`). (Expected: PERMISSION_DENIED)
11. **Client Where Spoof**: Attempting to list all documents with a wide query without authorized user path. (Expected: PERMISSION_DENIED)
12. **Permanent Data Purge Attack**: An unverified or unauthorized user attempting `delete` on any document. (Expected: PERMISSION_DENIED)

## 3. Red Team Security Audit Outcome
- Global deny-all catchall active.
- Master identity validator: `isAuthorizedOwner(userId)` checks `request.auth.uid == userId && request.auth.token.email == "puniwalakenil@gmail.com" && request.auth.token.email_verified == true`.
- Zero update gaps, zero PII leaks, zero unauthenticated endpoints.

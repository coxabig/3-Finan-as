# Security Specification for Casal Money

## Data Invariants
1. A User must be authenticated and their email verified for most write operations.
2. A User can only access their own profile.
3. A Couple consists of exactly two users (initially one who creates it, then a second who joins).
4. Transactions, Goals, Cards, and Categories must belong to a valid Couple.
5. Users can only access data belonging to the Couple they are currently linked to.
6. Financial records (amount, targetAmount) must be valid numbers.
7. Timestamps like `createdAt` are immutable after creation.
8. Sensitive fields like `uid` and `role` (if any) are protected from self-assignment or modification.

## The Dirty Dozen Payloads (Red Team Tests)

### 1. Identity Spoofing (Forbidden Create)
**Payload:** Create user profile with `uid` of another user.
**Path:** `/users/target_user_id`
**Assert:** PERMISSION_DENIED.

### 2. Relational Orphan (Forbidden Transaction)
**Payload:** Create transaction for a `coupleId` that doesn't exist.
**Path:** `/couples/non_existent_couple/transactions/tx_id`
**Assert:** PERMISSION_DENIED.

### 3. State Shortcut (Forbidden Privilege Escalation)
**Payload:** Update user profile to set `isPremium: true` without payment.
**Path:** `/users/my_user_id`
**Assert:** PERMISSION_DENIED (if premium is protected).

### 4. Shadow Field Attack (Extra Fields)
**Payload:** Create transaction with an extra field `isVerified: true`.
**Path:** `/couples/my_couple_id/transactions/tx_id`
**Assert:** PERMISSION_DENIED.

### 5. ID Poisoning (Long Strings)
**Payload:** Create a document with a 2KB string as ID.
**Path:** `/couples/my_couple_id/transactions/` + "A".repeat(2000)
**Assert:** PERMISSION_DENIED.

### 6. PII Leak (Unauthorized Read)
**Payload:** Unauthorized user attempting to read `/users/another_user_id`.
**Path:** `/users/another_user_id`
**Assert:** PERMISSION_DENIED.

### 7. Denial of Wallet (Resource Exhaustion)
**Payload:** Update a field with a 1MB string of junk data.
**Path:** `/couples/my_couple_id/transactions/tx_id`
**Assert:** PERMISSION_DENIED (due to .size() limits).

### 8. Immutable Field Violation (Resetting Date)
**Payload:** Update `createdAt` to a time in the future.
**Path:** `/couples/my_couple_id/transactions/tx_id`
**Assert:** PERMISSION_DENIED.

### 9. Cross-Couple Injection
**Payload:** User from Couple A trying to write to Couple B subcollections.
**Path:** `/couples/couple_b_id/transactions/tx_id`
**Assert:** PERMISSION_DENIED.

### 10. Email Verification Bypass
**Payload:** User with `email_verified: false` attempting to create a transaction.
**Path:** `/couples/my_couple_id/transactions/tx_id`
**Assert:** PERMISSION_DENIED.

### 11. Self-Joining Attack
**Payload:** User attempting to join a couple where they are already `user1`.
**Path:** `/couples/my_couple_id`
**Assert:** PERMISSION_DENIED.

### 12. Negative Value Poisoning
**Payload:** Create a transaction with `amount: -999999` (unless valid for dividends).
**Path:** `/couples/my_couple_id/transactions/tx_id`
**Assert:** PERMISSION_DENIED (if strictly positive enforced).

# Security Specification - 3% (Three Percent)

## Data Invariants
1. A user cannot exist without a valid UID and primary email.
2. A couple must have at least one owner (user1).
3. A transaction must belong to a couple and have a valid ownerId (the user who created it).
4. Transactions must have a valid month format (YYYY-MM).
5. Access to transactions is strictly limited to members of the parent couple.

## The Dirty Dozen Payloads (Rejection Targets)

1. **Identity Theft (User Profile)**: `patch /users/other-user-id { "revenue": 1000000 }`
2. **Ghost User**: `create /users/random-id { "displayName": "Attacker", "email": "evil@attacker.com" }` (UID mismatch)
3. **Shadow Field**: `create /users/my-id { "isAdmin": true, ... }`
4. **Couple Hijack**: `patch /couples/some-couple-id { "user1": "attacker-id" }`
5. **Unauthorized Transaction**: `create /couples/not-my-couple/transactions/tx1 { "amount": 10, ... }`
6. **Time Spoofing**: `create /transactions/tx1 { "createdAt": 0 }` (Not server timestamp)
7. **Orphaned Transaction**: `create /couples/non-existent/transactions/tx1 { ... }`
8. **Invalid Month**: `create /transactions/tx1 { "month": "2024-13" }`
9. **List Scraping**: `list /users` (Should fail without specific filter or ownership)
10. **Partner Impersonation**: `create /transactions/tx1 { "ownerId": "partner-id" }` (UID mismatch)
11. **Negative Amount**: `create /transactions/tx1 { "amount": -100 }` (Validation should catch this)
12. **Junk ID**: `get /couples/!@#$%^&*()` (isValidId filter)

## Test Runner Logic
The `firestore.rules` will be tested using the above scenarios.

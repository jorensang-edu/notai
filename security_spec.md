# Firebase Security Specification

## Data Invariants
- `CourseParams` must only be modified by teachers (since we use anonymous auth and a shared password flow, we'll allow anonymous read and write but rely on client for UI, but limit fields to correct types).
- `Activity` must have valid fields and name lengths.
- `Grade` must refer to a valid activityId (but for simplicity and since it's an educational prototype with anonymous auth, we'll allow anonymous writes).
- Since this application uses a custom password mechanism (`teacher_passwords.json`) on the client to distinguish teachers and students, and requires real-time syncing for all without forcing real Firebase account creation, we will allow any signed-in anonymous user to read/write but strictly enforce the data schemas via `isValid*` functions.

## The "Dirty Dozen" Payloads
1. CourseParams with missing `institution`
2. CourseParams with invalid `trimestre` string
3. Activity with `name` exceeding 150 chars
4. Activity missing `date`
5. Grade missing `studentId`
6. Grade with `observation` exceeding 500 chars
7. ClassNote missing `text`
8. ClassNote with `text` exceeding 5000 chars
9. Grade with a `ghostField`
10. Activity with a `ghostField`
11. Update Activity changing a field to incorrect type
12. Update Grade without required `lastUpdated`

## The Test Runner (Conceptual)
Will create a `firestore.rules.test.ts` to ensure that even anonymous users can't write invalid schema data.

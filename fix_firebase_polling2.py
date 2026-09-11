import re

with open('src/firebase.ts', 'r') as f:
    content = f.read()

# Try experimentalAutoDetectLongPolling instead
old_db = """export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);"""

new_db = """export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);"""

content = content.replace(old_db, new_db)

with open('src/firebase.ts', 'w') as f:
    f.write(content)

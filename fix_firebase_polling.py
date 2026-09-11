import re

with open('src/firebase.ts', 'r') as f:
    content = f.read()

# Replace getFirestore with initializeFirestore
content = content.replace("import { getFirestore } from 'firebase/firestore';", "import { getFirestore, initializeFirestore } from 'firebase/firestore';")

# Replace export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
# with initializeFirestore
old_db = "export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);"
new_db = """export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);"""

content = content.replace(old_db, new_db)

with open('src/firebase.ts', 'w') as f:
    f.write(content)

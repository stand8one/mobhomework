const admin = require('firebase-admin');
var app = admin.initializeApp({ projectId: 'anti-project-38f8d' });
const db = admin.firestore();
async function run() {
  const users = await db.collection('users').get();
  for (const doc of users.docs) {
    const sessions = await db.collection('users/' + doc.id + '/sessions').orderBy('startedAt', 'desc').get();
    if (!sessions.empty) {
      const sessionId = sessions.docs[0].id;
      const questions = await db.collection('users/' + doc.id + '/sessions/' + sessionId + '/questions').get();
      console.log('--- FOUND ' + questions.size + ' QUESTIONS in SESSION ' + sessionId + ' ---');
      questions.docs.forEach((q, idx) => {
        const data = q.data();
        console.log('Question ' + (idx + 1) + ':\\n' + data.content + '\\n---');
      });
      return;
    }
  }
}
run().catch(console.error);

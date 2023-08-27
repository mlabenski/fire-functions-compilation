const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({
  projectId: 'swimpractices-92836',
  keyFilename: './service-account-key.json'
});

async function reformatTotalTime() {
  const practicesRef = db.collection('practices');
  const snapshot = await practicesRef.get();

  const batch = db.batch();

  snapshot.forEach((doc) => {
    const practiceData = doc.data();

    // If totalTime exists and matches the given format, then reformat it
    if (practiceData.totalTime && /(\d+)\s*hours:\s*(\d+)\s*minutes/.test(practiceData.totalTime)) {
      const matches = practiceData.totalTime.match(/(\d+)\s*hours:\s*(\d+)\s*minutes/);
      const formattedTime = `${matches[1]}:${matches[2].padStart(2, '0')}`; // Ensure minutes is always two digits
      practiceData.totalTime = formattedTime;

      const practiceRef = practicesRef.doc(doc.id);
      batch.update(practiceRef, { totalTime: formattedTime });
    }
  });

  await batch.commit();
  console.log("All practices' totalTime field updated successfully.");
}

reformatTotalTime().then(() => {
  console.log('Completed!');
}).catch((error) => {
  console.error("Error updating practices:", error);
});

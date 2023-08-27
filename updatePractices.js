const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function analyzePractice(practiceData) {
    let primaryStrokeCounts = {
        freestyle: 0,
        backstroke: 0,
        breaststroke: 0,
        butterfly: 0,
        "individual medley": 0
    };
    let totalExercises = 0;
    let totalTimeSeconds = 0; // Will hold the total time in seconds

    // Analyze each set's exercises
    console.log(practiceData);
    for (const set of practiceData.sets) {
        for (const exercise of set.exercises) {
            totalExercises++;

            // Increment the primary stroke counter if the name includes the stroke name
            for (const stroke in primaryStrokeCounts) {
                if (exercise.name) {
                    if (exercise.name.toLowerCase().includes(stroke)) {
                        primaryStrokeCounts[stroke]++;
                    }
                }
                else {
                    primaryStrokeCounts[0]++;
                }
            }

            // We assume each exercise has a 'quantity' and 'interval' property.
            totalTimeSeconds += exercise.quantity * exercise.interval;
        }
    }

    // Determine primary stroke based on the counts
    let primaryStroke = "Freestyle"; // Default value
    let maxCount = 0;
    for (const stroke in primaryStrokeCounts) {
        if (primaryStrokeCounts[stroke] > maxCount) {
            maxCount = primaryStrokeCounts[stroke];
            primaryStroke = stroke.charAt(0).toUpperCase() + stroke.slice(1);
        }
    }

    // Determine if sprints or distance
    const sprintExercises = practiceData.sets.reduce((count, set) => {
        for (const exercise of set.exercises) {
            if (exercise.distance <= 250) {
                count++;
            }
        }
        return count;
    }, 0);
    let practiceType = sprintExercises > totalExercises / 2 ? "sprints" : "distance";

    // Convert totalTimeSeconds to the format "xx hours:xx minutes"
    const hours = Math.floor(totalTimeSeconds / 3600);
    const minutes = (totalTimeSeconds % 3600) / 60;
    const totalTime = `${hours} hours:${Math.round(minutes)} minutes`;

    return {
        primaryStroke,
        practiceType,
        totalTime
    };
}



async function analyzeAndUpdatePractices() {
    const practicesRef = db.collection('practices');
    const snapshot = await practicesRef.get();
  
    const batch = db.batch();
  
    const tasks = snapshot.docs.map(async (doc) => {
      const practiceData = doc.data();
      const analyzedData = await analyzePractice(practiceData);
  
      const practiceRef = practicesRef.doc(doc.id);
      batch.update(practiceRef, analyzedData);
    });
  
    await Promise.all(tasks);  // This will ensure all analyzePractice calls are finished
  
    await batch.commit();
    console.log("All practices updated successfully.");
  }

// Call the function
analyzeAndUpdatePractices().then(() => {
  console.log("Execution completed.");
}).catch((error) => {
  console.error("Error updating practices:", error);
});

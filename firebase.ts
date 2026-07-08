import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  deleteUser, 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { UserProfile, StudyLog, PlannerTask } from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Connection on Startup as required by Firebase skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client appears to be offline. Local persistence will handle states.");
    }
  }
}
testConnection();

// Initial Default User Profile values
const DEFAULT_PREFERENCES = {
  timerWorkMinutes: 25,
  timerBreakMinutes: 5,
  timerLongBreakMinutes: 15,
  timerLongBreakInterval: 4,
  theme: 'warm-cozy',
  timeFont: 'font-timer-mono',
  ambientSound: 'none',
  soundEnabled: true,
  notificationsEnabled: true,
};

// Create or retrieve user profile
export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', user.uid);
  const userSnapshot = await getDoc(userDocRef);

  if (userSnapshot.exists()) {
    return userSnapshot.data() as UserProfile;
  }

  // Create new profile
  const newProfile: UserProfile = {
    userId: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Cozy Scholar',
    email: user.email || '',
    country: 'United States', // Default country
    createdAt: new Date().toISOString(),
    isPremium: false, // Free tier by default
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: '',
    totalMinutesStudied: 0,
    badges: [],
    ...DEFAULT_PREFERENCES
  };

  await setDoc(userDocRef, newProfile);
  return newProfile;
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, updates);
}

// Log a study session
export async function logStudySession(
  userId: string, 
  durationMinutes: number, 
  subject: string, 
  xpGained: number
): Promise<{ log: StudyLog; levelUp: boolean; newLevel: number; badgesUnlocked: string[] }> {
  
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time
  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  
  if (!userSnap.exists()) {
    throw new Error("User profile not found");
  }
  
  const userProfile = userSnap.data() as UserProfile;
  
  // Calculate Streaks
  let currentStreak = userProfile.currentStreak;
  let longestStreak = userProfile.longestStreak;
  const lastStudyDate = userProfile.lastStudyDate;
  
  if (!lastStudyDate) {
    // First session ever
    currentStreak = 1;
    longestStreak = 1;
  } else {
    const lastDate = new Date(lastStudyDate);
    const todayDate = new Date(todayStr);
    const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // Studied yesterday, increment streak
      currentStreak += 1;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    } else if (diffDays > 1) {
      // Streak broken, reset to 1
      currentStreak = 1;
    }
    // If diffDays === 0, already studied today, streak remains unchanged
  }
  
  // XP formula: 1 min = 1 XP (minimum 1)
  const actualXpGained = Math.max(1, Math.round(durationMinutes));

  // Calculate XP & Level Progression
  const newXp = (userProfile.xp || 0) + actualXpGained;
  // 100 XP per level formula (e.g. Level 1 needs 100 XP for Level 2)
  const newLevel = Math.floor(newXp / 100) + 1;
  const levelUp = newLevel > (userProfile.level || 1);
  
  const totalMinutes = (userProfile.totalMinutesStudied || 0) + durationMinutes;

  // Query previous study sessions count to check speed-demon badge
  let totalSessionsCount = 1;
  try {
    const logsColRef = collection(db, 'users', userId, 'studyLogs');
    const logsSnap = await getDocs(logsColRef);
    totalSessionsCount = logsSnap.size + 1;
  } catch (err) {
    console.error("Error fetching sessions for badge:", err);
  }
  
  // Check Badges
  const newlyUnlockedBadges: string[] = [];
  const currentBadges = [...(userProfile.badges || [])];
  
  const checkBadge = (badgeId: string, condition: boolean) => {
    if (condition && !currentBadges.includes(badgeId)) {
      currentBadges.push(badgeId);
      newlyUnlockedBadges.push(badgeId);
    }
  };
  
  // Badge Definitions & Conditions
  checkBadge('first-step', true); // Completed first session
  checkBadge('streak-3', currentStreak >= 3);
  checkBadge('streak-7', currentStreak >= 7);
  checkBadge('streak-14', currentStreak >= 14);
  checkBadge('streak-30', currentStreak >= 30);
  checkBadge('studious-5h', totalMinutes >= 300); // 5 hours studied
  checkBadge('studious-24h', totalMinutes >= 1440); // 24 hours studied
  checkBadge('studious-50h', totalMinutes >= 3000); // 50 hours studied
  
  // Night Owl Badge: Session completed between 11 PM and 4 AM local time
  const currentHour = new Date().getHours();
  checkBadge('night-owl', currentHour >= 23 || currentHour < 4);
  
  // Early Bird Badge: Session completed between 5 AM and 8 AM
  checkBadge('early-bird', currentHour >= 5 && currentHour < 9);

  // New Custom Badges
  checkBadge('globe-trotter', !!userProfile.country);
  checkBadge('deep-thinker', durationMinutes >= 45);
  checkBadge('speed-demon', totalSessionsCount >= 5);
  checkBadge('grandmaster', newLevel >= 10);

  // 8 More Custom Badges
  checkBadge('monk-mode', durationMinutes >= 90);
  checkBadge('knowledge-sponge', totalSessionsCount >= 30);
  checkBadge('scholarly-century', totalSessionsCount >= 100);
  checkBadge('zen-master', userProfile.ambientSound !== 'none');
  checkBadge('weekend-warrior', new Date().getDay() === 0 || new Date().getDay() === 6);
  checkBadge('creative-genius', ['matcha-latte', 'lavender-mist', 'pastel-dream', 'peach-sorbet', 'ocean-breeze', 'autumn-leaves'].includes(userProfile.theme || ''));
  checkBadge('customizer', !!userProfile.timeFont && userProfile.timeFont !== 'font-timer-mono');
  checkBadge('perfectionist', durationMinutes >= 25);

  // Update User Profile in Firestore
  const updatedProfile: Partial<UserProfile> = {
    xp: newXp,
    level: newLevel,
    currentStreak,
    longestStreak,
    lastStudyDate: todayStr,
    totalMinutesStudied: totalMinutes,
    badges: currentBadges
  };
  
  await updateDoc(userDocRef, updatedProfile);
  
  // Add to studyLogs subcollection
  const studyLogsColRef = collection(db, 'users', userId, 'studyLogs');
  const newLogRef = doc(studyLogsColRef);
  const newLog: StudyLog = {
    logId: newLogRef.id,
    userId,
    startTime: new Date(Date.now() - durationMinutes * 60 * 1000).toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes,
    subject: subject || 'General Study',
    xpGained: actualXpGained,
    createdAt: new Date().toISOString()
  };
  
  await setDoc(newLogRef, newLog);
  
  return {
    log: newLog,
    levelUp,
    newLevel,
    badgesUnlocked: newlyUnlockedBadges
  };
}

// Fetch study logs for a user
export async function getStudyLogs(userId: string): Promise<StudyLog[]> {
  const studyLogsColRef = collection(db, 'users', userId, 'studyLogs');
  const q = query(studyLogsColRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  
  const logs: StudyLog[] = [];
  snap.forEach(doc => {
    logs.push(doc.data() as StudyLog);
  });
  return logs;
}

// Complete data deletion (GDPR / "Delete my account" requirement)
export async function deleteUserAccountData(userId: string): Promise<void> {
  const batch = writeBatch(db);
  
  // 1. Delete all study logs
  const studyLogsColRef = collection(db, 'users', userId, 'studyLogs');
  const studyLogsSnap = await getDocs(studyLogsColRef);
  studyLogsSnap.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // 2. Delete user profile
  const userDocRef = doc(db, 'users', userId);
  batch.delete(userDocRef);
  
  await batch.commit();
  
  // 3. Delete Firebase Auth user
  const currentUser = auth.currentUser;
  if (currentUser && currentUser.uid === userId) {
    await deleteUser(currentUser);
  }
}

// --- MINI CALENDAR & STUDY PLANNER FIRESTORE HELPER FUNCTIONS ---

export async function getPlannerTasks(userId: string): Promise<PlannerTask[]> {
  const colRef = collection(db, 'users', userId, 'plannerTasks');
  const snap = await getDocs(colRef);
  const tasks: PlannerTask[] = [];
  snap.forEach(doc => {
    tasks.push(doc.data() as PlannerTask);
  });
  return tasks;
}

export async function savePlannerTask(userId: string, task: PlannerTask): Promise<void> {
  const docRef = doc(db, 'users', userId, 'plannerTasks', task.taskId);
  await setDoc(docRef, task);
}

export async function deletePlannerTask(userId: string, taskId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'plannerTasks', taskId);
  await deleteDoc(docRef);
}

export async function checkPlannerBadges(userId: string): Promise<string[]> {
  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists()) return [];

  const userProfile = userSnap.data() as UserProfile;
  const currentBadges = [...(userProfile.badges || [])];
  const newlyUnlocked: string[] = [];

  const colRef = collection(db, 'users', userId, 'plannerTasks');
  const snap = await getDocs(colRef);
  
  const tasks: PlannerTask[] = [];
  snap.forEach(doc => {
    tasks.push(doc.data() as PlannerTask);
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const uniqueDatesCount = new Set(tasks.map(t => t.date)).size;

  const checkBadge = (badgeId: string, condition: boolean) => {
    if (condition && !currentBadges.includes(badgeId)) {
      currentBadges.push(badgeId);
      newlyUnlocked.push(badgeId);
    }
  };

  checkBadge('task-slayer', completedCount >= 10);
  checkBadge('planner-master', uniqueDatesCount >= 3);

  if (newlyUnlocked.length > 0) {
    await updateDoc(userDocRef, { badges: currentBadges });
  }

  return newlyUnlocked;
}

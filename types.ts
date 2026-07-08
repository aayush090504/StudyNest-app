export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  country?: string;
  createdAt: string;
  isPremium: boolean;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string; // YYYY-MM-DD
  totalMinutesStudied: number;
  badges: string[];
  
  // Custom timer preferences
  timerWorkMinutes: number;
  timerBreakMinutes: number;
  timerLongBreakMinutes: number;
  timerLongBreakInterval: number;
  
  // Aesthetic preferences
  theme: string;
  timeFont?: string;
  ambientSound: string;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface PlannerTask {
  taskId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface StudyLog {
  logId: string;
  userId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  subject: string;
  xpGained: number;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  condition: string;
}

export interface Theme {
  id: string;
  name: string;
  isPremium: boolean;
  className: string; // Tailwind classes for theme container
  colors: {
    bg: string;
    card: string;
    text: string;
    primary: string;
    primaryHover: string;
    accent: string;
    muted: string;
    border: string;
  };
}

export interface AmbientSound {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  isPremium: boolean;
  type: 'synthesized' | 'url';
  synthType?: 'rain' | 'campfire' | 'nebula' | 'cafe';
}

export interface LearningPath { id: string; title: string; description: string; difficulty: "beginner" | "intermediate" | "advanced"; modules: { id: string; title: string; lessons: string[]; }[]; estimatedHours: number; }
export interface UserProgress { userId: string; pathId: string; completedLessons: string[]; startedAt: Date; lastAccessed: Date; }
class LearningPathsService {
  private paths: LearningPath[] = [
    { id: "web-basics", title: "Web Development Basics", description: "Learn HTML, CSS, and JavaScript", difficulty: "beginner", modules: [{ id: "html", title: "HTML Fundamentals", lessons: ["intro-html", "elements", "forms"] }, { id: "css", title: "CSS Styling", lessons: ["selectors", "layout", "responsive"] }], estimatedHours: 10 },
    { id: "react-mastery", title: "React Mastery", description: "Build modern React applications", difficulty: "intermediate", modules: [{ id: "hooks", title: "React Hooks", lessons: ["useState", "useEffect", "custom-hooks"] }, { id: "patterns", title: "Design Patterns", lessons: ["composition", "render-props", "hoc"] }], estimatedHours: 20 },
    { id: "devops", title: "DevOps & Deployment", description: "CI/CD, containers, and cloud", difficulty: "advanced", modules: [{ id: "containers", title: "Containers", lessons: ["docker-basics", "compose", "k8s-intro"] }], estimatedHours: 30 },
  ];
  private progress: Map<string, UserProgress> = new Map();
  list(): LearningPath[] { return this.paths; }
  get(id: string): LearningPath | null { return this.paths.find(p => p.id === id) || null; }
  getProgress(userId: string, pathId: string): UserProgress | null { return this.progress.get(`${userId}-${pathId}`) || null; }
  completeLesson(userId: string, pathId: string, lessonId: string): UserProgress {
    const key = `${userId}-${pathId}`;
    const p = this.progress.get(key) || { userId, pathId, completedLessons: [], startedAt: new Date(), lastAccessed: new Date() };
    if (!p.completedLessons.includes(lessonId)) p.completedLessons.push(lessonId);
    p.lastAccessed = new Date(); this.progress.set(key, p); return p;
  }
}
export const learningPathsService = new LearningPathsService();

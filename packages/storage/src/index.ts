export {
  openDatabase,
  resetDatabase,
  type OpenEduDB,
  type StoredCourse,
  type LearningProgress,
  type SearchIndex,
  type UserPreferences,
  type BadgeData,
  type CardProgressData,
} from './db.js';
export { saveCourse, getCourse, listCourses, deleteCourse } from './course-store.js';
export {
  saveProgress,
  getProgress,
  getCourseProgress,
  getAllCourseProgress,
  deleteCourseProgress,
} from './progress-store.js';
export { saveSearchIndex, getSearchIndex, deleteSearchIndex } from './search-store.js';
export { savePreferences, getPreferences, deletePreferences } from './prefs-store.js';
export {
  saveBadge,
  getBadges,
  getAllBadges as getAllBadgeRecords,
  deleteAllBadges,
} from './badge-store.js';
export { saveCard, getCard, getAllCards, deleteAllCards } from './card-store.js';

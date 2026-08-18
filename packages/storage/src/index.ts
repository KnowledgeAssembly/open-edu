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
export {
  type StoredStudioCourse,
  type StoredStudioFile,
  type StoredStudioDraft,
  type StudioCourseSource,
} from './db.js';
export {
  saveStudioCourse,
  getStudioCourse,
  listStudioCourses,
  replaceStudioCourse,
  deleteStudioCourse,
} from './studio-course-store.js';
export {
  saveStudioDraft,
  getStudioDraft,
  listStudioDrafts,
  listStudioDraftsByCourse,
  deleteStudioDraft,
} from './studio-draft-store.js';
export { saveCourse, getCourse, listCourses, deleteCourse, replaceCourse } from './course-store.js';
export { saveBundle, getBundle, listBundles, replaceBundle, deleteBundle } from './bundle-store.js';
export { type DistributionMeta, type StoredBundle, type StoredBundleModule } from './db.js';
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
  deleteBadges,
} from './badge-store.js';
export { saveCard, getCard, getAllCards, deleteAllCards } from './card-store.js';
export { type NoteRecord, type NoteTagRecord } from './db.js';
export {
  saveNote,
  getNote,
  listNotes,
  deleteNote,
  setNoteFavorite,
  addNoteTag,
  removeNoteTag,
  getNoteTags,
  listAllTags,
  bulkPutNotes,
  deleteNotesByLesson,
  deleteNotesByCourse,
} from './note-store.js';

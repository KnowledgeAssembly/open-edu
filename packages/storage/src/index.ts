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
  type StoredPendingDraft,
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
export {
  savePendingDraft,
  getPendingDraft,
  listPendingDraftsByCourse,
  deletePendingDraft,
} from './pending-draft-store.js';
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
export type {
  CourseWorkspace,
  FileStat,
  WorkspaceEntry,
  WorkspaceKind,
} from './workspace/types.js';
export {
  WorkspaceError,
  WorkspaceNotFoundError,
  WorkspacePathError,
  WorkspacePermissionError,
  WorkspaceConflictError,
  WorkspaceTransactionError,
  WorkspaceUnavailableError,
} from './workspace/errors.js';
export { normalizeCoursePath, assertSafeCoursePath, isTextCourseFile } from './workspace/paths.js';
export { MemoryWorkspace } from './workspace/memory-workspace.js';
export { walkWorkspace, type WorkspaceFile } from './workspace/walk.js';
export {
  OpfsCourseRepository,
  type CourseRepository,
  type CourseInfo,
  COURSE_MANIFEST_DIR,
  COURSE_MANIFEST_PATH,
} from './workspace/course-repository.js';
export { MemoryCourseRepository } from './workspace/memory-course-repository.js';
export {
  getOpfsRoot,
  OpfsUnsupportedError,
  OpfsQuotaError,
} from './workspace/opfs-availability.js';
export { OPFSWorkspace } from './workspace/opfs-workspace.js';
export type { WorkspaceChange, WorkspaceChangeSet } from './workspace/change.js';
export { createChangeSet } from './workspace/change.js';
export {
  createTransaction,
  WorkspaceTransactionImpl,
  type WorkspaceTransaction,
  type CommitResult,
  type ValidationResult as WorkspaceValidationResult,
} from './workspace/transaction.js';
export { hashBytes, sha256Hex } from './workspace/hash.js';
export { buildFileIndexFromWorkspace, rebuildFileIndex } from './workspace/index-builder.js';
export {
  putFileIndexRecord,
  getFileIndexRecord,
  listFileIndexRecords,
  listAllFileIndexRecords,
  deleteFileIndexRecord,
  clearFileIndex,
} from './file-index-store.js';
export {
  saveHistoryEntry,
  getHistoryEntry,
  listHistory,
  listAllHistory,
  deleteHistoryEntry,
  clearHistory,
  type HistoryEntry,
} from './history-store.js';
export {
  saveWorkspaceSearchIndex,
  getWorkspaceSearchIndex,
  listWorkspaceSearchIndexes,
  deleteWorkspaceSearchIndex,
  clearWorkspaceSearchIndexes,
} from './search-index-store.js';
export { undo, redo, type UndoRedoResult } from './workspace/undo.js';
export type {
  IndexedFile,
  WorkspaceRecord,
  HistoryEntryRecord,
  AiSessionRecord,
  WorkspaceSearchIndexRecord,
} from './db.js';

import { initAudio } from "./core/audio.js";
import { initPageTemplate } from "./rooms/page-template.js";
import { initMenu } from "./core/menu.js?v=20260919-entry-context";
import { initMenuSound } from "./core/menu-sound.js";
import { initPresentationLock } from "./core/presentation-lock.js";
import { initRoomController } from "./core/room-controller.js";
import { initDocumentary } from "./rooms/documentary.js";
import { initFieldNotes } from "./rooms/field-notes.js";
import { initCollections } from "./rooms/collections.js";
import { initOpening } from "./rooms/founder.js?v=20260919-loading-preview";
import { initFounderHub } from "./rooms/founder-hub.js";
import { initFounderMission } from "./rooms/founder-mission.js";
import { initWaitlist } from "./services/waitlist.js";
import { initLauncher } from "./core/launcher.js?v=20260919-entry-context";
import { initExternalEntry } from "./core/external-entry.js?v=20260919-entry-context";
import { initTouchFeedback } from "./core/touch-feedback.js";
import { initPerformanceTier } from "./core/performance-tier.js";
import { initOrientationGuard } from "./core/orientation-guard.js";

initPerformanceTier();
initOrientationGuard();
initWaitlist();
initPageTemplate();
initAudio();
initMenuSound();
initMenu();
initLauncher();
initTouchFeedback();
initPresentationLock();
initRoomController();
initOpening();
initFounderHub();
initFounderMission();
initFieldNotes();
initDocumentary();
initCollections();

// Run external-entry routing only after the normal PoG controllers/listeners
// are mounted. Direct visitors still remain on the PoG desktop.
initExternalEntry();

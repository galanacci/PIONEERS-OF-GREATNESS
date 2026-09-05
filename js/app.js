import { initAudio } from "./core/audio.js";
import { initMenu } from "./core/menu.js";
import { initRoomController } from "./core/room-controller.js";
import { initDocumentary } from "./rooms/documentary.js";
import { initFieldNotes } from "./rooms/field-notes.js";
import { initFounder } from "./rooms/founder.js";
import { initFounderMission } from "./rooms/founder-mission.js";
import { initWaitlist } from "./services/waitlist.js";

initWaitlist();
initAudio();
initMenu();
initRoomController();
initFounder();
initFounderMission();
initFieldNotes();
initDocumentary();

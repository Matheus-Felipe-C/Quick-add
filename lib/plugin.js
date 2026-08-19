import { AppActions } from "./actions/appActions";
import { dailyJotActions } from "./actions/dailyJotActions";
import { insertTextActions } from "./actions/insertTextActions";
import { taskActions } from "./actions/taskActions";
import { CONSTANTS } from "./constants";

const wrapError = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch(err) {
    console.error(err);
    args[0]?.alert?.(err.message || err);
  }
};

const plugin = {
  constants: CONSTANTS,

  appOption: {
    "Insert content inside a note": wrapError((app) => AppActions.insertContentPrompt(app)),
    "Add journal entry to today's jot": wrapError((app) => AppActions.addJournalEntry(app)),
  },

  insertText: {
    "Insert time now": wrapError((app) => insertTextActions.insertTimeNow(app)),
  },

  dailyJotOption: {
    "Publish schedule to Jot": wrapError((app, noteHandle) => dailyJotActions.publishScheduleToJot(app, noteHandle)),
  },

  taskOption: {
    "Schedule task as All Day": wrapError((app, task) => taskActions.scheduleAllDay(app, task)),
  },
}

export default plugin;

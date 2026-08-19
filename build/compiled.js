(() => {
  // lib/operations/noteOperations.js
  async function insertContent(app, text, textFormat, noteUUID) {
    const note = await app.notes.find(noteUUID);
    if (textFormat === "bullet") text = `- ${text}`;
    if (textFormat === "task") {
      await note.insertTask({ content: text });
    } else {
      await note.insertContent(text);
    }
  }
  async function createNewNotePrompt(app) {
    const [noteName, noteTags] = await app.prompt("Add information about the note below", {
      inputs: [
        { label: "Note Name", type: "text" },
        { label: "Add tags (optional, max of 10)", type: "tags", limit: 10 }
      ]
    });
    if (!noteName) throw new Error("Note name cannot be empty");
    const noteTagArray = noteTags ? noteTags.split(",") : [];
    const noteUUID = await app.createNote(noteName, noteTagArray);
    if (!noteUUID) throw new Error("Note could not be created");
    return await app.findNote({ uuid: noteUUID });
  }

  // lib/actions/appActions.js
  var AppActions = {
    /**
     * Opens a prompt to add content inside the note.
     * Calls a the function `_insertContent` to properly insert the content.
     * @param {any} app
     * @returns {void}
     */
    async insertContentPrompt(app) {
      const noteHandles = await app.filterNotes();
      const result = await app.prompt("Insert content inside a note", {
        inputs: [
          { label: "Text to add", type: "text" },
          {
            label: "Format as",
            type: "select",
            options: [
              { label: "Plain text", value: "plain" },
              { label: "Bullet point", value: "bullet" },
              { label: "Task", value: "task" }
            ]
          },
          { label: "Select a note", type: "note", options: noteHandles },
          { label: "Create new note?", type: "checkbox" }
        ]
      });
      let [text, textFormat, noteResult, createNewNote] = result;
      if (!text) throw new Error("Text field cannot be empty");
      if (!noteResult && !createNewNote) throw new Error("Select a note or choose to create a new one");
      if (createNewNote) noteResult = await createNewNotePrompt(app);
      await insertContent(app, text, textFormat, noteResult.uuid);
      const actionIndex = await app.alert("Content added successfully", {
        actions: [{ icon: "search", label: "See changes in note", value: 2 }]
      });
      if (actionIndex == 2) await app.navigate(`https://www.amplenote.com/notes/${noteResult.uuid}`);
    },
    /**
     * Adds a journal entry to today's jot.
     * If no jot was created yet, calls the function `_createDailyJot.`
     * @param {*} app 
     * @returns {void}
    */
    async addJournalEntry(app) {
      const [text, timeStampCheckbox, tag = CONSTANTS.defaultJotTag] = await app.prompt("Add journal entry to today's jot", {
        inputs: [
          { label: "Text to add", type: "text" },
          { label: "Add current time before the text", type: "checkbox" },
          { label: "Select the tags to add the new note in (default: daily-jots)", type: "tags", limit: 1 }
        ]
      });
      if (!text) throw new Error("Text field cannot be empty");
      const dailyJot = await getOrCreateDailyJot(app, tag || CONSTANTS.defaultJotTag);
      const loggedText = timeStampCheckbox ? `**${calculateCurrentTime()}** ${text}` : text;
      await insertContent(app, loggedText, "bullet", dailyJot.uuid || dailyJot);
      const actionIndex = await app.alert("Journal entry added!", {
        actions: [{ icon: "search", label: "See changes", value: 2 }]
      });
      if (actionIndex === 2) app.navigate(`https://www.amplenote.com/notes/jots?tag=${tag}`);
    }
  };

  // lib/constants.js
  var CONSTANTS2 = {
    formatAsBullet: "false",
    // Change to "true" if you want to format your agenda as bullet points
    defaultJotTag: "daily-jots"
  };

  // lib/helpers.js
  function calculateCurrentTime2(date = /* @__PURE__ */ new Date()) {
    const d = new Date(date.getTime());
    let minutes = d.getMinutes();
    if (minutes < 10) minutes = "0" + minutes.toString();
    const logTime = `${d.getHours()}:${minutes}`;
    return logTime;
  }
  function getTasksDueTodayFromList(taskList, notesToRemove, dateFormat = { month: "long", day: "numeric", year: "numeric" }, todayDate = /* @__PURE__ */ new Date()) {
    const todayStr = todayDate.toLocaleDateString(dateFormat);
    let tasksDueToday = taskList.filter((task) => {
      const startDate = new Date(task.startAt * 1e3).toLocaleDateString(dateFormat);
      if (todayStr !== startDate || task.noteUUID && notesToRemove.includes(task.noteUUID)) {
        return false;
      }
      return task;
    });
    tasksDueToday = tasksDueToday.map((task) => ({
      content: task.content,
      startTime: task.startAt
    }));
    return tasksDueToday;
  }

  // lib/operations/scheduleOperations.js
  async function getTasksDueToday(app, noteUUID) {
    const setting = app.settings["Removed Notes"];
    const taskList = await app.getNoteTasks({ uuid: noteUUID });
    const notesToRemove = setting ? setting.split(";") : [];
    const dateFormat = { month: "long", day: "numeric", year: "numeric" };
    return getTasksDueTodayFromList(taskList, notesToRemove, dateFormat, /* @__PURE__ */ new Date());
  }
  async function publishSchedule(app, noteUUID) {
    const noteHandles = await app.filterNotes({ group: "taskLists" });
    const taskArray = await Promise.all(noteHandles.map((n) => getTasksDueToday(app, n.uuid)));
    const flatTasks = taskArray.flat().filter(Boolean);
    if (flatTasks.length === 0) {
      await insertContent(app, "# Agenda\n\nNo tasks due today.", null, noteUUID);
      return;
    }
    flatTasks.sort((a, b) => (a.startTime || a.startAt || 0) - (b.startTime || b.startAt || 0));
    const todayTasks = flatTasks.map((task) => {
      const rawTimestamp = task.startTime ?? task.startAt;
      const timeFormatted = rawTimestamp ? new Date(rawTimestamp * 1e3).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      }) : "All Day";
      const textContent = task.content || task.name || task.text || "";
      return {
        ...task,
        timeFormatted,
        textContent
      };
    });
    for (const task of todayTasks.reverse()) {
      const text = `**${task.timeFormatted}** ${task.textContent}`;
      const format = CONSTANTS2.formatAsBullet ? "bullet" : "task";
      await insertContent(app, text, format, noteUUID);
    }
    await insertContent(app, "# Agenda\n", null, noteUUID);
  }

  // lib/actions/dailyJotActions.js
  var dailyJotActions = {
    async publishScheduleToJot(app, noteHandle) {
      let note = await app.findNote({ name: noteHandle.name, tags: noteHandle.tags });
      if (!note) {
        const uuid = await app.createNote(noteHandle.name, noteHandle.tags);
        note = await app.findNote({ uuid });
      }
      await publishSchedule(app, note.uuid);
    }
  };

  // lib/actions/insertTextActions.js
  var insertTextActions = {
    /**
     * Has the same functionality as the default `{now}` function, but with a cleaner look
     * @param {*} app 
     */
    async insertTimeNow(app) {
      const text = calculateCurrentTime2();
      const replacedText = await app.context.replaceSelection(`**${text}** |&nbsp;`);
      if (replacedText) return null;
      else return text;
    }
  };

  // lib/actions/taskActions.js
  var taskActions = {
    async scheduleAllDay(app, task) {
      const base = task.startAt ? new Date(task.startAt * 1e3) : /* @__PURE__ */ new Date();
      base.setHours(0, 0, 0, 0);
      const startTime = base.getTime();
      const duration = new Date(startTime + 1440 * 60 * 1e3);
      await app.updateTask(task.uuid, { startAt: startTime / 1e3 });
      const newTask = await app.getTask(task.uuid);
      await app.updateTask(newTask.uuid, { endAt: duration.getTime() / 1e3 });
    }
  };

  // lib/plugin.js
  var wrapError = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error(err);
      args[0]?.alert?.(err.message || err);
    }
  };
  var plugin = {
    constants: CONSTANTS2,
    appOption: {
      "Insert content inside a note": wrapError((app) => AppActions.insertContentPrompt(app)),
      "Add journal entry to today's jot": wrapError((app) => AppActions.addJournalEntry(app))
    },
    insertText: {
      "Insert time now": wrapError((app) => insertTextActions.insertTimeNow(app))
    },
    dailyJotOption: {
      "Publish schedule to Jot": wrapError((app, noteHandle) => dailyJotActions.publishScheduleToJot(app, noteHandle))
    },
    taskOption: {
      "Schedule task as All Day": wrapError((app, task) => taskActions.scheduleAllDay(app, task))
    }
  };
  var plugin_default = plugin;
})();

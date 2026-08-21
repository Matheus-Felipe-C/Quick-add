(() => {
  // lib/constants.js
  var CONSTANTS = {
    formatAsBullet: false,
    // Change to "true" if you want to format your agenda as bullet points
    defaultJotTag: "daily-jots"
  };

  // lib/helpers.js
  function calculateCurrentTime(date = /* @__PURE__ */ new Date()) {
    const d = new Date(date.getTime());
    let minutes = d.getMinutes();
    if (minutes < 10) minutes = "0" + minutes.toString();
    const logTime = `${d.getHours()}:${minutes}`;
    return logTime;
  }
  function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }
  function buildDailyJotTitle(date = /* @__PURE__ */ new Date()) {
    const dt = new Date(date.getTime());
    const options = { month: "long", day: "numeric", year: "numeric" };
    const suffix = getOrdinalSuffix(dt.getDate());
    let today = dt.toLocaleDateString("en", options);
    today = today.split(",");
    today[0] += suffix;
    today = today.join();
    return today;
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

  // lib/operations/jotOperations.js
  async function getOrCreateDailyJot(app, tag) {
    const todayTitle = buildDailyJotTitle();
    let dailyJot = await app.findNote({ name: todayTitle, tags: [tag] });
    if (!dailyJot) {
      const uuid = await app.createNote(todayTitle, [tag]);
      dailyJot = await app.findNote({ uuid });
    }
    return dailyJot;
  }

  // lib/operations/noteOperations.js
  async function insertContent(app, text, textFormat, noteUUID) {
    const note = await app.notes.find(noteUUID);
    console.log("text format: ", textFormat);
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
    // actions/appActions.js
    async addJournalEntry(app) {
      const result = await app.prompt("Add journal entry to today's jot", {
        inputs: [
          { label: "Text to add", type: "text" },
          { label: "Add current time before the text", type: "checkbox" },
          { label: "Select the tags to add the new note in (default: daily-jots)", type: "tags", limit: 1 }
        ]
      });
      let [text, timeStampCheckbox, selectedTag] = result;
      if (!text) throw new Error("Text field cannot be empty");
      const finalTag = selectedTag ? selectedTag.trim() : CONSTANTS.defaultJotTag;
      const dailyJot = await getOrCreateDailyJot(app, finalTag);
      const jotUUID = dailyJot?.uuid || dailyJot;
      const currentTime = await calculateCurrentTime();
      const loggedText = timeStampCheckbox ? `**${currentTime}** ${text}` : text;
      await insertContent(app, loggedText, "bullet", jotUUID);
      const actionIndex = await app.alert("Journal entry added!", {
        actions: [
          { icon: "search", label: "See changes", value: 2 }
        ]
      });
      if (actionIndex === 2) {
        await app.navigate(`https://www.amplenote.com/notes/${jotUUID}`);
      }
    }
  };

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
    const format = CONSTANTS.formatAsBullet ? "bullet" : "task";
    console.log("Format task as: ", format);
    for (const task of todayTasks.reverse()) {
      const text = `**${task.timeFormatted}** ${task.textContent}`;
      await insertContent(app, text, format, noteUUID);
    }
    const externalCalendarEvents = await app.getExternalCalendarEvents({ days: 1 });
    for (const event of externalCalendarEvents) {
      const start = new Date(event.start);
      const formattedStart = start.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
      const text = `**${formattedStart}** ${event.title} (External calendar)`;
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
      const text = calculateCurrentTime();
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
    constants: CONSTANTS,
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
  return plugin;
})()

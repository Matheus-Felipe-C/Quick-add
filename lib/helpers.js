// Pure helper functions extracted from the plugin so they can be unit tested

/**
 * Calculates and returns the current time in 24h format (HH:MM).
 * Accepts an optional Date instance to make testing deterministic.
 * @param {Date} date
 * @returns {string}
 */
export function calculateCurrentTime(date = new Date()) {
  const d = new Date(date.getTime());
  let minutes = d.getMinutes();

  if (minutes < 10) minutes = "0" + minutes.toString();

  const logTime = `${d.getHours()}:${minutes}`;
  return logTime;
}

/**
 * Returns the ordinal suffix for a given day in the month.
 * @param {number} day
 * @returns {string}
 */
export function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return "th";

  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

/**
 * Builds the daily jot title used when searching/creating the note.
 * Matches the behavior previously implemented inside the plugin.
 * @param {Date} date
 * @returns {string}
 */
export function buildDailyJotTitle(date = new Date()) {
  const dt = new Date(date.getTime());
  const options = { month: "long", day: "numeric", year: "numeric" };

  const suffix = getOrdinalSuffix(dt.getDate());

  let today = dt.toLocaleDateString("en", options);
  today = today.split(",");
  today[0] += suffix;
  today = today.join();

  return today;
}

/**
 * Pure data helper that filters a list of tasks to only those due today and
 * maps them into the simplified structure the plugin expects.
 *
 * @param {Array<{ startAt: number, noteUUID?: string, content: string }>} taskList
 * @param {string[]} notesToRemove
 * @param {Intl.DateTimeFormatOptions} dateFormat
 * @param {Date} todayDate
 * @returns {Array<{ content: string, startTime: number }>}
 */
export function getTasksDueTodayFromList(
  taskList,
  notesToRemove,
  dateFormat = { month: "long", day: "numeric", year: "numeric" },
  todayDate = new Date()
) {
  const todayStr = todayDate.toLocaleDateString(dateFormat);

  let tasksDueToday = taskList.filter(task => {
    const startDate = new Date(task.startAt * 1000).toLocaleDateString(dateFormat);

    if (todayStr !== startDate || (task.noteUUID && notesToRemove.includes(task.noteUUID))) {
      return false;
    }
    return task;
  });

  tasksDueToday = tasksDueToday.map(task => ({
    content: task.content,
    startTime: task.startAt,
  }));

  return tasksDueToday;
}


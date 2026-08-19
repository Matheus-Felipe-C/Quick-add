import { CONSTANTS } from "../constants";
import { getTasksDueTodayFromList } from "../helpers";
import { insertContent } from "./noteOperations";

/**
 * Gets all tasks that have a start time for today
 * @param {*} app 
 * @param {string} noteUUID 
 * @returns A map of `NoteHandle`s
 */
export async function getTasksDueToday(app, noteUUID) {
    const setting = app.settings["Removed Notes"];
    const taskList = await app.getNoteTasks({ uuid: noteUUID });
    const notesToRemove = setting ? setting.split(";") : [];
    const dateFormat = { month: "long", day: "numeric", year: "numeric" };

    return getTasksDueTodayFromList(taskList, notesToRemove, dateFormat, new Date());
}

/**
 * Publishes the current day's schedule to the daily jot
 * @param {*} app 
 * @param {String} noteUIID 
 * @returns {void}
 */
export async function publishSchedule(app, noteUUID) {
    
    //Gets the tasks due today
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
        const timeFormatted = rawTimestamp
            ? new Date(rawTimestamp * 1000).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
            })
            : "All Day";

        // Amplenote task object might store text in .content, .name, or .text
        const textContent = task.content || task.name || task.text || "";

        return {
            ...task,
            timeFormatted,
            textContent,
        };
    });

    const format = CONSTANTS.formatAsBullet ? "bullet" : "task";

    for (const task of todayTasks.reverse()) {
        const text = `**${task.timeFormatted}** ${task.textContent}`;
        await insertContent(app, text, format, noteUUID);
    }

    //Gets external calendars events for the current day
    const externalCalendarEvents = await app.getExternalCalendarEvents({ days: 1 });
    
    for (const event of externalCalendarEvents) {
        const start = new Date(event.start);

        const formattedStart = start.toLocaleTimeString('en-US', {
            hour: "2-digit",
            minute: '2-digit',
            hour12: true,
        });

        const text = `**${formattedStart}** ${event.title} (External calendar)`
        await insertContent(app, text, format, noteUUID);
    }

    await insertContent(app, "# Agenda\n", null, noteUUID);

}
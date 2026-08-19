import { buildDailyJotTitle } from "../helpers";

/**
 * Finds a daily jot for the current day, or creates one if it doesn't exist
 * @param {*} app 
 * @param {String} tag 
 * @returns A `NoteHandle` object
 */
export async function getOrCreateDailyJot(app, tag) {
    const todayTitle = buildDailyJotTitle();
    let dailyJot = await app.findNote({ name: todayTitle, tags: [tag] });

    if (!dailyJot) {
        const uuid = await app.createNote(todayTitle, [tag]);
        dailyJot = await app.findNote({ uuid });
    }

    return dailyJot;
}
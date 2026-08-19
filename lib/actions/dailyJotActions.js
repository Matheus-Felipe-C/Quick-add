import { publishSchedule } from "../operations/scheduleOperations";

export const dailyJotActions = {
    async publishScheduleToJot(app, noteHandle) {
        let note = await app.findNote({ name: noteHandle.name, tags: noteHandle.tags });

        if (!note) {
            const uuid = await app.createNote(noteHandle.name, noteHandle.tags);
            note = await app.findNote({ uuid: uuid });
        }

        await publishSchedule(app, note.uuid);
    }
}
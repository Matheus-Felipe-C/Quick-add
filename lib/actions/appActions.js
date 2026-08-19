import { createNewNotePrompt, insertContent } from "../operations/noteOperations";

export const AppActions = {

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
                    label: "Format as", type: "select", options: [
                        { label: "Plain text", value: "plain" },
                        { label: "Bullet point", value: "bullet" },
                        { label: "Task", value: "task" },
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
                { label: "Select the tags to add the new note in (default: daily-jots)", type: "tags", limit: 1 },
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

}
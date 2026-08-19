/**
 * Wrapper function to insert content in a note
 * @param {*} app 
 * @param {String} text 
 * @param {String} textFormat 
 * @param {String} noteUUID 
 */
export async function insertContent(app, text, textFormat, noteUUID) {
    const note = await app.notes.find(noteUUID);

    if (textFormat === 'bullet') text = `- ${text}`;

    if (textFormat === 'task') {
        await note.insertTask({ content: text });
    } else {
        await note.insertContent(text);
    }
}

/**
 * Creates a new note with tags associated.
 * @param {*} app 
 * @returns A NoteHandle object
 */
export async function createNewNotePrompt(app) {
    const [noteName, noteTags] = await app.prompt("Add information about the note below", {
        inputs: [
            { label: "Note Name", type: "text" },
            { label: "Add tags (optional, max of 10)", type: "tags", limit: 10   },
        ],
    });

    if (!noteName) throw new Error("Note name cannot be empty");
    const noteTagArray = noteTags ? noteTags.split(',') : [];

    const noteUUID = await app.createNote(noteName, noteTagArray);

    if (!noteUUID) throw new Error("Note could not be created");

    return await app.findNote({ uuid: noteUUID });
}
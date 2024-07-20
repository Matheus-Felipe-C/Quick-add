const plugin = {

    constants: {
      formatAsBullet: false, // Change to "true" if you want to format your agenda as bullet points
    },
    /*
    * This part only shows calls from the options amd error handling, 
    * the real implementation happens in the functions
    */
    appOption: {
      // Inserts text inside a note
      "Insert content inside a note": async function (app) {
        try {
          await this._insertContentPrompt(app);
        } catch (err) {
          console.log(err);
          app.alert(err);
        }
      },
  
      //Creates a journal entry in today's jot
      "Add journal entry to today's jot": async function (app) {
        try {
          await this._addJournalEntry(app);
        } catch (err) {
          console.log(err);
          app.alert(err);
        }
      },
    },
  
    insertText: {
      //Has the same functionality as the {now} calculation, but with a cleaner look
      "Insert time now": async function (app) {
        try {
          const text = await this._calculateCurrentTime();
          const replacedText = await app.context.replaceSelection(`**${text}** |&nbsp;`); //Adds a whitespace at the end of the string

          if (replacedText) return null;
          else return text;
        } catch (err) {
          console.log(err);
          app.alert(err);
        }
      }
    },
  
    dailyJotOption: {
      "Publish schedule to Jot": async function (app, noteHandle) {
        try {
          console.log(noteHandle);
  
          //Verify if note exists, if not, create a new note
          let note = await app.findNote({ name: noteHandle.name, tags: noteHandle.tags});
  
          if (!note) {
            const uuid = await app.createNote(noteHandle.name, noteHandle.tags);
            note = await app.findNote({ uuid: uuid});
          }
  
          console.log(note);
  
          await this._publishSchedule(app, note.uuid);
        } catch (err) {
          console.log(err);
          app.alert(err);
        }
      }
    },
  
  
    /**
     * Opens a prompt to add content inside the note
     */
    async _insertContentPrompt(app) {
      console.log("Starting insertContentPrompt...");
      const noteHandles = await app.filterNotes();
  
      //Main alert option
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
          { label: "Create new note?", type: "checkbox"}
        ]
      })
  
      //Adds the text inside the note
      let [text, textFormat, noteResult, createNewNote] = result; //Destructures result array to get all of the prompt inputs

      //Error handling if one of the options are empty
      if (!text) throw new Error("Text field cannot be empty");
      if (!noteResult && !createNewNote) throw new Error("Select a note or check the option to create a new one to properly continue");

      if (createNewNote) noteResult = await this._createnewNote(app);
  
      console.log("Calling _insertContent function");
      await this._insertContent(app, text, textFormat, noteResult.uuid);
      console.log("Content added successfully!");
      const actionIndex = await app.alert("Content added successfully!", {
        actions: [
            { icon: "search", label: "See changes in note", value: 2 }
        ]
      });

      if (actionIndex == 2) {
        console.log('Going to edited note');
        await app.navigate(`https://www.amplenote.com/notes/${noteResult.uuid}`);
      }
    },
  
    //Adds a journal entry to today's jot
    async _addJournalEntry(app) {
      console.log("Starting addJournalEntry function...");
  
      const todayTimestamp = Math.floor(Date.now() / 1000);
      let dailyJot = await app.notes.dailyJot(todayTimestamp);
      dailyJot = dailyJot.uuid;
  
      //If today's jot doesn't exist, create a new daily jot
      if (dailyJot == null) {
        console.log("No Daily Jot for today, creating a new jot...");
        dailyJot = await this._createDailyJot(app);
      }
  
      //Main prompt
      const result = await app.prompt("Add journal entry to today's jot", {
        inputs: [
          { label: "Text to add", type: "text" },
          { label: "Add current time before the text", type: "checkbox" },
        ]
      })
  
      const [text, timeStampCheckbox] = result; //Destructuring result array to get all of the prompt inputs
      
      if (!text) throw new Error("Text field cannot be empty");
  
      //Calculates the current time if the user marks the checkbox and adds to the text variable
      if (timeStampCheckbox) {
        const loggedText = "**" + await this._calculateCurrentTime() + "** " + text;
  
        await this._insertContent(app, loggedText, "bullet", dailyJot);
      } else await this._insertContent(app, text, "bullet", dailyJot);

      const actionIndex = await app.alert("Journal entry added!", {
        actions: [
            { icon: "search", label: "See changes", value: 2 }
        ]
      });

      if (actionIndex == 2) {
        console.log('Changing screen to jots mode');
        app.navigate("https://www.amplenote.com/notes/jots");
      }
    },
  
    /**
     * Calculates and returns the current time in the 24 hour format
     * @return "markdown" of the current hour and minute as a String
     */
    async _calculateCurrentTime() {
      console.log("Calculating current time...");
  
      const date = new Date();
      date.setTime(Date.now());
      let minutes = date.getMinutes();
  
      if (minutes < 10) minutes = '0' + minutes.toString(); //Pads the minutes with a 0 if it's smaller than 10
  
      const logTime = date.getHours() + ":" + minutes;
  
      console.log("Current time logged:" + logTime);
  
      return logTime;
    },
  
    /**
     * Creates a new daily jot note
     * @return String of the newly created jot's UUID
     */
    async _createDailyJot(app) {
      const dt = new Date();
      const options = { month: 'long', day: 'numeric', year: 'numeric' }
  
      //Calculates the cardinal suffix
      let suffix;
  
      if (dt.getDate() > 3 && dt.getDate() < 21) suffix = 'th';
      else {
        switch (dt.getDate() % 10) {
          case 1: suffix = 'st'; break;
          case 2: suffix = 'nd'; break;
          case 2: suffix = 'rd'; break;
          case 3: suffix = 'th'; break;
        }
      }
  
      let today = dt.toLocaleDateString('en', options);
  
      today = today.split(',');
  
      today[0] += suffix;
  
      today = today.join();
  
  
      return await app.createNote(today, ['daily-jots']);
  
    },
  
    /**
     * Publishes the current day's schedule to the daily jot
     * @param {*} app 
     * @param {String} noteUIID 
     */
    async _publishSchedule(app, noteUUID) {
      console.log("Starting publish schedule function...");
  
      const noteHandles = await app.filterNotes({ group: 'taskLists' });
  
      console.log("Filtering notes for tasks due today...");
      console.log(`Total notes to filter: ${noteHandles.length}`);
  
      const taskArray = await Promise.all(noteHandles.map(async note => {
        return await this._getTasksDueToday(app, note.uuid);
      }))
      
      const filteredArray = taskArray.filter(el => el.length !== 0);
      
      console.log('Tasks filtered successfully!');
  
      let todayTasks = [];
  
      filteredArray.forEach(array => {
        todayTasks = todayTasks.concat(array);
      })
      
      todayTasks.sort((a, b) => a.startTime - b.startTime);
      
      console.log('Sorting tasks by startTime and transforming it into AM/PM format');
      todayTasks.map(task => {
        const timeFormat = { hour: 'numeric', minute: '2-digit'};
        task.startTime = new Date(task.startTime * 1000).toLocaleTimeString('en-US', timeFormat);
      })
  
      console.log(todayTasks);
  
      console.log('Printing tasks to todays jot...');
  
      console.log(noteUUID);
      
      await Promise.all(todayTasks.reverse().map(async task => {
        const text = '**' + task.startTime + '** ' + task.content;
        const format = (this.constants.formatAsBullet) ? 'bullet' : 'task';
  
        await this._insertContent(app, text, format, noteUUID);
      }));
      await this._insertContent(app, '# Agenda\n', null, noteUUID);
    },
  
    async _getTasksDueToday(app, noteUUID) {
      const taskList = await app.getNoteTasks({ uuid: noteUUID });
      const dateFormat = { month: 'long', day: 'numeric', year: 'numeric' };
  
      let tasksDueToday = taskList.filter(task => {
  
        //Verifies if the start date of the task is the same as 
        const todayDate = new Date().toLocaleDateString(dateFormat);
        const startDate = new Date((task.startAt * 1000)).toLocaleDateString(dateFormat);
  
        if (todayDate !== startDate) {
          return false
        }
        return task;
      });
  
      tasksDueToday = tasksDueToday.map(task => {
        const timeFormat = { hour: 'numeric', minute: '2-digit', hour12: true };
        const obj = {
          content: task.content,
          startTime: task.startAt
        }
        return obj;
      })
  
      return tasksDueToday;
    },
  
    /**
     * General function to insert content inside the note
     * @param {*} app 
     * @param {String} text 
     * @param {String} textFormat - Formatting type of the text
     * @param {String} noteUUID 
     * @returns void
     */
    async _insertContent(app, text, textFormat, noteUUID) {
      /**
       * For some reason, the plugin API doesn't like it when you use the filterNotes function,
       * making it throw exceptions when you directly use a note filtered from it.
       * To circumvent this, use app.notes.find(noteHandle.uuid)
       */
  
      console.log("Starting insertContent function...");
  
      const note = await app.notes.find(noteUUID);
      console.log("text format:" + textFormat)
      console.log(`Text to add: ${text}\nNote to add: ${note.name}`);
  
      if (textFormat === "bullet") text = "- " + text;
      if (textFormat === "task") {
        await note.insertTask({ content: text });
      } else await note.insertContent(text); //This will work, even when textFormat comes as null
  
      console.log("Content added successfully!");
    },

    async _createnewNote(app) {
      const noteInfo = await app.prompt("Add information about the note below", {
        inputs: [
          { label: "Note name", type: "text" },
          { label: "Add tags (Optional, max of 10)", type: "tags", limit: 10 }
        ]
      })

      const [noteName, noteTags] = noteInfo;

      if (!noteName) throw new Error("Note name cannot be empty");

      const noteUUID = await app.createNote(noteName, noteTags);
      console.log("Note UUID: " + noteUUID);

      if (!noteUUID) throw new Error("Note could not be created, notify the plugin author with error logs if this error appears");

      return await app.findNote({ uuid: noteUUID });
    }
  }

export default plugin;
const plugin = {
  dailyJotOption: {
    "Testing": {
      run: async function(app, noteHandle) {
      app.alert(noteHandle.name + ', ' + noteHandle.tags);  
      },
      
      check: async function(app, noteHandle) {
        return false;
      }
    }
  },

}
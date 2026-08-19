import { calculateCurrentTime } from "../helpers"

export const insertTextActions = {
    /**
     * Has the same functionality as the default `{now}` function, but with a cleaner look
     * @param {*} app 
     */
    async insertTimeNow(app) {
        const text = calculateCurrentTime();
        const replacedText = await app.context.replaceSelection(`**${text}** |&nbsp;`); //Adds a whitespace at the end of the string

        if (replacedText) return null;
        else return text;
    }
}
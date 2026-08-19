export const taskActions = {
    async scheduleAllDay(app, task) {
        const base = task.startAt ? new Date(task.startAt * 1000) : new Date();
        base.setHours(0, 0, 0, 0);
        const startTime = base.getTime();
        const duration = new Date(startTime + 1440 * 60 * 1000);

        await app.updateTask(task.uuid, { startAt: startTime / 1000 });
        const newTask = await app.getTask(task.uuid);
        await app.updateTask(newTask.uuid, { endAt: duration.getTime() / 1000 });
    }
}
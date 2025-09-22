export class TaskQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    addTask(taskFn) {
        this.queue.push(taskFn);
        this.processQueue();
    }

    async processQueue() {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const taskFn = this.queue.shift();
            try {
                await taskFn();
            } catch (error) {
                console.error("Error processing task in queue:", error);
            }
        }
        this.isProcessing = false;
    }
}
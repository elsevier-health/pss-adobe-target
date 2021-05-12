export default {
    create: (config) => {
        if (config &&
            config.events &&
            config.events.targetClientReady &&
            config.events.targetClientReady instanceof Function) {

            config.events.targetClientReady();

        }

        return {
            getAttributes: (activities) => {
                return async () => {};
            },
            sendNotifications: (request) => {
                return async () => {};
            }
        };
    }
};
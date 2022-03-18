
// ============================================================
// Requires
// ============================================================

const { validate: uuidValidate, v4: uuidv4 } = require("uuid");
const TargetService = require("../lib/TargetService");
const PssLogger = require("@pss/pss-logger")({
    categories: {
        default: {
            level: process.env.LOG_LEVEL || "info",
            enableCallStack: true
        }
    }
});

// ============================================================
// Variables
// ============================================================

const targetConfig = {
    client: "client",
    organizationId: "organizationId",
    propertyToken: "propertyToken"
};

// ============================================================
// Functions
// ============================================================

const getTargetService = (targetConfig) => {
    TargetService.initializeTargetClient = jest.fn().mockResolvedValue({
        getAttributes: (activities) => {
            return async () => {};
        },
        sendNotifications: (request) => {
            return async () => {};
        }
    });

    const targetService = TargetService(targetConfig, PssLogger);

    return targetService;
};

const validateNotificationRequest = (request, userId, notifications) => {
    expect(request).not.toBe(null);

    expect(request).toBeInstanceOf(Object);

    expect(request).toHaveProperty("id");
    expect(request).toHaveProperty("notifications");

    expect(request.id).toBeInstanceOf(Object);
    expect(request.notifications).toBeInstanceOf(Array);

    expect(request.notifications).toHaveLength(notifications.length);

    request.notifications.forEach((notification, idx) => {
        validateNotification(notification, notifications[idx].type, notifications[idx].mbox);
    });
};

const validateOfferRequest = (request, userId, mboxes, type) => {
    expect(request).not.toBe(null);

    expect(request).toBeInstanceOf(Object);

    expect(request).toHaveProperty("id");
    expect(request).toHaveProperty("execute");

    expect(request.id).toBeInstanceOf(Object);
    expect(request.execute).toBeInstanceOf(Object);

    expect(request.execute.mboxes).toBeInstanceOf(Array);

    expect(request.execute.mboxes).toHaveLength(mboxes.length);

    request.execute.mboxes.forEach((mbox, idx) => {
        validateMboxObject(mbox, mboxes[idx], type, idx);
    });
};

const validateTargetOptions = (options, request, cookie, sessionId) => {
    expect(options).not.toBe(null);

    expect(options).toBeInstanceOf(Object);

    expect(options).toHaveProperty("request");
    expect(options).toHaveProperty("targetCookie");
    expect(options).toHaveProperty("sessionId");

    expect(options.request).toBeInstanceOf(Object);
    expect(options.targetCookie).toBeInstanceOf(Object);

    expect(options.request).toBe(request);
    expect(options.targetCookie).toBe(cookie);
    expect(options.sessionId).toBe(sessionId);
};

const validateNotification = (notification, type, mbox) => {
    expect(notification).not.toBe(null);

    expect(notification).toBeInstanceOf(Object);
    expect(notification).toHaveProperty("type");
    expect(notification).toHaveProperty("timestamp");
    expect(notification).toHaveProperty("id");
    expect(notification).toHaveProperty("mbox");

    expect(typeof notification.timestamp).toBe("number");
    expect(typeof notification.type).toBe("string");
    expect(typeof notification.id).toBe("string");
    expect(notification.mbox).toBeInstanceOf(Object);
    expect(notification.mbox).toHaveProperty("name");

    expect(notification.mbox.name).toBe(mbox.name);
    expect(notification.type).toBe(type);
    expect(uuidValidate(notification.id)).toBe(true);
};

const validateMboxObject = (mbox, mboxName, type, idx) => {
    expect(mbox).not.toBe(null);
    expect(mbox).toBeInstanceOf(Object);
    expect(mbox).toHaveProperty("type");
    expect(mbox).toHaveProperty("timestamp");
    expect(mbox).toHaveProperty("id");
    expect(mbox).toHaveProperty("name");
    expect(mbox).toHaveProperty("index");

    expect(typeof mbox.timestamp).toBe("number");
    expect(typeof mbox.type).toBe("string");
    expect(typeof mbox.id).toBe("string");
    expect(typeof mbox.name).toBe("string");
    expect(typeof mbox.index).toBe("number");

    expect(mbox.name).toBe(mboxName);
    expect(mbox.type).toBe(type);
    expect(mbox.index).toBe(idx);
    expect(uuidValidate(mbox.id)).toBe(true);
};

// ============================================================
// Tests
// ============================================================

describe("TargetService.createNotificationRequest", () => {
    const targetService = TargetService(targetConfig, PssLogger);

    it("returns a notification request if an array of notifications and userId is passed in", () => {
        const userId = uuidv4();
        const notifications = [{
            id: uuidv4(),
            mbox: {
                name: "some-mbox"
            },
            type: "click",
            timestamp: Date.now()
        },{
            id: uuidv4(),
            mbox: {
                name: "another-mbox"
            },
            type: "display",
            timestamp: Date.now()
        }];
        const request = targetService.createNotificationRequest(notifications, userId);

        validateNotificationRequest(request, userId, notifications);
    });
});

describe("TargetService.validateConfig", () => {

    it("fails if targetConfig is undefined or null ", () => {
        const targetService = getTargetService(targetConfig);

        try {
            targetService.validateConfig();
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("adobe target sdk config must be provided");
        }

        try {
            targetService.validateConfig(null);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("adobe target sdk config must be provided");
        }

        try {
            targetService.validateConfig("targetConfig");
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("adobe target sdk config must be an object");
        }
    });

    it("fails if targetConfig.client is falsy", () => {
        const targetService = getTargetService(targetConfig);

        try {
            targetService.validateConfig({});
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.client must be provided");
        }

        try {
            targetService.validateConfig({ client: undefined });
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.client must be provided");
        }

        try {
            targetService.validateConfig({ client: null });
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.client must be provided");
        }

        try {
            targetService.validateConfig({ client: false });
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.client must be provided");
        }
    });

    it("fails if targetConfig.client is not a string", () => {
        const targetService = getTargetService(targetConfig);

        try {
            targetService.validateConfig({ client: 8 });
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.client must be a string");
        }

        try {
            targetService.validateConfig({ client: {} });
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.client must be a string");
        }

        try {
            targetService.validateConfig({ client: true });
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.client must be a string");
        }
    });

    it("fails if targetConfig.organizationId is falsy", () => {
        const targetService = getTargetService(targetConfig);
        const config = {
            client: "client"
        }

        try {
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.organizationId must be provided");
        }

        try {
            config.organizationId = undefined;
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.organizationId must be provided");
        }

        try {
            config.organizationId = null;
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.organizationId must be provided");
        }

        try {
            config.organizationId = false;
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.organizationId must be provided");
        }
    });

    it("fails if targetConfig.organizationId is not a string", () => {
        const targetService = getTargetService(targetConfig);
        const config = { client: "client" };

        try {
            config.organizationId = 8;
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.organizationId must be a string");
        }

        try {
            config.organizationId = true;
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.organizationId must be a string");
        }

        try {
            config.organizationId = {};
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.organizationId must be a string");
        }
    });

    it("fails if targetConfig.propertyToken is falsy", () => {
        const targetService = getTargetService(targetConfig);
        const config = {
            client: "client",
            organizationId: "organizationId"
        }

        try {
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.propertyToken must be provided");
        }

        try {
            config.propertyToken = undefined;
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.propertyToken must be provided");
        }

        try {
            config.propertyToken = null;
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.propertyToken must be provided");
        }

        try {
            config.propertyToken = false;
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.propertyToken must be provided");
        }
    });

    it("fails if targetConfig.propertyToken is not a string", () => {
        const targetService = getTargetService(targetConfig);
        const config = {
            client: "client",
            organizationId: "organizationId"
        }

        try {
            config.propertyToken = 8;
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.propertyToken must be a string");
        }

        try {
            config.propertyToken = true;
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.propertyToken must be a string");
        }

        try {
            config.propertyToken = {};
            targetService.validateConfig(config);
            new TypeError("targetService.validateConfig should fail");
        }
        catch (error) {
            expect(error.message).toBe("targetConfig.propertyToken must be a string");
        }
    });
});

describe("TargetService.getSessionId", () => {
    const targetService = getTargetService(targetConfig, PssLogger);

    it("returns a random uuid if session is null or undefined", () => {
        let session;
        const sessionId1 = targetService.getSessionId(session);

        expect(uuidValidate(sessionId1)).toBe(true);

        session = null;
        const sessionId2 = targetService.getSessionId(session);

        expect(uuidValidate(sessionId2)).toBe(true);
        expect(sessionId2).not.toEqual(sessionId1);
    });

    it("returns a random uuid if session.authToken is undefined or null", () => {
        let session = {};
        const sessionId1 = targetService.getSessionId(session);

        expect(uuidValidate(sessionId1)).toBe(true);

        session.authToken = null;
        const sessionId2 = targetService.getSessionId(session);

        expect(uuidValidate(sessionId2)).toBe(true);
        expect(sessionId2).not.toEqual(sessionId1);
    });

    it("returns session.authToken as the sessionId", () => {
        const session = {
            authToken: uuidv4()
        };
        const sessionId = targetService.getSessionId(session);
        expect(uuidValidate(sessionId)).toBe(true);
        expect(session.authToken).toEqual(sessionId);
    });
});

describe("TargetService.getUserId", () => {
    const targetService = getTargetService(targetConfig, PssLogger);

    it("returns a random uuid if the session is null or undefined", () => {
        let session;
        const userIdOne = targetService.getUserId(session);

        expect(uuidValidate(userIdOne)).toBe(true);

        session = null;
        const userIdTwo = targetService.getUserId(session);

        expect(uuidValidate(userIdTwo)).toBe(true);
        expect(userIdOne).not.toEqual(userIdTwo);
    });

    it("returns a random uuid if session.userId is null or undefined", () => {
        let session = {};
        const userIdOne = targetService.getUserId(session);

        expect(uuidValidate(userIdOne)).toBe(true);

        session.userId = null;
        const userIdTwo = targetService.getUserId(session);

        expect(uuidValidate(userIdTwo)).toBe(true);
        expect(userIdOne).not.toEqual(userIdTwo);
    });

    it("returns a random uuid if session.authToken is null or undefined", () => {
        let session = {
            userId: uuidv4()
        };
        const userIdOne = targetService.getUserId(session);

        expect(uuidValidate(userIdOne)).toBe(true);

        session.authToken = null;
        const userIdTwo = targetService.getUserId(session);

        expect(uuidValidate(userIdTwo)).toBe(true);
        expect(userIdOne).not.toEqual(userIdTwo);
    });

    it("returns session.userId if session is not anonymous", () => {
        let session = {
            userId: uuidv4(),
            authToken: uuidv4()
        };

        const userIdOne = targetService.getUserId(session);
        expect(uuidValidate(userIdOne)).toBe(true);
        expect(userIdOne).toBe(session.userId);

        session.isAnonymous = null;
        const userIdTwo = targetService.getUserId(session);
        expect(uuidValidate(userIdTwo)).toBe(true);
        expect(userIdTwo).toBe(session.userId);

        session.isAnonymous = false;
        const userIdThree = targetService.getUserId(session);
        expect(uuidValidate(userIdThree)).toBe(true);
        expect(userIdThree).toBe(session.userId);
    });

    it("returns session.userId_session.authToken if the session is anonymous", () => {
        let session = {
            userId: uuidv4(),
            authToken: uuidv4(),
            isAnonymous: true
        };

        const userId = targetService.getUserId(session);
        expect(userId).toBe(session.userId + "_" + session.authToken);
    });
});

describe("TargetService.createMboxArray", () => {
    const targetService = getTargetService(targetConfig, PssLogger);

    it("returns an empty array if mboxes isn't an array or an empty array", () => {
        let mboxes = targetService.createMboxArray();
        expect(Array.isArray(mboxes)).toEqual(true);
        expect(mboxes).toHaveLength(0);

        mboxes = targetService.createMboxArray(null);
        expect(Array.isArray(mboxes)).toEqual(true);
        expect(mboxes).toHaveLength(0);

        mboxes = targetService.createMboxArray("stuff");
        expect(Array.isArray(mboxes)).toEqual(true);
        expect(mboxes).toHaveLength(0);

        mboxes = targetService.createMboxArray({});
        expect(Array.isArray(mboxes)).toEqual(true);
        expect(mboxes).toHaveLength(0);

        mboxes = targetService.createMboxArray(true);
        expect(Array.isArray(mboxes)).toEqual(true);
        expect(mboxes).toHaveLength(0);

        mboxes = targetService.createMboxArray(1234);
        expect(Array.isArray(mboxes)).toEqual(true);
        expect(mboxes).toHaveLength(0);

        mboxes = targetService.createMboxArray([]);
        expect(Array.isArray(mboxes)).toEqual(true);
        expect(mboxes).toHaveLength(0);
    });

    it("sets type to 'display' if type is falsy or not click", () => {
        const mboxes = ["some-mbox", "another-mbox"];
        let mboxArray = targetService.createMboxArray(mboxes);

        expect(Array.isArray(mboxArray)).toEqual(true);
        expect(mboxArray).toHaveLength(2);

        mboxArray.forEach((mbox, idx) => {
            validateMboxObject(mbox, mboxes[idx], "display", idx);
        });

        mboxArray = targetService.createMboxArray(mboxes, "not-click");

        expect(Array.isArray(mboxArray)).toEqual(true);
        expect(mboxArray).toHaveLength(2);

        mboxArray.forEach((mbox, idx) => {
            validateMboxObject(mbox, mboxes[idx], "display", idx);
        });

        mboxArray = targetService.createMboxArray(mboxes, null);

        expect(Array.isArray(mboxArray)).toEqual(true);
        expect(mboxArray).toHaveLength(2);

        mboxArray.forEach((mbox, idx) => {
            validateMboxObject(mbox, mboxes[idx], "display", idx);
        });

        mboxArray = targetService.createMboxArray(mboxes, "display");

        expect(Array.isArray(mboxArray)).toEqual(true);
        expect(mboxArray).toHaveLength(2);

        mboxArray.forEach((mbox, idx) => {
            validateMboxObject(mbox, mboxes[idx], "display", idx);
        });
    });

    it("sets type to 'click' if eventType=click passed in", () => {
        const mboxes = ["some-mbox", "another-mbox"];
        const mboxArray = targetService.createMboxArray(mboxes, "click");

        expect(Array.isArray(mboxArray)).toEqual(true);
        expect(mboxArray).toHaveLength(2);

        mboxArray.forEach((mbox, idx) => {
            validateMboxObject(mbox, mboxes[idx], "click", idx);
        });
    });

    it("returns an array of mbox objects", () => {
        const mboxes = ["some-mbox", "another-mbox"];
        const mboxArray = targetService.createMboxArray(mboxes, "display");

        expect(Array.isArray(mboxArray)).toEqual(true);
        expect(mboxArray).toHaveLength(2);

        mboxArray.forEach((mbox, idx) => {
            validateMboxObject(mbox, mboxes[idx], "display", idx);
        });
    });
});

describe("TargetService.createNotifications", () => {
    const targetService = getTargetService(targetConfig, PssLogger);
    const mboxes = ["some-mbox", "another-mbox"];

    it("returns an empty array if mboxes is null, undefined, or not an array", () => {
        let notifications = targetService.createNotifications();
        expect(notifications).toBeInstanceOf(Array);
        expect(notifications).toHaveLength(0);

        notifications = targetService.createNotifications(null);
        expect(notifications).toBeInstanceOf(Array);
        expect(notifications).toHaveLength(0);

        notifications = targetService.createNotifications("stuff");
        expect(notifications).toBeInstanceOf(Array);
        expect(notifications).toHaveLength(0);

        notifications = targetService.createNotifications(1234);
        expect(notifications).toBeInstanceOf(Array);
        expect(notifications).toHaveLength(0);

        notifications = targetService.createNotifications({});
        expect(notifications).toBeInstanceOf(Array);
        expect(notifications).toHaveLength(0);

        notifications = targetService.createNotifications([]);
        expect(notifications).toBeInstanceOf(Array);
        expect(notifications).toHaveLength(0);
    });

    it("returns notifications with type display if eventType is not display", () => {
        const notificationArray = [{
            id: uuidv4(),
            mbox: {
                name: "some-mbox"
            },
            type: "Something",
            timestamp: Date.now()
        },{
            id: uuidv4(),
            mbox: {
                name: "another-mbox"
            },
            type: null,
            timestamp: Date.now()
        }];

        let notifications = targetService.createNotifications(mboxes, "something");
        expect(notifications).toBeInstanceOf(Array);
        expect(notifications).toHaveLength(2);

        notifications.forEach((notification, idx) => {
            validateNotification(notification, "display", notificationArray[idx].mbox);
        });

    });

    it("returns notifications with type click if eventType is click", () => {
        const notificationArray = [{
            id: uuidv4(),
            mbox: {
                name: "some-mbox"
            },
            type: "click",
            timestamp: Date.now()
        },{
            id: uuidv4(),
            mbox: {
                name: "another-mbox"
            },
            type: "click",
            timestamp: Date.now()
        }];

        let notifications = targetService.createNotifications(mboxes, "click");
        expect(notifications).toBeInstanceOf(Array);
        expect(notifications).toHaveLength(2);

        notifications.forEach((notification, idx) => {
            validateNotification(notification, "click", notificationArray[idx].mbox);
        });
    });
});

describe("TargetService.createOfferRequest", () => {
    const targetService = getTargetService(targetConfig, PssLogger);

    it("returns an offer request if an array of mbox objects and a userId is passed in", () => {
        const userId = uuidv4();
        const mboxes = ["some-mbox", "another-mbox"];
        const mboxArray = targetService.createMboxArray(mboxes, "click");

        const offerRequest = targetService.createOfferRequest(mboxArray, userId);

        validateOfferRequest(offerRequest, userId, mboxes, "click");
    });
});

describe("TargetService.createTargetRequest", () => {
    it("returns a adobe target request", () => {
        const targetService = getTargetService(targetConfig, PssLogger);

        const userId = uuidv4();
        const request = targetService.createTargetRequest(userId);

        expect(request).toBeInstanceOf(Object);
        expect(request).toHaveProperty("id");
        expect(request.id).toBeInstanceOf(Object);
        expect(request.id).toHaveProperty("thirdPartyId");
        expect(request.id.thirdPartyId).toBe(userId);
    });

});

describe("TargetService.createTargetOptions", () => {
    const targetService = getTargetService(targetConfig, PssLogger);

    it("returns a target options object", () => {
        const sessionId = uuidv4();
        const userId = uuidv4();
        const targetCookie = {
            name: "name",
            value: "value",
            maxAge: 1
        };
        const request = targetService.createTargetRequest(userId);

        expect(request).toBeInstanceOf(Object);
        expect(request).toHaveProperty("id");
        expect(request.id).toBeInstanceOf(Object);
        expect(request.id).toHaveProperty("thirdPartyId");
        expect(request.id.thirdPartyId).toBe(userId);

        const targetOptions = targetService.createTargetOptions(request, targetCookie, sessionId);

        validateTargetOptions(targetOptions, request, targetCookie, sessionId);
    });
});

const responseResponse = {
    response: {
        execute: {
            mboxes: [{
                name: "someMbox",
                options: [{
                    content: {
                        experience: "variation"
                    }
                }]
            }]
        }
    }
};

const response = responseResponse.response;

describe("TargetService.getExperienceFromTargetResponse", () => {
    const error = jest.fn();
    const trace = jest.fn();
    const debug = jest.fn();

    const mockPssLogger = {
        Logger: (category) => {
            return {
                debug: debug,
                error: error,
                trace: trace
            };
        }
    };

    const targetService = TargetService(targetConfig, mockPssLogger);

    const validateExperience = (res, mbox, expectedExperience) => {
        const experience = targetService.getExperienceFromTargetResponse(res, mbox);
        expect(experience).toBe(expectedExperience);
    };

    describe("returns undefined if invalid arguments passed in", () => {

        it("invalid response", () => {
            validateExperience(undefined, "mbox", undefined);
            validateExperience(null, "mbox", undefined);
            validateExperience(123, "mbox", undefined);
            validateExperience(true, "mbox", undefined);
            validateExperience(false, "mbox", undefined);
            validateExperience([], "mbox", undefined);
            validateExperience("response", "mbox", undefined);
        });

        test("response object isn't in the expected form", () => {
            let response = {}
            validateExperience(response, "someMbox", undefined);

            response.execute = {};
            validateExperience(response, "someMbox", undefined);

            response.execute.mboxes = "";
            validateExperience(response, "someMbox", undefined);
            response.execute.mboxes = {};
            validateExperience(response, "someMbox", undefined);
            response.execute.mboxes = true;
            validateExperience(response, "someMbox", undefined);
            response.execute.mboxes = false;
            validateExperience(response, "someMbox", undefined);
            response.execute.mboxes = 1234;
            validateExperience(response, "someMbox", undefined);
        });

        test("handles target.response or target.response.response", async () => {
            validateExperience(responseResponse, "someMbox", "variation");
            validateExperience(response, "someMbox", "variation");
        });
    });
});

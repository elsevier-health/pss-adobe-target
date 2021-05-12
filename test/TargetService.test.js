
// ============================================================
// Requires
// ============================================================

const TargetService = require("../lib/TargetService");
const PssLogger = require("@pss/pss-logger")({
    categories: {
        default: {
            level: process.env.LOG_LEVEL || "trace",
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
    return targetService
};

// ============================================================
// Tests
// ============================================================

it("", () => {});


describe("TargetService.initializeTargetClient", () => {});

describe("TargetService.createNotificationRequest", () => {});

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

    it("fails if targetConfig.client is undefined, null, or not a string", () => {
        const targetService = getTargetService(targetConfig);



    });
});

describe("TargetService.getActivities", () => {});

describe("TargetService.sendNotification", () => {});

describe("TargetService.targetServiceConstructor", () => {});

describe("TargetService.getActivitiesRoute", () => {});

describe("TargetService.sendNotificationRoute", () => {});

describe("TargetService.getActivitiesMiddleware", () => {});

describe("TargetService.sendNotificationMiddleware", () => {});

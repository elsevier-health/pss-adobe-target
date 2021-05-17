
// ============================================================
// Requires
// ============================================================

const { validate: uuidValidate } = require("uuid");
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
    return targetService
};

const validateNotificationRequest = (request, cookie) => {
    expect(request).not.toBe(null);
    expect(request).toBeInstanceOf(Object);
    expect(request).toHaveProperty("request");
    expect(request).toHaveProperty("targetCookie");
    expect(request.targetCookie).toEqual(cookie);
    expect(request.request).toBeInstanceOf(Object);
    expect(request.request).toHaveProperty("notifications");
    expect(request.request.notifications).toBeInstanceOf(Array);
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

    expect(notification.mbox.name).toBe(mbox);
    expect(notification.type).toBe(type);
    expect(uuidValidate(notification.id)).toBe(true);
};

// ============================================================
// Tests
// ============================================================

describe("TargetService.createNotificationRequest", () => {
    const targetService = TargetService(targetConfig, PssLogger);

    it("returns a notification request if an array of mboxes, an eventType, and a targetCookie", () => {
        const request = targetService.createNotificationRequest([], "", {});

        validateNotificationRequest(request, {});
        expect(request.request.notifications).toHaveLength(0);
    });

    it("returns a request with mbox events of type display if eventType !== click", () => {
        const request = targetService.createNotificationRequest(["mbox"], "", {});

        validateNotificationRequest(request, {});
        expect(request.request.notifications).toHaveLength(1);

        const notification = request.request.notifications[0];
        validateNotification(notification, "display", "mbox");
    });

    it("returns a request with mbox events of type display if eventType === display", () => {
        const request = targetService.createNotificationRequest(["mbox"], "display", {});

        validateNotificationRequest(request, {});
        expect(request.request.notifications).toHaveLength(1);

        const notification = request.request.notifications[0];
        validateNotification(notification, "display", "mbox");
    });

    it("returns a request with mbox events of type click if eventType === click", () => {
        const request = targetService.createNotificationRequest(["mbox"], "click", {});

        validateNotificationRequest(request, {});
        expect(request.request.notifications).toHaveLength(1);

        const notification = request.request.notifications[0];
        validateNotification(notification, "click", "mbox");
    });

    it("returns a request containing the passed in target cookie", () => {
        const cookie = {
            funny: "business"
        }
        const request = targetService.createNotificationRequest(["mbox"], "click", cookie);
        validateNotificationRequest(request, cookie);
        expect(request.request.notifications).toHaveLength(1);

        const notification = request.request.notifications[0];
        validateNotification(notification, "click", "mbox");
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

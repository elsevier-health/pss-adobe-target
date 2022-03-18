
// ============================================================
// Requires
// ============================================================

const assert = require("assert");
const util = require("util");
const { v4: uuidv4 } = require("uuid");

const TargetClient = require("@adobe/target-nodejs-sdk");

// ============================================================
// Variables
// ============================================================

let logger;
let targetClient;

// ============================================================
// Functions
// ============================================================

/**
 * Returns a configured target SDK client
 * @param Object targetConfig
 */
const initializeTargetClient = (targetConfig) => {
    validateConfig(targetConfig);

    logger.debug("Creating the target client :: config = " + util.inspect(targetConfig));
    return TargetClient.create(targetConfig);
};

// ---------- Business Logic -----------

/**
 * Pulls out a unique sessionId out of the express session.
 * @param session express session object
 * @returns string sessionId
 */
const getSessionId = (session) => {
    const sessionId = session && session.authToken ? session.authToken : uuidv4();
    return sessionId;
};

/**
 * Pulls out an unique userId out of the express session.
 * @param session express session object
 * @returns string userId
 */
const getUserId = (session) => {
    if (!session || !session.userId || !session.authToken) {
        return uuidv4();
    }

    const userId = session.isAnonymous ? session.userId + "_" + session.authToken : session.userId;
    return userId;
};

/**
 * Creates an array of mbox objects.
 * @param mboxes array of strings
 * @param eventType string
 * @returns {*[{type, timestamp, id, name, index}]}
 */
const createMboxArray = (mboxes, eventType) => {
    const mboxArray = [];

    if (!Array.isArray(mboxes)) {
        return mboxArray;
    }

    const type = eventType === "click" ? "click" : "display";
    let index = 0;
    for (const mbox of mboxes) {
        mboxArray.push({
            type: type,
            timestamp: Date.now(),
            id: uuidv4(),
            name: mbox,
            index: index
        });
        index++;
    }

    return mboxArray;
};

/**
 * Creates an adobe target request object. Currently the only required field we need is thirdPartyId.
 * https://developers.adobetarget.com/api/delivery-api/#tag/Delivery-API
 * @param string userId
 */
const createTargetRequest = (userId) => {

    const request = {
        "id": {
            "thirdPartyId": userId
        }
    };

    return request;
};

/**
 * Creates an adobe target options object.
 * https://adobetarget-sdks.gitbook.io/docs/sdk-reference-guides/nodejs-sdk/get-offers#parameters
 * @param request adobe target request object. https://developers.adobetarget.com/api/delivery-api/#tag/Delivery-API
 * @param targetCookie adobe target cookie. https://adobetarget-sdks.gitbook.io/docs/sdk-reference-guides/nodejs-sdk/get-offers#promise
 * @param sessionId string
 * @returns {{request, targetCookie, sessionId}}
 */
const createTargetOptions = (request, targetCookie, sessionId) => {
    const options = {
        request: request,
        targetCookie: targetCookie,
        sessionId: sessionId
    };
    return options;
};

/**
 * Creates an array of adobe target notification objects. https://developers.adobetarget.com/api/delivery-api/#operation/execute
 * @param mboxes array of strings
 * @param eventType string
 * @returns {*[{id, mbox, type, timestamp}]}
 */
const createNotifications = (mboxes, eventType) => {
    const notifications = [];

    if (!Array.isArray(mboxes)) {
        return notifications;
    }

    const type = eventType === "click" ? "click" : "display";

    for (const mbox of mboxes) {

        const notification = {
            id: uuidv4(),
            mbox: {
                name: mbox,
            },
            type: type,
            timestamp: Date.now()
        };

        notifications.push(notification);
    }

    return notifications;
};

/**
 * Creates an adobe target notification request
 * @param [notifications] array of adobe target notification objects
 * @param userId string
 * @returns {{request: {id, notifications: *[]}, targetCookie}}
 */
const createNotificationRequest = (notifications, userId) => {

    const request = {
        ...createTargetRequest(userId),
        "notifications": notifications
    };

    return request;
};

/**
 *
 * @param mboxes array of adobe target mbox objects. https://developers.adobetarget.com/api/delivery-api/#operation/execute
 * @param userId string
 * @returns {{id: {thirdPartyId: *}, execute: {mboxes}}}
 */
const createOfferRequest = (mboxes, userId) => {
    logger.debug("TargetService.createOfferRequest");

    const request = {
        ...createTargetRequest(userId),
        "execute": {
            "mboxes": mboxes
        }
    };
    return request;
};

/**
 * Asserts that the passed in config object contains all required elements
 * @param Object targetConfig
 */
const validateConfig = (targetConfig) => {

    logger.trace("TargetService.validateConfig :: config = " + util.inspect(targetConfig));

    assert(targetConfig, "adobe target sdk config must be provided");
    assert(targetConfig instanceof Object, "adobe target sdk config must be an object");

    assert(targetConfig.client, "targetConfig.client must be provided");
    assert((typeof targetConfig.client === "string"), "targetConfig.client must be a string");

    assert(targetConfig.organizationId, "targetConfig.organizationId must be provided");
    assert((typeof targetConfig.organizationId === "string"), "targetConfig.organizationId must be a string");

    assert(targetConfig.propertyToken, "targetConfig.propertyToken must be provided");
    assert((typeof targetConfig.propertyToken === "string"), "targetConfig.propertyToken must be a string");
};

/**
 * Extracts the experience from the activity offer defined in adobe target. The value will be 'control', 'variation', or undefined.
 * @see {$link ./README.md} for documentation on AT getActivities response.
 * @param response
 * @param mboxName
 * @returns String experience
 */
const getExperienceFromTargetResponse = (response, mboxName) => {
    let experience;

    try {
        // Activity response contains a response object. Gracefully handle either
        const res = response.response ? response.response : response;

        const mboxes = res.execute.mboxes;

        for (const mbox of mboxes) {
            if (mbox.name === mboxName &&
                mbox.options &&
                mbox.options.length > 0 &&
                mbox.options[0].content
            ) {
                experience = mbox.options[0].content.experience;
            }
        }
    }
    catch (error) {
        logger.error("Unexpected Adobe Target activity response received");
    }

    return experience;
};

// ---------- Promises -----------

/**
 * Returns the promise created by adobe target sdk getAttributes function.
 * @param activities array of strings
 * @param userId string
 * @param sessionId string
 * @param targetCookie adobe target cookie. https://adobetarget-sdks.gitbook.io/docs/sdk-reference-guides/nodejs-sdk/get-offers#promise
 * @returns {*|(function(): Promise<*>)}
 */
const getActivities = (activities, userId, sessionId, targetCookie) => {

    const mboxes = createMboxArray(activities, "display");
    const request = createOfferRequest(mboxes, userId);
    const options = createTargetOptions(request, targetCookie, sessionId);

    return targetClient.getOffers(options);
};

/**
 * Returns the promise created by adobe target sdk sendNotifications function.
 * @param mboxes array of strings
 * @param eventType string (display | click)
 * @param userId string
 * @param sessionId string
 * @param targetCookie adobe target cookie. https://adobetarget-sdks.gitbook.io/docs/sdk-reference-guides/nodejs-sdk/get-offers#promise
 * @returns {*|(function(): Promise<*>)}
 */
const sendNotification = (mboxes, eventType, userId, sessionId, targetCookie) => {
    const notifications = createNotifications(mboxes, eventType);
    const request = createNotificationRequest(notifications, userId);
    const options = createTargetOptions(request, targetCookie, sessionId);

    return targetClient.sendNotifications(options);
};

// ---------- Middleware Routes -----------

/**
 * Adds a getTargetActivites function to req object for use by subsequent middleware / route definitions
 * @param req
 * @param res
 * @param next
 */
const getActivitiesMiddleware = (req, res, next) => {
    logger.debug("TargetService.getActivitiesMiddleware");

    const activity = req.query.activity;
    const activities = Array.isArray(activity) ? [...activity] : [activity];

    const userId = getUserId(req.session);
    const sessionId = getSessionId(req.session);
    const targetCookie = req.cookies.targetCookie ? req.cookies.targetCookie : null;

    getActivities(activities, userId, sessionId, targetCookie)
        .then((response) => {
            logger.debug("Target activities :: " + util.inspect(response.asObject()));

            // Add getTargetActivities function to the request.
            req.getTargetActivities = () => {
                return response.asObject();
            };

            next();
        })
        .catch((error) => {
            logger.error("Error fetching adobe target activities :: activities = " + util.inspect(activities));
            logger.error(error);

            req.getTargetActivities = () => {
                return {
                    "error": {
                        status: 500,
                        message: "Error fetching adobe target activities :: activities = " + util.inspect(activities),
                        error: error
                    }
                };
            };

            next();
        });
};

/**
 * Adds a getTargetNotificationResponse function to req object for use by subsequent middleware / route definitions
 * @param req
 * @param res
 * @param next
 */
const sendNotificationMiddleware = (req, res, next) => {
    logger.debug("TargetService.sendNotificationsMiddleware");

    const mbox = req.query.mbox;
    const eventType = req.query.type || "display";
    const mboxes = Array.isArray(mbox) ? [...mbox] : [mbox];

    const userId = getUserId(req.session);
    const sessionId = getSessionId(req.session);
    const targetCookie = req.cookies.targetCookie ? req.cookies.targetCookie : null;

    sendNotification(mboxes, eventType, userId, sessionId, targetCookie)
        .then((response) => {
            logger.debug("Notifications sent to adobe target :: response " + util.inspect(response));

            // Add getTargetNotificationResponse function to the request.
            req.getTargetNotificationResponse = () => {
                let targetResponse = {...response.response};
                delete targetResponse.client;
                delete targetResponse.edgeHost;
                return targetResponse;
            };

            next();
        })
        .catch((error) => {
            logger.error("Error sending notifications to adobe target :: mboxes = " + util.inspect(mboxes));
            logger.error(error);

            req.getTargetNotificationResponse = () => {
                return {
                    status: 500,
                    message: "Error sending notifications to adobe target :: mboxes = " + util.inspect(mboxes),
                    error: error
                };
            };

            next();
        });
};

// ---------- Routes -----------

/**
 * Requests activities from adobe target. One or more "activity" query parameters expected.
 * @param req
 * @param res
 * @param next
 */
const getActivitiesRoute = (req, res) => {
    logger.debug("TargetRouter.getActivity");

    const activity = req.query.activity;
    const activities = Array.isArray(activity) ? [...activity] : [activity];

    const userId = getUserId(req.session);
    const sessionId = getSessionId(req.session);
    const targetCookie = req.cookies.targetCookie ? req.cookies.targetCookie : null;

    getActivities(activities, userId, sessionId, targetCookie)
        .then((response) => {
            logger.debug("Target activities :: " + util.inspect(response));
            res.json(response).status(200);
        })
        .catch((error) => {
            logger.error("Error fetching adobe target activity [" + activity + "]");
            logger.error(error);
            res.status(500).json({
                message: "Error fetching adobe target activity [" + activity + "]",
                error: error
            });
        });
};

/**
 * Sends notifications to adobe target. One or more "mbox" query parameters expected.
 * @param req
 * @param res
 * @param next
 */
const sendNotificationRoute = (req, res) => {
    logger.debug("TargetRouter.sendNotification");

    const mbox = req.query.mbox;
    const eventType = req.query.eventType || "display";
    const mboxes = Array.isArray(mbox) ? [...mbox] : [mbox];

    const userId = getUserId(req.session);
    const sessionId = getSessionId(req.session);
    const targetCookie = req.cookies.targetCookie ? req.cookies.targetCookie : null;

    sendNotification(mboxes, eventType, userId, sessionId, targetCookie)
        .then((response) => {
            logger.debug("Notifications sent to adobe target :: response " + util.inspect(response));
            let targetResponse = {...response.response};
            delete targetResponse.client;
            delete targetResponse.edgeHost;
            res.json(targetResponse).status(200);
        })
        .catch((error) => {
            logger.error("Error sending notifications to adobe target :: mboxes = " + util.inspect(mboxes));
            logger.error(error);
            res.status(500).json({
                message: "Error sending notification for mbox [" + mbox + "]",
                error: error
            });
        });

};

// ============================================================
// Constructor
// ============================================================

/**
 * Returns a TargetService object.
 * @param targetConfig
 * @param PssLogger
 * @returns {TargetService}
 */
const targetServiceConstructor = (targetConfig, PssLogger) => {
    assert(PssLogger, "Configured PssLogger must be provided");
    assert("Logger" in PssLogger && typeof PssLogger.Logger === "function", "PssLogger must contain Logger function");
    logger = PssLogger.Logger(module.filename);

    targetClient = initializeTargetClient(targetConfig);

    let targetService = {
        Route: {},
        Middleware: {}
    };

    // Export route functions
    targetService.Route.getActivities = getActivitiesRoute;
    targetService.Route.sendNotification = sendNotificationRoute;

    // Export middleware functions
    targetService.Middleware.getActivities = getActivitiesMiddleware;
    targetService.Middleware.sendNotification = sendNotificationMiddleware;

    // Export business logic functions
    targetService.createMboxArray = createMboxArray;
    targetService.createNotificationRequest = createNotificationRequest;
    targetService.createNotifications = createNotifications;
    targetService.createOfferRequest = createOfferRequest;
    targetService.createTargetOptions = createTargetOptions;
    targetService.createTargetRequest = createTargetRequest;
    targetService.getActivities = getActivities;
    targetService.getSessionId = getSessionId;
    targetService.getUserId = getUserId;
    targetService.sendNotification = sendNotification;
    targetService.validateConfig = validateConfig;
    targetService.getExperienceFromTargetResponse = getExperienceFromTargetResponse;

    return targetService;
};

// ============================================================
// Exports
// ============================================================

exports = module.exports = targetServiceConstructor;

exports.initializeTargetClient = initializeTargetClient;


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
 * Creates an adobe target notification request
 * @param [string] mboxes
 * @param string eventType ("click" or "display")
 * @param Object targetCookie
 * @returns {{request: {notifications: *[]}, targetCookie}}
 */
const createNotificationRequest = (mboxes, eventType, targetCookie) => {

    const type = eventType === "click" ? "click" : "display";

    const request = {
        targetCookie,
        "request" : {
            "notifications" : []
        }
    };

    for (const mbox of mboxes) {
        request.request.notifications.push({
            type: type,
            timestamp: Date.now(),
            id: uuidv4(),
            mbox: {
                name: mbox
            }
        });
    }

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

// ---------- Promises -----------

/**
 * Returns the promise created by adobe target sdk getAttributes function.
 * @param activities
 * @returns {*|(function(): Promise<*>)}
 */
const getActivities = (activities) => {
    return targetClient.getAttributes(activities);
};

/**
 * Returns the promise created by adobe target sdk getAttributes function.
 * @param request
 * @returns {*|(function(): Promise<*>)}
 */
const sendNotification = (request) => {
    return targetClient.sendNotifications(request);
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

    getActivities(activities)
        .then((response) => {
            logger.debug("Target activities :: " + util.inspect(response.asObject()));

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
    const eventType = req.query.type || "display";
    const mbox = req.query.mbox;
    const mboxes = Array.isArray(mbox) ? [...mbox] : [mbox];
    const targetCookie = req.cookies.targetCookie;

    const request = createNotificationRequest(mboxes, eventType, targetCookie);

    sendNotification(request)
        .then((response) => {
            logger.debug("Notifications sent to adobe target :: response " + util.inspect(response));

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
const getActivitiesRoute = (req, res, next) => {
    logger.debug("TargetRouter.getActivity");

    const activity = req.query.activity;
    const activities = Array.isArray(activity) ? [...activity] : [activity];

    getActivities(activities)
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
const sendNotificationRoute = (req, res, next) => {
    logger.debug("TargetRouter.sendNotification");

    const mbox = req.query.mbox;
    const eventType = req.query.eventType || "display";
    const mboxes = Array.isArray(mbox) ? [...mbox] : [mbox];
    const targetCookie = req.cookies.targetCookie;

    const request = createNotificationRequest(mboxes, eventType, targetCookie);

    sendNotification(request)
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
    targetService.getActivities = getActivities;
    targetService.sendNotification = sendNotification;
    targetService.createNotificationRequest = createNotificationRequest;
    targetService.validateConfig = validateConfig;

    return targetService;
};

// ============================================================
// Exports
// ============================================================

exports = module.exports = targetServiceConstructor;

exports.initializeTargetClient = initializeTargetClient;

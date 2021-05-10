
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
 *
 * @param targetConfig
 */
const initializeTargetClient = (targetConfig) => {
    validateConfig(targetConfig);

    // TODO should I extract this into a separate mockable function?
    // const targetClientReady = () => {
    //     logger.trace("TargetRouter.targetClientReady");
    // };
    //
    // targetConfig.events = {};
    // targetConfig.events.clientReady = targetClientReady;

    // end TODO


    logger.trace("Creating the target client :: config = " + util.inspect(targetConfig));
    return TargetClient.create(targetConfig);
};

// ---------- Business Logic -----------

const createNotificationRequest = (mboxes, eventType, targetCookie) => {

    const request = {
        targetCookie,
        "request" : {
            "notifications" : []
        }
    };

    for (const mbox of mboxes) {
        request.request.notifications.push({
            type: eventType,
            timestamp: Date.now(),
            id: uuidv4(),
            mbox: {
                name: mbox
            }
        });
    }

    return request;
};

const validateConfig = (targetConfig) => {

    logger.trace("TargetService.validateConfig :: config = " + util.inspect(targetConfig));
    logger.trace(typeof targetConfig.client);

    assert(targetConfig, "adobe target sdk config must be provided");
    assert(targetConfig instanceof Object, "adobe target sdk config must be an object");

    assert(targetConfig.client, "targetConfig.client must be provided");
    assert((typeof targetConfig.client === "string"), "targetConfig.client must be a string");

    assert(targetConfig.organizationId, "targetConfig.organizationId must be provided");

    assert(targetConfig.propertyToken, "targetConfig.propertyToken must be provided");

};

// ---------- Promises -----------

const getActivities = (activities) => {
    return targetClient.getAttributes(activities);
};

const sendNotification = (request) => {
    return targetClient.sendNotifications(request);
};

// ---------- Middleware Routes -----------

const getActivitiesMiddleware = (req, res, next) => {
    logger.trace("TargetService.getActivitiesMiddleware");

    const activity = req.query.activity;
    const activities = Array.isArray(activity) ? [...activity] : [activity];

    getActivities(activities)
        .then((response) => {
            logger.trace("Target activities :: " + util.inspect(response.asObject()));

            req.getTargetActivities = () => {
                return response.asObject();
            };

            next();
        })
        .catch((error) => {
            logger.error("Error fetching adobe target activity [" + activity + "]");
            logger.error(error);
            next();
        });
};

const sendNotificationMiddleware = (req, res, next) => {
    const eventType = req.query.type || "display";
    const mbox = req.query.mbox;
    const mboxes = Array.isArray(mbox) ? [...mbox] : [mbox];
    const targetCookie = req.cookies.targetCookie;

    const request = createNotificationRequest(mboxes, eventType, targetCookie);

    sendNotification(request)
        .then((response) => {
            logger.trace("Notifications sent to adobe target :: response " + util.inspect(response));

            req.getTargetNotificationResponse = () => {
                return response.asObject();
            };

            next();
        })
        .catch((error) => {
            logger.error("Error sending notifications to adobe target :: mboxes = " + util.inspect(mboxes));
            logger.error(error);
            next();
        });
};

// ---------- Routes -----------

const getActivitiesRoute = (req, res, next) => {
    logger.trace("TargetRouter.getActivity");

    const activity = req.query.activity;
    const activities = Array.isArray(activity) ? [...activity] : [activity];

    getActivities(activities)
        .then((response) => {
            logger.trace("Target activities :: " + util.inspect(response));
            res.json(response).status(200);
        })
        .catch((error) => {
            logger.error("Error fetching adobe target activity [" + activity + "]");
            logger.error(error);
            res.status(500).json({
                message: "Error fetching adobe target activity [" + activity + "]"
            });
        });
};

const sendNotificationRoute = (req, res, next) => {
    logger.trace("TargetRouter.sendNotification");

    const mbox = req.query.mbox;
    const mboxes = Array.isArray(mbox) ? [...mbox] : [mbox];

    const request = createNotificationRequest(mboxes);

    sendNotification(request)
        .then((response) => {
            logger.trace("Notifications sent to adobe target :: response " + util.inspect(response));
            let targetResponse = {...response.response};
            delete targetResponse.client;
            delete targetResponse.edgeHost;
            res.json(targetResponse).status(200);
        })
        .catch((error) => {
            logger.error("Error sending notifications to adobe target :: mboxes = " + util.inspect(mboxes));
            logger.error(error);
            res.status(500).json({
                message: "Error sending notification for mbox [" + mbox + "]"
            });
        });

};

// ============================================================
// Constructor
// ============================================================

const targetServiceConstructor = (targetConfig, PssLogger) => {
    assert(PssLogger, "Configured PssLogger must be provided");
    assert("Logger" in PssLogger && typeof PssLogger.Logger === "function", "PssLogger must contain Logger function");
    logger = PssLogger.Logger(module.filename);

    targetClient = initializeTargetClient(targetConfig);

    let targetService = {};

    // Export route functions
    targetService.getActivitiesRoute = getActivitiesRoute;
    targetService.sendNotificationRoute = sendNotificationRoute;

    // Export middleware functions
    targetService.getActivitiesMiddleware = getActivitiesMiddleware;
    targetService.sendNotificationMiddleware = sendNotificationMiddleware;

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

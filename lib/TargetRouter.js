
// ============================================================
// Requires
// ============================================================

const assert = require("assert");
const express = require("express");

const TargetService = require("./TargetService");

// ============================================================
// Variables
// ============================================================

let logger;
let targetService;

// ============================================================
// Exports
// ============================================================

exports = module.exports = targetRouterConstructor;

// ============================================================
// Functions
// ============================================================

/**
 * Returns an express router with routes for getting target activities and sending event notifications
 * @param targetConfig
 * @param PssLogger
 */
function targetRouterConstructor(targetConfig, PssLogger) {
    assert(PssLogger, "Configured PssLogger must be provided");
    assert("Logger" in PssLogger && typeof PssLogger.Logger === "function", "PssLogger must contain Logger function");
    logger = PssLogger.Logger(module.filename);

    targetService = TargetService(targetConfig, PssLogger);

    // create the express router
    let targetRouter = express.Router();

    targetRouter.get("/target/activity", targetService.Route.getActivities);
    targetRouter.put("/target/notification", targetService.Route.sendNotification);

    logger.info("Mounting pss-target at " + module.filename);
    return targetRouter;
}

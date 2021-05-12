
// ============================================================
// Requires
// ============================================================

const targetRouterConstructor = require("./lib/TargetRouter");
const targetServiceConstructor = require("./lib/TargetService");

// ============================================================
// Exports
// ============================================================

exports = module.exports = {
    Router: targetRouterConstructor,
    Service: targetServiceConstructor
};

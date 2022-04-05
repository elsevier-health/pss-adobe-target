/*
    Script used to simulate requests to Adobe Target to determine Activity experience for users.
    Accepts the following input parameters:
     - [activityMbox] string - name of the AT activity mbox
     - [existingUsersFile] file - path to a file containing experience results for users
     - [userCount] number - number of users to include in test
     - [attemptsPerUser] number - number of attempts per user to do
     - [checkAllExistingUsers] boolean - whether to check all existing users regardless of 'userCount'
    Each of these params has a defined default value. 

    The contents of the `existingUsersFile` is as follows:
     - a json array of `UserResult` objects (see `./resources/example-user-results.json`)
     - may also be a non-existant or empty file

     `UserResult`
       - userId: <userId>
       - sessionId: <sessionId>
       - inExperiment: true|false - whether the user was in the experiment previously
       - experience: undefined|"CONTROL"|"VARIATION" - optional value of the experiment the user was in previously
       - oldExperience": optional array of previous `experience` values (may be undefined) - history of `experience` values 
*/ 


process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";

// node libs
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const util = require("util");
const uuid = require("uuid");

// 3rd party libs
const config = require("config");
const dayjs = require("dayjs");
const log4js = require("log4js");
const parseArgs = require("minimist");

// elsevier libs
const PssAdobeTarget = require("../index");

// ============================================================
// Initialization
// ============================================================

assert(config.adobeTargetConfig, "config.adobeTargetConfig must be provided - see `default-template.js`");

const logger = log4js.getLogger();
logger.level = process.env.LOG_LEVEL || config?.log?.level || "info";

const targetLogger = log4js.getLogger("target");
targetLogger.level = "info";

const pssLoggerFacade = { Logger: () => targetLogger };

const targetService = PssAdobeTarget.Service(config.adobeTargetConfig, pssLoggerFacade);

logger[logger.level.toString().toLowerCase()]("log level: " + logger.level);

logger.debug("config: " + util.inspect(config));

// ============================================================
// Process arguments
// ============================================================

const args = parseArgs(process.argv.slice(2), {
    default: {
        activityMbox: "test-statdx-search-results-page",
        userCount: 10,
        existingUsersFile: "resources/users.json",
        checkAllExistingUsers: false,
        attemptsPerUser: 5,
    },
    alias: {
        help: "h"
    }
});

if (args.help) {
    console.log(
        `\n Usage: ${path.basename(__filename)}` +
        `\n  [activityMbox] string - name of the AT activity mbox - default(${args.activityMbox})` +
        `\n  [existingUsersFile] file - path to a file containing experience results for users - default(${args.existingUsersFile})` +
        `\n  [userCount] number - number of users to include in test - default(${args.userCount})` +
        `\n  [attemptsPerUser] number - number of attempts per user to do - default(${args.attemptsPerUser})`,
        `\n  [checkAllExistingUsers] boolean - whether to check all existing users regardless of 'userCount' - default(${args.checkAllExistingUsers})\n`
    );
    process.exit();
}

logger.debug("args: " + util.inspect(args));

assert(args.userCount >= 0, "userCount argument must be > 0");
assert(args.attemptsPerUser >= 0, "attemptsPerUser argument must be > 0");

// ============================================================
// Execution
// ============================================================

let existingUsersFile = args.existingUsersFile;
if (!path.isAbsolute(existingUsersFile)) {
    existingUsersFile = path.join(__dirname, existingUsersFile);
    logger.debug("existingUsersFile: " + existingUsersFile);
}

let existingUsers = getExistingUsers(existingUsersFile);
logger.info(existingUsers.length + " existing users read");

const userResults = [];

const limit = args.checkAllExistingUsers ? Math.max(existingUsers.length, args.userCount) : args.userCount;
logger.info(`Getting experience for ${limit} users`);

(async () => {
    for (let i = 1; i <= limit; i++) {
        let result = await getUserExperienceResult(i, existingUsers, args.activityMbox, args.attemptsPerUser);
        userResults.push(result);
    }

    logger.info(userResults.length + " user results");

    const updatedResults = userResults.filter(result => result.oldExperience !== undefined);
    logger.info(updatedResults.length + " updated user results");

    // only write results if there are more than there were to start
    if (userResults.length > existingUsers.length || updatedResults.length > 0) {
        const outputFilename = getOutputFileName(existingUsersFile, userResults.length);
        writeToFile(outputFilename, userResults);
    }
    else {
        logger.info("no new user results to save to file");
    }

    computeStats(userResults, args.activityMbox);
    
})();


// ============================================================
// Helper functions
// ============================================================

function getExistingUsers(file) {
    let existingUsers = [];

    if (fs.existsSync(file)) {
        logger.info("reading file: " + file);
        try {
            let rawdata = fs.readFileSync(file, "utf8");
            if (rawdata) {
                existingUsers = JSON.parse(rawdata);
                logger.debug("existing users: ", existingUsers);
            }
        }
        catch (error) {
            throw new Error("error reading existing users data file: " + file, { cause: error });
        }
    }

    return existingUsers;
}

async function getUserExperienceResult(userNumber, existingUsers, mbox, numAttempts) {
    let userId = uuid.v4();

    let previousResult;

    if (userNumber <= existingUsers.length) {
        previousResult = existingUsers[userNumber-1];  // adjust for 0-based
        userId = previousResult.userId;
        logger.debug("using previous user: " + userId);
    }
    else {
        logger.debug(`creating new user ${userNumber} (${userId})`);
    }

    const shortUserId = userId.split("-")[0];
    logger.info(`user ${userNumber} (${shortUserId}) - ${previousResult ? "existing" : "new"}`);

    await (async () => {
        for (let j = 1; j <= numAttempts; j++) {
            logger.debug(`  user(${userId}) - attempt = ` + j);
            const result = await getExperienceForUser(userId, mbox, previousResult);
            previousResult = result;
        }
    })();

    return previousResult;
}

function getOutputFileName(filepath, count) {
    const ext = path.extname(filepath);
    const dirname = path.dirname(filepath);
    const basename = path.basename(filepath, ext);
    const dateStr = dayjs().format("-YYYY-MM-DD-HH-mm-ss--") + count;

    return path.resolve(path.join(dirname, basename + dateStr + ext));
}

async function getExperienceForUser(userId, mbox, previousResult) {
    try {
        // use existing or create new user info
        userId = previousResult?.userId || userId;
        const sessionId = previousResult?.sessionId || userId;
        const targetCookie = null;

        const atResponse = await targetService.getActivities(Array.of(mbox), userId, sessionId, targetCookie);
        const experience = await targetService.getExperienceFromTargetResponse(atResponse, mbox);

        let result = {
            userId,
            sessionId,
            inExperiment: (experience != null),
            experience: experience && experience.toUpperCase(),
        }
        logger.trace("result", result);

        // compare to previous result
        if (previousResult) {
            logger.trace("previousResult", previousResult);

            if (previousResult.inExperiment && !result.inExperiment) {
                logger.warn(`user(${userId}) was previously in the experiment(${previousResult.experience}) and now they're not`);
            }
            else if (!previousResult.inExperiment && result.inExperiment) {
                logger.info(` - user(${userId}) was previously not in the experiment, but now they are (${result.experience})`);
                result.oldExperience = [ previousResult.experience ];
            }
            else if (previousResult.experience !== result.experience) {
                assert.fail(`user(${userId}) was previously in the experiment(${previousResult.experience}) and that has changed to (${result.experience})`);
            }
            else if (previousResult.oldExperience) {
                result.oldExperience = previousResult.oldExperience;
            }
        }
        else {
            logger.debug(" - result", result);
        }

        return result;
    }
    catch (error) {
        logger.error(`Failed to get experience(${mbox}) for user(${userId}}`, error);
    }
}

function writeToFile(file, obj) {
    const output = JSON.stringify(obj, null, 4);
    fs.writeFile(file, output, "utf8", function(err) {
        if (err) {
            return logger.error("error writing to file: " + file, err);
        }

        logger.info("file content written to: " + file);
    });
}

function computeStats(userResults, mbox) {
    assert(userResults.length > 0);

    let numUsers = userResults.length;
    let numInExperiment = 0;
    let numInControl = 0;
    let numInVariation = 0;
    userResults.forEach(result => {
        if (result.inExperiment) {
            numInExperiment++;
            switch (result.experience) {
                case "CONTROL":
                    numInControl++;
                    break;
                case "VARIATION":
                    numInVariation++;
                    break;
                default:
                    logger.error("unexpected experience value: " + result.experience);
                    break;
            }
        }
    });

    const totalDenom = numUsers / 100.0;
    const expDenom = (numInExperiment + 0.00001) / 100.0;  // guard against 0
    console.log(`\nUser stats for mbox: ${mbox}` +
            `\n  totalUsers: ${numUsers}` +
            `\n  InExperiment: ${numInExperiment} - ${round(numInExperiment/totalDenom)}%` +
            `\n  InControl: ${numInControl} - ${round(numInControl/totalDenom)}% (${round(numInControl/expDenom)}% of experiment)` +
            `\n  InVariation: ${numInVariation} - ${round(numInVariation/totalDenom)}% (${round(numInVariation/expDenom)}% of experiment)\n`);
}

// Exponential notation rounding
// https://stackoverflow.com/questions/11832914/how-to-round-to-at-most-2-decimal-places-if-necessary
function round(num, decimalPlaces = 1) {
    num = Math.round(num + "e" + decimalPlaces);
    return Number(num + "e" + -decimalPlaces);
}

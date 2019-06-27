"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
require("reflect-metadata");
const chai_1 = require("chai");
const fs = require("fs-extra");
const path = require("path");
const EntityFileToJson_1 = require("../utils/EntityFileToJson");
const Engine_1 = require("../../src/Engine");
const ts = require("typescript");
const GTU = require("../utils/GeneralTestUtils");
const chaiSubset = require("chai-subset");
const chai = require("chai");
const yn = require("yn");
chai.use(chaiSubset);
it("Column default values", function () {
    return __awaiter(this, void 0, void 0, function* () {
        const testPartialPath = 'test/integration/defaultValues';
        this.timeout(60000);
        this.slow(10000); // compiling created models takes time
        yield runTestsFromPath(testPartialPath, true);
    });
});
it("Platform specyfic types", function () {
    return __awaiter(this, void 0, void 0, function* () {
        this.timeout(60000);
        this.slow(10000); // compiling created models takes time
        const testPartialPath = 'test/integration/entityTypes';
        yield runTestsFromPath(testPartialPath, true);
    });
});
describe("GitHub issues", function () {
    return __awaiter(this, void 0, void 0, function* () {
        this.timeout(60000);
        this.slow(10000); // compiling created models takes time
        const testPartialPath = 'test/integration/github-issues';
        runTestsFromPath(testPartialPath, false);
    });
});
describe("TypeOrm examples", function () {
    return __awaiter(this, void 0, void 0, function* () {
        this.timeout(60000);
        this.slow(10000); // compiling created models takes time
        const testPartialPath = 'test/integration/examples';
        runTestsFromPath(testPartialPath, false);
    });
});
function runTestsFromPath(testPartialPath, isDbSpecific) {
    return __awaiter(this, void 0, void 0, function* () {
        const resultsPath = path.resolve(process.cwd(), `output`);
        if (!fs.existsSync(resultsPath)) {
            fs.mkdirSync(resultsPath);
        }
        const dbDrivers = GTU.getEnabledDbDrivers();
        for (const dbDriver of dbDrivers) {
            const newDirPath = path.resolve(resultsPath, dbDriver);
            if (!fs.existsSync(newDirPath)) {
                fs.mkdirSync(newDirPath);
            }
        }
        const files = fs.readdirSync(path.resolve(process.cwd(), testPartialPath));
        if (isDbSpecific) {
            yield runTest(dbDrivers, testPartialPath, files);
        }
        else {
            for (const folder of files) {
                runTestForMultipleDrivers(folder, dbDrivers, testPartialPath);
            }
        }
    });
}
exports.runTestsFromPath = runTestsFromPath;
function runTestForMultipleDrivers(testName, dbDrivers, testPartialPath) {
    it(testName, function () {
        return __awaiter(this, void 0, void 0, function* () {
            const driversToRun = selectDriversForSpecyficTest();
            const modelGenerationPromises = driversToRun.map((dbDriver) => __awaiter(this, void 0, void 0, function* () {
                const { generationOptions, driver, connectionOptions, resultsPath, filesOrgPathTS } = yield prepareTestRuns(testPartialPath, testName, dbDriver);
                let dbModel = [];
                switch (testName) {
                    case '144':
                        dbModel = yield Engine_1.dataCollectionPhase(driver, Object.assign(connectionOptions, { databaseName: 'db1,db2' }));
                        break;
                    default:
                        dbModel = yield Engine_1.dataCollectionPhase(driver, connectionOptions);
                        break;
                }
                dbModel = Engine_1.modelCustomizationPhase(dbModel, generationOptions, driver.defaultValues);
                Engine_1.modelGenerationPhase(connectionOptions, generationOptions, dbModel);
                const filesGenPath = path.resolve(resultsPath, 'entities');
                compareGeneratedFiles(filesOrgPathTS, filesGenPath);
                return { dbModel, generationOptions, connectionOptions, resultsPath, filesOrgPathTS, dbDriver };
            }));
            yield Promise.all(modelGenerationPromises);
            compileGeneratedModel(path.resolve(process.cwd(), `output`), dbDrivers);
        });
    });
    function selectDriversForSpecyficTest() {
        switch (testName) {
            case '39':
                return dbDrivers.filter(dbDriver => !['mysql', 'mariadb', 'oracle', 'sqlite'].includes(dbDriver));
            case '144':
                return dbDrivers.filter(dbDriver => ['mysql', 'mariadb'].includes(dbDriver));
            default:
                return dbDrivers;
        }
    }
}
function runTest(dbDrivers, testPartialPath, files) {
    return __awaiter(this, void 0, void 0, function* () {
        const modelGenerationPromises = dbDrivers.filter(driver => files.includes(driver))
            .map((dbDriver) => __awaiter(this, void 0, void 0, function* () {
            const { generationOptions, driver, connectionOptions, resultsPath, filesOrgPathTS } = yield prepareTestRuns(testPartialPath, dbDriver, dbDriver);
            let dbModel = yield Engine_1.dataCollectionPhase(driver, connectionOptions);
            dbModel = Engine_1.modelCustomizationPhase(dbModel, generationOptions, driver.defaultValues);
            Engine_1.modelGenerationPhase(connectionOptions, generationOptions, dbModel);
            const filesGenPath = path.resolve(resultsPath, 'entities');
            compareGeneratedFiles(filesOrgPathTS, filesGenPath);
            return { dbModel, generationOptions, connectionOptions, resultsPath, filesOrgPathTS, dbDriver };
        }));
        yield Promise.all(modelGenerationPromises);
        compileGeneratedModel(path.resolve(process.cwd(), `output`), dbDrivers);
    });
}
function compareGeneratedFiles(filesOrgPathTS, filesGenPath) {
    const filesOrg = fs.readdirSync(filesOrgPathTS).filter((val) => val.toString().endsWith('.ts'));
    const filesGen = fs.readdirSync(filesGenPath).filter((val) => val.toString().endsWith('.ts'));
    chai_1.expect(filesOrg, 'Errors detected in model comparision').to.be.deep.equal(filesGen);
    for (const file of filesOrg) {
        const entftj = new EntityFileToJson_1.EntityFileToJson();
        const jsonEntityOrg = entftj.convert(fs.readFileSync(path.resolve(filesOrgPathTS, file)));
        const jsonEntityGen = entftj.convert(fs.readFileSync(path.resolve(filesGenPath, file)));
        chai_1.expect(jsonEntityGen, `Error in file ${file}`).to.containSubset(jsonEntityOrg);
    }
}
function compileGeneratedModel(filesGenPath, drivers) {
    let currentDirectoryFiles = [];
    drivers.forEach(driver => {
        const entitiesPath = path.resolve(filesGenPath, driver, "entities");
        if (fs.existsSync(entitiesPath)) {
            currentDirectoryFiles.push(...fs.readdirSync(entitiesPath).
                filter(fileName => fileName.length >= 3 && fileName.substr(fileName.length - 3, 3) === ".ts").map(v => path.resolve(filesGenPath, driver, "entities", v)));
        }
    });
    const compileErrors = GTU.compileTsFiles(currentDirectoryFiles, {
        experimentalDecorators: true,
        sourceMap: false,
        emitDecoratorMetadata: true,
        target: ts.ScriptTarget.ES2016,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        module: ts.ModuleKind.CommonJS
    });
    chai_1.expect(compileErrors, 'Errors detected while compiling generated model').to.be.false;
}
function prepareTestRuns(testPartialPath, testName, dbDriver) {
    return __awaiter(this, void 0, void 0, function* () {
        const filesOrgPathJS = path.resolve(process.cwd(), testPartialPath, testName, 'entity');
        const filesOrgPathTS = path.resolve(process.cwd(), testPartialPath, testName, 'entity');
        const resultsPath = path.resolve(process.cwd(), `output`, dbDriver);
        fs.removeSync(resultsPath);
        const driver = Engine_1.createDriver(dbDriver);
        const generationOptions = GTU.getGenerationOptions(resultsPath);
        switch (testName) {
            case '65':
                generationOptions.relationIds = true;
                break;
            case 'sample18-lazy-relations':
                generationOptions.lazy = true;
                break;
            case '144':
                let connectionOptions;
                switch (dbDriver) {
                    case 'mysql':
                        connectionOptions = {
                            host: String(process.env.MYSQL_Host),
                            port: Number(process.env.MYSQL_Port),
                            databaseName: String(process.env.MYSQL_Database),
                            user: String(process.env.MYSQL_Username),
                            password: String(process.env.MYSQL_Password),
                            databaseType: 'mysql',
                            schemaName: 'ignored',
                            ssl: yn(process.env.MYSQL_SSL),
                        };
                        break;
                    case 'mariadb':
                        connectionOptions = {
                            host: String(process.env.MARIADB_Host),
                            port: Number(process.env.MARIADB_Port),
                            databaseName: String(process.env.MARIADB_Database),
                            user: String(process.env.MARIADB_Username),
                            password: String(process.env.MARIADB_Password),
                            databaseType: 'mariadb',
                            schemaName: 'ignored',
                            ssl: yn(process.env.MARIADB_SSL),
                        };
                        break;
                    default:
                        break;
                }
                yield driver.ConnectToServer(connectionOptions);
                if (!(yield driver.CheckIfDBExists('db1'))) {
                    var x = yield driver.CreateDB('db1');
                }
                if (!(yield driver.CheckIfDBExists('db2'))) {
                    var t = yield driver.CreateDB('db2');
                }
                yield driver.DisconnectFromServer();
                break;
            default:
                break;
        }
        const connectionOptions = yield GTU.createModelsInDb(dbDriver, filesOrgPathJS);
        return { generationOptions, driver, connectionOptions, resultsPath, filesOrgPathTS };
    });
}
//# sourceMappingURL=runTestsFromPath.test.js.map
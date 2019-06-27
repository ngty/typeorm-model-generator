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
const chai_1 = require("chai");
const MSSQL = require("mssql");
const mssql_1 = require("mssql");
const Sinon = require("sinon");
const MssqlDriver_1 = require("../../src/drivers/MssqlDriver");
const EntityInfo_1 = require("../../src/models/EntityInfo");
class fakeResponse {
}
class fakeRecordset extends Array {
    toTable() {
        return new mssql_1.Table();
    }
}
describe('MssqlDriver', function () {
    let driver;
    const sandbox = Sinon.sandbox.create();
    beforeEach(() => {
        driver = new MssqlDriver_1.MssqlDriver();
    });
    afterEach(() => {
        sandbox.restore();
    });
    it('should get tables info', () => __awaiter(this, void 0, void 0, function* () {
        sandbox.stub(MSSQL, 'Request')
            .returns({
            query: (q) => {
                const response = new fakeResponse();
                response.recordset = new fakeRecordset();
                response.recordset.push({ TABLE_SCHEMA: 'schema', TABLE_NAME: 'name' });
                return response;
            }
        });
        const result = yield driver.GetAllTables('schema', 'db');
        const expectedResult = [];
        const y = new EntityInfo_1.EntityInfo();
        y.tsEntityName = 'name';
        y.sqlEntityName = 'name';
        y.Schema = 'schema';
        y.Columns = [];
        y.Indexes = [];
        y.Database = "";
        expectedResult.push(y);
        chai_1.expect(result).to.be.deep.equal(expectedResult);
    }));
    it('should get columns info', () => __awaiter(this, void 0, void 0, function* () {
        sandbox.stub(MSSQL, 'Request')
            .returns({
            query: (q) => {
                const response = new fakeResponse();
                response.recordset = new fakeRecordset();
                response.recordset.push({
                    TABLE_NAME: 'name', CHARACTER_MAXIMUM_LENGTH: 0,
                    COLUMN_DEFAULT: "'a'", COLUMN_NAME: 'name', DATA_TYPE: 'int',
                    IS_NULLABLE: 'YES', NUMERIC_PRECISION: 0, NUMERIC_SCALE: 0,
                    IsIdentity: 1
                });
                return response;
            }
        });
        const entities = [];
        const y = new EntityInfo_1.EntityInfo();
        y.tsEntityName = 'name';
        y.Columns = [];
        y.Indexes = [];
        y.Database = "";
        entities.push(y);
        const expected = JSON.parse(JSON.stringify(entities));
        expected[0].Columns.push({
            options: {
                default: `() => "'a'"`,
                nullable: true,
                generated: true,
                name: 'name',
                unique: false,
                type: 'int',
            },
            tsName: 'name',
            tsType: 'number',
            relations: [],
        });
        const result = yield driver.GetCoulmnsFromEntity(entities, 'schema', 'db');
        chai_1.expect(result).to.be.deep.equal(expected);
    }));
    it('should find primary indexes');
    it('should get indexes info');
    it('should get relations info');
});
//# sourceMappingURL=MssqlDriver.test.js.map
const expect = require("chai").expect;
const rewire = require('rewire');
const proxyquire = require("proxyquire");

const validation = rewire('../app/validation');
const revert = validation.__set__({
    retrievePublicKey: () => Promise.resolve({PublicKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnSJhulApg/rNAFjIQnBibzfaP4OGPaZtNuqLdiQmOEz14ghuwmLQ/HcOe6xX4iYHv9vHJ7tvZm0wG0Q/pPEdh+nagJLnjfbkuiRUOA3mLMeiiYu4GltJVzjEx5p/YaUdGXLbTn5I/qymAH7+avrlDr9lv8R6yspNp7y2YPe95OjsHHOFcgSWmCDlVcvkiBHcoTnl6j5kUUClMXzXquxpW45ivUpQbI3/dztt6TMSIDXsYPyNOj1xHrjgI8234yXCUhCRv+jtAX7f+2SR/Dfh/b1WKMEOtUo1KvXH1Kb5s9s5VadizNN2khK5CjairbsmWO1kJZcCSro68eXebcb7HQIDAQAB" })
})
const eventHandler = proxyquire.noCallThru().load("../app/eventHandler.js", {
    "./validation.js": validation,
});

describe('test eventHandler', () => {
    it('handle event without authorizationToken', async () => {
        const result = await eventHandler.handleEvent({
            "type":"TOKEN",
            "authorizationToken":"",
            "methodArn":"arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/sent"
        });
        expect(result.principalId).to.be.equal('user');
        expect(result.policyDocument.Statement).to.be.eql([{
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: "*"
        }]);
        expect(result.context).to.be.undefined;
    })

    it('handle event with error in generation (jwt expired)', async () => {
        const result = await eventHandler.handleEvent({
            "type":"TOKEN",
            "authorizationToken":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoxNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.EcnBt1ZHD8Or00SgAP528lY4GcInWv3JfvtTER7_ago9Ef_patWOF1V38OZoUxKzaUrc-dZM7bQMS1PsinCcACyjZdf3D0lWiesftbBGTc221waF9vs7XOyvc1ckFSf7Qx9a1xWUPKETSqrMD7yZl7dHrWnsGLq-X_B7SQWNqd-kPFhXaD12ZYqKSRlMg35XNv2Ww491QqlzferTMBzyzUVf5JMoRjiTixdOaX420ncbRcs1jk91wiGCEqj7bTlGhQ-WIPlCcJRkLgrnj4jx6RAF8ncylfJGcp4NrIKarP82wIBglgTGZHC5TRsQbO_jFakXC8yX3Cvu8eN_T_XgPg",
            "methodArn":"arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/sent"
        });
        expect(result.principalId).to.be.equal('user');
        expect(result.policyDocument.Statement).to.be.eql([{
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: "*"
        }]);
        expect(result.context).to.be.undefined;
    })

    it('handle event with no errors (PF)', async () => {
        const result = await eventHandler.handleEvent({
            "type":"TOKEN",
            "authorizationToken":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imh1Yi1zcGlkLWxvZ2luLXRlc3QifQ.eyJlbWFpbCI6ImluZm9AYWdpZC5nb3YuaXQiLCJmYW1pbHlfbmFtZSI6IlJvc3NpIiwiZmlzY2FsX251bWJlciI6IkdETk5XQTEySDgxWTg3NEYiLCJtb2JpbGVfcGhvbmUiOiIzMzMzMzMzMzQiLCJuYW1lIjoiTWFyaW8iLCJmcm9tX2FhIjpmYWxzZSwidWlkIjoiZWQ4NGI4YzktNDQ0ZS00MTBkLTgwZDctY2ZhZDZhYTEyMDcwIiwibGV2ZWwiOiJMMiIsImlhdCI6MTY1MTc0NzY0NiwiZXhwIjoyNjUxNzUxMjQ2LCJhdWQiOiJwb3J0YWxlLXBmLWRldmVsb3AuZmUuZGV2LnBuLnBhZ29wYS5pdCIsImlzcyI6Imh0dHBzOi8vc3BpZC1odWItdGVzdC5kZXYucG4ucGFnb3BhLml0IiwianRpIjoiMDFHMkE2VjBCMTNCSE5DUEVaMzJTN0tRM1kifQ.jY8_5kYQuSERHPmhWaCDoc77KtrPP5p-g7_-2j8wLFwinVX6lnHG2IQi-Gll7S6o8WYqFED2yPydTlNMvtXgARVDMmZNDCzUPeSCMnhDb0UAy2TMxq89Avrl0ydd_KLHcjCw5WvyhBwCIAprakZXSza51Nk2WiBTJ1d-1_zWNg8NDTp7-hBbK90dgnU-w4HET8zp4f1Fnwos84JMbmAeu6wJuGuCn-h1znQer1BCr_tyl_YXQxwyMBYpKQVXLEsHHbmWJzyA8mETMigHNLFw4Y0C9vpjqiEuw2gFCnuSc-4A8WzlI4TuKsfyeCb3gpLDuqiSWvV-aQuu3iJTZ-_l2Q",
            "methodArn":"arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/POST/delivery/notifications/received"
        });
        expect(result.principalId).to.be.equal('user');
        expect(result.policyDocument.Statement).to.be.eql([{
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/beta/*"
        }]);
        expect(result.context).to.be.eql({
            uid: 'ed84b8c9-444e-410d-80d7-cfad6aa12070',
            cx_id: 'PF-ed84b8c9-444e-410d-80d7-cfad6aa12070',
            cx_type: 'PF',
            cx_groups: undefined,
            cx_role: undefined,
            cx_jti: '01G2A6V0B13BHNCPEZ32S7KQ3Y'
        });
    })
});
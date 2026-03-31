/**
 * Type definitions for consent management
 */
export var ConsentType;
(function (ConsentType) {
    ConsentType["TREATMENT"] = "treatment";
    ConsentType["DATA_SHARING"] = "data_sharing";
    ConsentType["RESEARCH"] = "research";
    ConsentType["MARKETING"] = "marketing";
    ConsentType["THIRD_PARTY"] = "third_party";
})(ConsentType || (ConsentType = {}));
export var ConsentStatus;
(function (ConsentStatus) {
    ConsentStatus["PENDING"] = "pending";
    ConsentStatus["GRANTED"] = "granted";
    ConsentStatus["DENIED"] = "denied";
    ConsentStatus["REVOKED"] = "revoked";
    ConsentStatus["EXPIRED"] = "expired";
})(ConsentStatus || (ConsentStatus = {}));
export var DataAccessLevel;
(function (DataAccessLevel) {
    DataAccessLevel["FULL"] = "full";
    DataAccessLevel["LIMITED"] = "limited";
    DataAccessLevel["READ_ONLY"] = "read_only";
    DataAccessLevel["NONE"] = "none";
})(DataAccessLevel || (DataAccessLevel = {}));
//# sourceMappingURL=types.js.map
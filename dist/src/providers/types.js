/**
 * Type definitions for provider dashboard system
 */
export var ProviderType;
(function (ProviderType) {
    ProviderType["PHYSICIAN"] = "physician";
    ProviderType["NURSE"] = "nurse";
    ProviderType["SPECIALIST"] = "specialist";
    ProviderType["ADMINISTRATOR"] = "administrator";
})(ProviderType || (ProviderType = {}));
export var ProviderStatus;
(function (ProviderStatus) {
    ProviderStatus["AVAILABLE"] = "available";
    ProviderStatus["BUSY"] = "busy";
    ProviderStatus["OFFLINE"] = "offline";
    ProviderStatus["ON_CALL"] = "on_call";
})(ProviderStatus || (ProviderStatus = {}));
export var QueryStatus;
(function (QueryStatus) {
    QueryStatus["PENDING"] = "pending";
    QueryStatus["IN_REVIEW"] = "in_review";
    QueryStatus["APPROVED"] = "approved";
    QueryStatus["REJECTED"] = "rejected";
    QueryStatus["ESCALATED"] = "escalated";
    QueryStatus["COMPLETED"] = "completed";
})(QueryStatus || (QueryStatus = {}));
export var QueryPriority;
(function (QueryPriority) {
    QueryPriority["EMERGENCY"] = "emergency";
    QueryPriority["URGENT"] = "urgent";
    QueryPriority["ROUTINE"] = "routine";
    QueryPriority["LOW"] = "low";
})(QueryPriority || (QueryPriority = {}));
//# sourceMappingURL=types.js.map
/**
 * Type definitions for healthcare notification system
 */
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["WEBHOOK"] = "webhook";
    NotificationChannel["WEBSOCKET"] = "websocket";
    NotificationChannel["INAPP"] = "inapp";
})(NotificationChannel || (NotificationChannel = {}));
export var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["EMERGENCY"] = "emergency";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["MEDIUM"] = "medium";
    NotificationPriority["LOW"] = "low";
})(NotificationPriority || (NotificationPriority = {}));
export var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "pending";
    NotificationStatus["SENT"] = "sent";
    NotificationStatus["DELIVERED"] = "delivered";
    NotificationStatus["FAILED"] = "failed";
    NotificationStatus["READ"] = "read";
})(NotificationStatus || (NotificationStatus = {}));
//# sourceMappingURL=types.js.map
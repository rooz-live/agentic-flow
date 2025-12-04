const noop = () => { };
export const env = {
    createTelemetryLogger: (_sender) => ({
        logUsage: noop,
        logError: noop,
        dispose: noop,
    }),
};
//# sourceMappingURL=vscode.js.map
function parseProviderId(v) {
    if (!v)
        return undefined;
    const norm = v.trim().toLowerCase();
    if (norm === 'aws_lightsail')
        return 'aws_lightsail';
    if (norm === 'hivelocity')
        return 'hivelocity';
    return undefined;
}
export function getOffhostSyslogCandidates() {
    return [
        {
            providerId: 'aws_lightsail',
            region: 'us-east-1',
            monthlyUsd: 5,
            vcpu: 1,
            ramGb: 1,
            diskGb: 40,
            jobSize: 1,
        },
        {
            providerId: 'aws_lightsail',
            region: 'us-east-1',
            monthlyUsd: 10,
            vcpu: 2,
            ramGb: 2,
            diskGb: 60,
            jobSize: 1,
        },
        {
            providerId: 'hivelocity',
            region: 'nyc1',
            monthlyUsd: 8,
            vcpu: 1,
            ramGb: 2,
            diskGb: 50,
            jobSize: 3,
        },
    ];
}
function computeWsjfScore(candidate, inputs) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const costOfDelay = inputs.userBusinessValue * inputs.timeCriticality * inputs.riskOpportunity;
    const wsjfScore = candidate.jobSize > 0 ? costOfDelay / candidate.jobSize : 0;
    return { wsjfScore, costOfDelay };
}
export function loadProviderSelectionConstraintsFromEnv() {
    const maxMonthlyUsd = Number(process.env.AF_TELEMETRY_SINK_MAX_MONTHLY_USD) || 10;
    const region = process.env.AF_TELEMETRY_SINK_AWS_REGION || 'us-east-1';
    const forcedProvider = parseProviderId(process.env.AF_TELEMETRY_SINK_PROVIDER);
    return {
        maxMonthlyUsd,
        minVcpu: 1,
        minRamGb: 1,
        minDiskGb: 25,
        region,
        forcedProvider,
        wsjfInputs: {
            userBusinessValue: 5,
            timeCriticality: 8,
            riskOpportunity: 5,
        },
    };
}
export function selectOffhostSyslogProvider(partial) {
    const base = loadProviderSelectionConstraintsFromEnv();
    const constraints = {
        ...base,
        ...partial,
        wsjfInputs: {
            ...base.wsjfInputs,
            ...(partial?.wsjfInputs ?? {}),
        },
    };
    const eligible = getOffhostSyslogCandidates().filter((c) => {
        if (constraints.forcedProvider && c.providerId !== constraints.forcedProvider)
            return false;
        if (constraints.region && c.providerId === 'aws_lightsail' && c.region !== constraints.region)
            return false;
        if (c.monthlyUsd > constraints.maxMonthlyUsd)
            return false;
        if (c.vcpu < constraints.minVcpu)
            return false;
        if (c.ramGb < constraints.minRamGb)
            return false;
        if (c.diskGb < constraints.minDiskGb)
            return false;
        return true;
    });
    if (!eligible.length)
        return null;
    let best = null;
    for (const candidate of eligible) {
        const { wsjfScore, costOfDelay } = computeWsjfScore(candidate, constraints.wsjfInputs);
        if (!best) {
            best = { candidate, wsjfScore, costOfDelay };
            continue;
        }
        if (wsjfScore > best.wsjfScore) {
            best = { candidate, wsjfScore, costOfDelay };
            continue;
        }
        if (wsjfScore === best.wsjfScore && candidate.monthlyUsd < best.candidate.monthlyUsd) {
            best = { candidate, wsjfScore, costOfDelay };
        }
    }
    return best;
}
//# sourceMappingURL=providerSelection.js.map
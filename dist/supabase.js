/**
 * Zero-dependency Supabase REST client for claude-eta.
 * Uses raw fetch against the PostgREST API. No SDK needed.
 */
// Public anon key — not a secret. Committed intentionally.
const SUPABASE_URL = process.env.CLAUDE_ETA_SUPABASE_URL ?? 'https://wviehmnmvvekiuxtxmmd.supabase.co';
const SUPABASE_ANON_KEY = process.env.CLAUDE_ETA_SUPABASE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2aWVobW5tdnZla2l1eHR4bW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjM1MDksImV4cCI6MjA4OTQ5OTUwOX0.S6ZGSfA1WU8ec8kZtdiFIokDkutjY2Z4rDZaQ74LtIM';
function headers() {
    return {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    };
}
const FETCH_TIMEOUT_MS = 10_000;
async function postVelocityRecords(records) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/velocity_records`, {
        method: 'POST',
        headers: { ...headers(), Prefer: 'return=minimal' },
        body: JSON.stringify(records),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return {
        ok: res.ok,
        status: res.status,
        body: res.ok ? '' : await res.text(),
    };
}
function isMissingColumnError(body, column) {
    return body.includes(column) && (body.includes('schema cache') || body.includes('does not exist'));
}
function stripField(records, field) {
    return records.map((record) => {
        if (!record || typeof record !== 'object' || Array.isArray(record))
            return record;
        const { [field]: _omitted, ...rest } = record;
        return rest;
    });
}
/** INSERT rows into velocity_records. Returns error string or null on success. */
export async function insertVelocityRecords(records) {
    try {
        let result = await postVelocityRecords(records);
        // Backward-compat for servers that have not yet applied the record_unit migration.
        if (!result.ok && isMissingColumnError(result.body, 'record_unit')) {
            result = await postVelocityRecords(stripField(records, 'record_unit'));
        }
        // Backward-compat for servers that have not yet applied the source_turn_count migration.
        if (!result.ok && isMissingColumnError(result.body, 'source_turn_count')) {
            const stripped = stripField(stripField(records, 'source_turn_count'), 'record_unit');
            result = await postVelocityRecords(stripped);
        }
        // Backward-compat for servers that have not yet applied the dedup_key migration.
        if (!result.ok && isMissingColumnError(result.body, 'dedup_key')) {
            const stripped = stripField(stripField(stripField(records, 'dedup_key'), 'source_turn_count'), 'record_unit');
            result = await postVelocityRecords(stripped);
        }
        if (!result.ok) {
            return { data: null, error: `${result.status}: ${result.body}` };
        }
        return { data: null, error: null };
    }
    catch (err) {
        return { data: null, error: err.message };
    }
}
function canonicalTaskType(value) {
    switch (value) {
        case 'bugfix':
            return 'bugfix';
        case 'feature':
            return 'feature';
        case 'refactor':
            return 'refactor';
        case 'config':
            return 'config';
        case 'docs':
            return 'docs';
        case 'test':
            return 'test';
        case 'debug':
            return 'debug';
        case 'review':
            return 'review';
        case 'other':
            return 'other';
        default:
            return null;
    }
}
function canonicalLocBucket(value) {
    switch (value) {
        case null:
        case undefined:
            return null;
        case 'tiny':
            return 'tiny';
        case 'small':
            return 'small';
        case 'medium':
            return 'medium';
        case 'large':
            return 'large';
        case 'huge':
            return 'huge';
        default:
            return null;
    }
}
function canonicalVolatility(value) {
    switch (value) {
        case null:
        case undefined:
            return null;
        case 'low':
            return 'low';
        case 'medium':
            return 'medium';
        case 'high':
            return 'high';
        default:
            return null;
    }
}
function canonicalModel(value) {
    switch (value) {
        case null:
        case undefined:
            return null;
        case 'claude-sonnet-4':
            return 'claude-sonnet-4';
        case 'claude-sonnet-4-5':
            return 'claude-sonnet-4-5';
        case 'claude-opus-4':
            return 'claude-opus-4';
        case 'claude-opus-4-5':
            return 'claude-opus-4-5';
        case 'claude-opus-4-6':
            return 'claude-opus-4-6';
        case 'gpt-5':
            return 'gpt-5';
        case 'gpt-5.1':
            return 'gpt-5.1';
        case 'gpt-5.2':
            return 'gpt-5.2';
        default:
            return null;
    }
}
function finiteNumber(value, max) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max)
        return null;
    return value;
}
function nullableFiniteNumber(value, max) {
    if (value === null || value === undefined)
        return null;
    return finiteNumber(value, max);
}
function finiteInteger(value, max) {
    const parsed = finiteNumber(value, max);
    if (parsed === null || !Number.isInteger(parsed))
        return null;
    return parsed;
}
function isoTimestamp(value) {
    if (typeof value !== 'string')
        return null;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp))
        return null;
    return new Date(timestamp).toISOString();
}
function parseBaselineRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const raw = value;
    const taskType = canonicalTaskType(raw.task_type);
    const sampleCount = finiteInteger(raw.sample_count, 1_000_000);
    const medianSeconds = finiteNumber(raw.median_seconds, 30 * 24 * 60 * 60);
    const p25Seconds = finiteNumber(raw.p25_seconds, 30 * 24 * 60 * 60);
    const p75Seconds = finiteNumber(raw.p75_seconds, 30 * 24 * 60 * 60);
    const p10Seconds = finiteNumber(raw.p10_seconds, 30 * 24 * 60 * 60);
    const p90Seconds = finiteNumber(raw.p90_seconds, 30 * 24 * 60 * 60);
    const computedAt = isoTimestamp(raw.computed_at);
    if (!taskType ||
        sampleCount === null ||
        medianSeconds === null ||
        p25Seconds === null ||
        p75Seconds === null ||
        p10Seconds === null ||
        p90Seconds === null ||
        !computedAt) {
        return null;
    }
    return {
        task_type: taskType,
        project_loc_bucket: canonicalLocBucket(raw.project_loc_bucket),
        model: canonicalModel(raw.model),
        sample_count: sampleCount,
        median_seconds: medianSeconds,
        p25_seconds: p25Seconds,
        p75_seconds: p75Seconds,
        p10_seconds: p10Seconds,
        p90_seconds: p90Seconds,
        avg_tool_calls: nullableFiniteNumber(raw.avg_tool_calls, 100_000),
        avg_files_edited: nullableFiniteNumber(raw.avg_files_edited, 100_000),
        volatility: canonicalVolatility(raw.volatility),
        computed_at: computedAt,
    };
}
function parseBaselineResponse(value) {
    if (!Array.isArray(value))
        return null;
    const records = value.map(parseBaselineRecord).filter((record) => record !== null);
    return records.length === value.length ? records : null;
}
/** SELECT all rows from baselines_cache. */
export async function fetchBaselines(timeoutMs) {
    try {
        const h = { ...headers(), Accept: 'application/json' };
        const res = await fetch(`${SUPABASE_URL}/rest/v1/baselines_cache?select=*`, {
            method: 'GET',
            headers: h,
            signal: AbortSignal.timeout(timeoutMs ?? FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
            const body = await res.text();
            return { data: null, error: `${res.status}: ${body}` };
        }
        const data = parseBaselineResponse(await res.json());
        if (!data) {
            return { data: null, error: 'Invalid baselines response' };
        }
        return { data, error: null };
    }
    catch (err) {
        return { data: null, error: err.message };
    }
}
//# sourceMappingURL=supabase.js.map
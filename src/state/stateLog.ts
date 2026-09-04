/**
 * Temporary, easy-to-strip diagnostics for the state-persistence engine.
 * Flip DEBUG_STATE to false (or delete this file's call sites) to silence.
 * Every call site funnels through this single helper instead of scattering
 * ad hoc console.log calls, and every line is prefixed "[STATE]".
 */
export const DEBUG_STATE = true;

export function stateLog(message: string, details?: unknown): void {
    if (!DEBUG_STATE) {
        return;
    }
    if (details === undefined) {
        console.log(`[STATE] ${message}`);
    } else {
        console.log(`[STATE] ${message}`, details);
    }
}

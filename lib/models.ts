// lib/models.ts
// P388: the one place HV names its Claude model. Three routes hardcoded it, so
// when the account's model was retired (P90, then P129) each copy had to be found
// and changed, and /api/health could not tell anyone the model was gone. The
// health route now asks Anthropic whether THIS id still exists.
export const CLAUDE_MODEL = 'claude-sonnet-5'

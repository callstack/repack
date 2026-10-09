// Hostile config for the threat-matrix case: evaluating this config throws.
// Extraction must turn this into a ConfigEvalError (message, never a stack).
throw new Error('kaboom — hostile config exploded at import time');

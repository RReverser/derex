# derex
> Derivatives-based regexp to DFA compiler

This is a toy project to learn and investigate the alternative approach to building DFA from regular expressions that uses regular expression derivatives instead of NFA as an intermediate representation.

It uses Immutable.js to easily maintain certain invariants required by the approach (see https://www.cl.cam.ac.uk/~so294/documents/jfp09.pdf for more details).

Contents:

 - `re.ts`: factory functions for actual regular expressions (with some optimizations required by the approach and a bit more)
 - `derivatives.ts`: takes a regular expression and returns a `Derivatives` object with regexp => character classes mappings.
 - `dfa.ts`: takes a regular expression and recursively takes derivatives over all possible character classes to obtain a DFA.
 - `codegen.ts`: takes a DFA and generates a pure function that can return the next state based on previous one and a char code.
 - `tests.ts`: simple tests (incomplete)
 - `index.ts`: simple example for manual testing

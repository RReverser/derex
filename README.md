# derex
> Derivatives-based regexp to DFA compiler

This is a toy project to learn and investigate the alternative approach to building DFA from regular expressions that uses regular expression derivatives instead of NFA as an intermediate representation.

It uses Immutable.js to easily maintain certain invariants required by the approach (see https://www.cs.kent.ac.uk/people/staff/sao/documents/jfp09.pdf for more details).

Contents:

 - `re.ts`: factory functions for actual regular expressions (with some optimizations required by the approach and a bit more)
 - `derivatives.ts`: takes a regular expression and returns a `Derivatives` object with regexp => character classes mappings.
 - `dfa.ts`: takes a regular expression and recursively takes derivatives over all possible character classes to obtain a DFA.
 - `codegen.ts`: takes a DFA and generates a pure function that can return the next state based on previous one and a char code.
 - `tests.ts`: simple tests (incomplete)
 - `index.ts`: reexports everything from `re`, `dfa` and `codegen` modules

------

For example, the following regular expression:

```js
let sampleRe = or(
	concat(chars('a'), chars('c'), chars('1')),
	concat(chars('a'), chars('d'), chars('1')),
	concat(kleene(chars('b')), chars('1'))
);
```

produces a following function:

```js
function nextState(state, char) {
    switch (state) {
    case 2:
        switch (char) {
        case 49    /* "1" */:
            return -2;    // success
        default:
            return -1;    // error
        }
    case 1:
        switch (char) {
        case 100    /* "d" */:
        case 99    /* "c" */:
            return 2;
        default:
            return -1;    // error
        }
    case 3:
        switch (char) {
        case 98    /* "b" */:
            return 3;
        case 49    /* "1" */:
            return -2;    // success
        default:
            return -1;    // error
        }
    case 0:
        switch (char) {
        case 97    /* "a" */:
            return 1;
        case 98    /* "b" */:
            return 3;
        case 49    /* "1" */:
            return -2;    // success
        default:
            return -1;    // error
        }
    }
}
```

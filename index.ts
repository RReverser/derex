import { Set, Record, List } from 'immutable';

interface TypedBody<S extends string, B> {
    type: S,
    body: B
}

interface TypedRecord<S extends string, B> extends Record.Instance<TypedBody<S, B>>, Readonly<TypedBody<S, B>> {}

function factory<R extends TypedRecord<string, any>>(type: R['type']) {
    const inner = Record({ type, body: undefined });
    return (body: R['body']) => inner({ body }) as R;
}

export type Re = Chars | Empty | Concat | Kleene | Or | And | Not;

export interface Chars extends TypedRecord<'Chars', Set<number>> {}
const Chars = factory<Chars>('Chars');

export function chars(allowedChars: string) {
    return Chars(Set<number>().withMutations(set => {
        for (let i = 0; i < allowedChars.length; i++) {
            set.add(allowedChars.charCodeAt(i));
        }
    }));
}

function isNone(re: Re): boolean {
    return re.type === 'Chars' && re.body.isEmpty();
}

function isSome(re: Re): boolean {
    return re.type === 'Not' && isNone(re.body);
}

export interface Empty extends Record.Instance<{ type: 'Empty' }>, Readonly<{ type: 'Empty' }> {}
export const EMPTY: Empty = Record({ type: 'Empty' as 'Empty' })();

export interface Concat extends TypedRecord<'Concat', List<Chars | Kleene | Or | And | Not>> {}
const Concat = factory<Concat>('Concat');

export function concat(left: Re, right: Re) {
    if (left.type === 'Empty') return right;
    if (right.type === 'Empty') return left;

    let leftList = left.type === 'Concat' ? left.body : List.of(left);
    let rightList = right.type === 'Concat' ? right.body : List.of(right);

    return Concat(leftList.concat(rightList));
}

export interface Kleene extends TypedRecord<'Kleene', Chars | Concat | Or | And | Not> {}
const Kleene = factory<Kleene>('Kleene');

export function kleene(body: Re) {
    if (body.type === 'Empty' || body.type === 'Kleene') return body;
    if (isNone(body)) return EMPTY;
    return Kleene(body);
}

export interface Or extends TypedRecord<'Or', Set<Chars | Empty | Concat | Kleene | And | Not>> {}
const Or = factory<Or>('Or');

export function or(left: Re, right: Re) {
    if (isNone(left)) return right;
    if (isNone(right)) return left;

    if (isSome(left)) return left;
    if (isSome(right)) return right;

    let leftSet = left.type === 'Or' ? left.body : Set.of(left);
    let rightSet = right.type === 'Or' ? right.body : Set.of(right);

    return Or(leftSet.concat(rightSet));
}

export interface And extends TypedRecord<'And', Set<Chars | Empty | Concat | Kleene | Or | Not>> {}
const And = factory<And>('And');

export function and(left: Re, right: Re) {
    if (isNone(left)) return left;
    if (isNone(right)) return right;

    if (isSome(left)) return right;
    if (isSome(right)) return left;

    let leftSet = left.type === 'And' ? left.body : Set.of(left);
    let rightSet = right.type === 'And' ? right.body : Set.of(right);

    return And(leftSet.concat(rightSet));
}

export interface Not extends TypedRecord<'Not', Chars | Empty | Concat | Kleene | Or | And> {}
const Not = factory<Not>('Not');

export function not(body: Re) {
    if (body.type === 'Not') return body.body;
    return Not(body);
}

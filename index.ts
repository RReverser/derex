import { Set, Record, List, Collection, Seq, Map } from 'immutable';

interface TypedBody<S extends string, B> {
	type: S;
	body: B;
}

interface TypedRecord<S extends string, B>
	extends Record.Instance<TypedBody<S, B>>,
		Readonly<TypedBody<S, B>> {}

function factory<R extends TypedRecord<string, any>>(type: R['type']) {
	const inner = Record({ type, body: undefined });
	return (body: R['body']) => inner({ body }) as R;
}

export type Re = Chars | None | Empty | Concat | Kleene | Or | And | Not;
type Class = Set<number>;

export interface Chars extends TypedRecord<'Chars', Class> {}
const Chars = factory<Chars>('Chars');

export interface None extends Record.Instance<{ type: 'None' }>, Readonly<{ type: 'None' }> {}
export const NONE: None = Record({ type: 'None' as 'None' })();

export function chars(allowedChars: string) {
	return Chars(
		Set().withMutations(set => {
			for (let i = 0; i < allowedChars.length; i++) {
				set.add(allowedChars.charCodeAt(i));
			}
		})
	);
}

export interface Empty extends Record.Instance<{ type: 'Empty' }>, Readonly<{ type: 'Empty' }> {}
export const EMPTY: Empty = Record({ type: 'Empty' as 'Empty' })();

export interface Concat extends TypedRecord<'Concat', List<Chars | Kleene | Or | And | Not>> {}
const Concat = factory<Concat>('Concat');

export function concat(left: Re, right: Re) {
	if (left.type === 'None' || right.type === 'None') return NONE;

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
	if (body.type === 'None') return EMPTY;
	return Kleene(body);
}

export interface Or extends TypedRecord<'Or', Set<Chars | Empty | Concat | Kleene | And | Not>> {}
const Or = factory<Or>('Or');

export function or(left: Re, right: Re) {
	if (left.type === 'None') return right;
	if (right.type === 'None') return left;

	if (left.equals(NOT_NONE)) return left;
	if (right.equals(NOT_NONE)) return right;

	if (left.type === 'Chars' && right.type === 'Chars') {
		return Chars(left.body.union(right.body));
	}

	let leftSet = left.type === 'Or' ? left.body : Set.of(left);
	let rightSet = right.type === 'Or' ? right.body : Set.of(right);

	let resultSet = leftSet.union(rightSet);

	if (resultSet.size === 1) {
		return resultSet.first()!;
	}

	return Or(resultSet);
}

export interface And extends TypedRecord<'And', Set<Chars | Empty | Concat | Kleene | Or | Not>> {}
const And = factory<And>('And');

export function and(left: Re, right: Re) {
	if (left.type === 'None') return left;
	if (right.type === 'None') return right;

	if (left.equals(NOT_NONE)) return right;
	if (right.equals(NOT_NONE)) return left;

	if (left.type === 'Chars' && right.type === 'Chars') {
		return Chars(left.body.intersect(right.body));
	}

	let leftSet = left.type === 'And' ? left.body : Set.of(left);
	let rightSet = right.type === 'And' ? right.body : Set.of(right);

	let resultSet = leftSet.union(rightSet);

	if (resultSet.size === 1) {
		return resultSet.first()!;
	}

	return And(resultSet);
}

export interface Not extends TypedRecord<'Not', Chars | Empty | Concat | Kleene | Or | And> {}
const Not = factory<Not>('Not');

export function not(body: Re) {
	if (body.type === 'Not') return body.body;
	return Not(body);
}

export const NOT_NONE = Not(NONE);

export class Derivatives {
	constructor(public items = Map<Re, Class>(), public rest: Re = NONE) {}

	withMutations(f: (add: (chars: Class, re: Re) => void) => Re) {
		this.items = Map<Re, Class>().withMutations(map => {
			this.rest = f((chars, re) => map.update(re, Set(), prev => chars.union(prev)));
			map.delete(this.rest);
		});
		return this;
	}

	map(f: (re: Re) => Re) {
		return new Derivatives().withMutations(add => {
			for (let [re, chars] of this.items) {
				add(chars, f(re));
			}
			return f(this.rest);
		});
	}
}

function isNullable(re: Re): boolean {
	switch (re.type) {
		case 'None':
		case 'Chars': {
			return false;
		}

		case 'Kleene':
		case 'Empty': {
			return true;
		}

		case 'Concat':
		case 'And': {
			return (re.body as Collection<any, Re>).every(isNullable);
		}

		case 'Or': {
			return re.body.some(isNullable);
		}

		case 'Not': {
			return !isNullable(re);
		}
	}
}

function combine(
	v: Seq.Indexed<Derivatives>,
	initial: Re,
	f: (prev: Re, cur: Re) => Re
): Derivatives {
	return new Derivatives().withMutations(add =>
		(function go(
			v: Seq.Indexed<Derivatives>,
			inclusive: boolean,
			chars: Set<number>,
			re: Re
		): Re {
			if (inclusive && chars.isEmpty()) {
				return NONE;
			}

			if (v.isEmpty()) {
				if (inclusive) {
					add(chars, re);
					return NONE;
				} else {
					return re;
				}
			}

			let first = v.first()!;
			let rest = v.rest();

			let allChars = Set<number>();

			for (let [ subRe, subChars ] of first.items) {
				allChars = allChars.union(subChars);

				go(
					rest,
					true,
					inclusive ? subChars.intersect(chars) : subChars.subtract(chars),
					f(re, subRe)
				);
			}

			return go(
				rest,
				inclusive,
				inclusive ? chars.subtract(allChars) : chars.union(allChars),
				f(re, first.rest)
			);
		})(v, false, Set(), initial)
	);
}

export function getDerivatives(re: Re): Derivatives {
	switch (re.type) {
		case 'Chars': {
			return new Derivatives(Map.of(EMPTY, re.body), NONE);
		}

		case 'None':
		case 'Empty': {
			return new Derivatives();
		}

		case 'Kleene': {
			return getDerivatives(re.body).map(re2 => concat(re2, re));
		}

		case 'Not': {
			return getDerivatives(re.body).map(not);
		}

		case 'And': {
			return combine(re.body.valueSeq().map(getDerivatives), NOT_NONE, and);
		}

		case 'Concat': {
			return combine(
				re.body
					.valueSeq()
					.takeUntil((_, i) => i > 0 && isNullable(re.body.get(i - 1)!))
					.map((item, i) =>
						getDerivatives(item).map(re2 =>
							re.body
								.valueSeq()
								.skip(i + 1)
								.reduce(concat, re2)
						)
					),
				NONE,
				or
			);
		}

		case 'Or': {
			return combine(re.body.valueSeq().map(getDerivatives), NONE, or);
		}
	}
}

import {
	FunctionDeclaration,
	SwitchCase,
	SwitchStatement,
	Identifier,
	Literal,
	UnaryExpression,
	ReturnStatement
} from 'estree';
import { Dfa, Transitions } from './dfa';

function stateId(): Identifier {
	return {
		type: 'Identifier',
		name: 'state'
	};
}

function charId(): Identifier {
	return {
		type: 'Identifier',
		name: 'char'
	};
}

function numberLit(value: number): Literal | UnaryExpression {
	if (value < 0) {
		return {
			type: 'UnaryExpression',
			operator: '-',
			prefix: true,
			argument: numberLit(-value)
		};
	}
	return {
		type: 'Literal',
		value,
		raw: value.toString()
	};
}

function transitionsToAst(transitions: Transitions): SwitchStatement {
	let cases: SwitchCase[] = [];
	for (let [target, chars] of transitions) {
		if (chars === null) {
			cases.push({
				type: 'SwitchCase',
				test: null,
				consequent: []
			});
		} else {
			if (chars.isEmpty()) {
				throw new TypeError(`Unexpected transition from empty set of chars.`);
			}
			for (let ch of chars) {
				cases.push({
					type: 'SwitchCase',
					test: Object.assign(numberLit(ch), {
						trailingComments: [
							{
								type: 'Block',
								value: ` '${String.fromCharCode(ch)}'`
							}
						]
					}),
					consequent: []
				});
			}
		}
		let returnStmt: ReturnStatement = {
			type: 'ReturnStatement',
			argument: numberLit(target)
		};
		if (target < 0) {
			returnStmt.trailingComments = [
				{
					type: 'Line',
					value: ` ${target === -1 ? 'error' : 'success'}`
				}
			];
		}
		cases[cases.length - 1].consequent.push(returnStmt);
	}
	return {
		type: 'SwitchStatement',
		discriminant: charId(),
		cases
	};
}

function dfaToAst(dfa: Dfa): SwitchStatement {
	return {
		type: 'SwitchStatement',
		discriminant: stateId(),
		cases: dfa
			.entrySeq()
			.map(([id, transitions]): SwitchCase => ({
				type: 'SwitchCase',
				test: numberLit(id),
				consequent: [transitionsToAst(transitions)]
			}))
			.toArray()
	};
}

export function toAst(name: string, dfa: Dfa): FunctionDeclaration {
	return {
		type: 'FunctionDeclaration',
		id: {
			type: 'Identifier',
			name
		},
		params: [stateId(), charId()],
		body: {
			type: 'BlockStatement',
			body: [dfaToAst(dfa)]
		}
	};
}

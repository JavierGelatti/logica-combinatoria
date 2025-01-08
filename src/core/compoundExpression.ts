import {Expression} from "./expression.ts";
import {Identifier} from "./identifier.ts";
import {unificationFailure, UnificationResult} from "./unificationResult.ts";
import {Hole} from "./hole.ts";

export abstract class CompoundExpression extends Expression {
    protected readonly _subexpressions: Expression[];

    protected constructor(...subexpressions: Expression[]) {
        super();
        this._subexpressions = subexpressions;
        this._subexpressions.forEach(subexpression => {
            subexpression.insertedInto(this);
        });
    }

    isFreeVariable(variable: Identifier): boolean {
        return this.declarationOf(variable) === undefined;
    }

    declarationOf(variable: Identifier): Identifier | undefined {
        return this._parent?.declarationOf(variable);
    }

    unifyWith(anotherExpression: Expression) {
        if (!(anotherExpression instanceof this.constructor)) return unificationFailure();

        return this._unifyWith(anotherExpression as this);
    }

    protected abstract _unifyWith(anotherExpression: this): UnificationResult;

    protected _contains(anExpression: Expression): boolean {
        return this._subexpressions.some(subexpression => subexpression.contains(anExpression));
    }

    _containsOcurrenceOf(identifierDeclaration: Identifier): boolean {
        return this._subexpressions.some(subexpression => subexpression._containsOcurrenceOf(identifierDeclaration));
    }

    freeVariables(): Set<Identifier> {
        return this._subexpressions
            .map(subexpression => subexpression.freeVariables())
            .reduce((previous, current) => previous.union(current));
    }

    fillHole(holeToFill: Hole, expressionToFillHole: Expression) {
        this.assertIsDirectChild(holeToFill);

        this._subexpressions[this._subexpressions.indexOf(holeToFill)] = expressionToFillHole;
        expressionToFillHole.insertedInto(this);

        this._fillHole(holeToFill, expressionToFillHole);
    }

    private assertIsDirectChild(expression: Expression) {
        if (!this._subexpressions.includes(expression))
            throw new Error("The expression is not a direct child");
    }

    protected abstract _fillHole(holeToFill: Hole, expressionToFillHole: Expression): void;
}
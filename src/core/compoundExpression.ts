import {Expression, ExpressionType} from "./expression.ts";
import {Identifier} from "./identifier.ts";
import {unificationFailure, UnificationResult} from "./unificationResult.ts";
import {Hole} from "./hole.ts";

export abstract class CompoundExpression<T extends ExpressionType = ExpressionType> extends Expression<T> {
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

    _containsOccurrenceOf(identifierDeclaration: Identifier): boolean {
        return this._subexpressions.some(subexpression => subexpression._containsOccurrenceOf(identifierDeclaration));
    }

    freeVariables(): Set<Identifier> {
        return this._subexpressions
            .map(subexpression => subexpression.freeVariables())
            .reduce((previous, current) => previous.union(current));
    }

    fillHole<S extends ExpressionType>(holeToFill: Hole<S>, expressionToFillHole: Expression<S>) {
        this.replaceDirectChild(holeToFill, expressionToFillHole);
    }

    detachChild<S extends ExpressionType>(expressionToDetach: Expression<S>): Hole<S> {
        const replacement = new Hole(expressionToDetach.type());
        this.replaceDirectChild(expressionToDetach, replacement);
        return replacement;
    }

    private replaceDirectChild<S extends ExpressionType>(childToReplace: Expression<S>, replacement: Expression<S>) {
        this.assertIsDirectChild(childToReplace);

        this._subexpressions[this._subexpressions.indexOf(childToReplace)] = replacement;
        replacement.insertedInto(this);
        childToReplace.detachedFrom(this);

        this._replaceDirectChild(childToReplace, replacement);
    }

    protected abstract _replaceDirectChild<S extends ExpressionType>(childToReplace: Expression<S>, replacement: Expression<S>): void;

    private assertIsDirectChild(expression: Expression) {
        if (!this._subexpressions.includes(expression))
            throw new Error("The expression is not a direct child");
    }

    allHolesOfType<S extends ExpressionType>(expressionType: S): Hole<S>[] {
        return this._subexpressions.flatMap(subexpression => subexpression.allHolesOfType(expressionType));
    }
}
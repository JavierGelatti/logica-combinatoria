import {Expression} from "./expression.ts";
import {Identifier} from "./identifier.ts";
import {unificationFailure, UnificationResult} from "./unificationResult.ts";

export abstract class CompoundExpression extends Expression {
    protected readonly subexpressions: Expression[];

    protected constructor(...subexpressions: Expression[]) {
        super();
        this.subexpressions = subexpressions;
        this.subexpressions.forEach(subexpression => {
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

    _containsOcurrenceOf(identifierDeclaration: Identifier): boolean {
        return this.subexpressions.some(subexpression => subexpression._containsOcurrenceOf(identifierDeclaration));
    }
}
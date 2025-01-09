import { Expression } from "./expression";
import { Identifier } from "./identifier";
import {unificationFailure, UnificationResult} from "./unificationResult";

export class Hole extends Expression {
    protected _equals(anotherObject: this): boolean {
        return this === anotherObject;
    }

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
        if (subExpressionToReplace === this) {
            return newExpression.copy();
        }

        return this.copy();
    }

    public unifyWith(_anotherExpression: Expression): UnificationResult {
        return unificationFailure();
    }

    protected _contains(_anExpression: Expression): boolean {
        return false;
    }

    _containsOccurrenceOf(_identifierDeclaration: Identifier): boolean {
        return false;
    }

    copy(): this {
        return new Hole() as this;
    }

    freeVariables(): Set<Identifier> {
        return new Set();
    }

    fillWith(anExpression: Expression) {
        if (this._parent === undefined) throw new Error("Cannot fill root hole");

        this._parent.fillHole(this, anExpression);
    }
}
import {CompoundExpression} from "./compoundExpression.ts";
import {UnificationResult} from "./unificationResult.ts";

export abstract class Expression {
    protected _parent: CompoundExpression | undefined;

    equals(anotherObject: unknown): boolean {
        if (!(anotherObject instanceof this.constructor)) return false;

        return this._equals(anotherObject as this);
    }

    protected abstract _equals(anotherObject: this): boolean;

    public abstract replace(subExpressionToReplace: Expression, newExpression: Expression): Expression;

    insertedInto(newParent: CompoundExpression) {
        this._parent = newParent;
    }

    public abstract unifyWith(anotherExpression: Expression): UnificationResult;

    abstract _containsOcurrenceOf(identifierDeclaration: Identifier): boolean;
}
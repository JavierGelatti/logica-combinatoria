import {CompoundExpression} from "./compoundExpression.ts";
import {UnificationResult} from "./unificationResult.ts";
import {Identifier} from "./identifier.ts";

export abstract class Expression {
    protected _parent: CompoundExpression | undefined;

    equals(anotherObject: unknown): boolean {
        if (!(anotherObject instanceof this.constructor)) return false;

        return this._equals(anotherObject as this);
    }

    protected abstract _equals(anotherObject: this): boolean;

    public abstract replace(subExpressionToReplace: Expression, newExpression: Expression): Expression;

    insertedInto(newParent: CompoundExpression) {
        if (this._parent !== undefined) throw new Error("The expression already had a parent");

        this._parent = newParent;
    }

    public abstract unifyWith(anotherExpression: Expression): UnificationResult;

    contains(anExpression: Expression): boolean {
        return this === anExpression || this._contains(anExpression);
    }

    protected abstract _contains(anExpression: Expression): boolean;

    abstract _containsOcurrenceOf(identifierDeclaration: Identifier): boolean;

    commonAncestor(anotherExpression: Expression): Expression | undefined {
        if (this.contains(anotherExpression)) {
            return this;
        }

        return this._parent?.commonAncestor(anotherExpression);
    }

    abstract copy(): this
}
import {Expression, ExpressionType, Value} from "./expression";
import { Identifier } from "./identifier";
import {unificationFailure, UnificationResult} from "./unificationResult";

export class Hole<T extends ExpressionType> extends Expression<T> {
    protected _type: T;

    constructor(type: T) {
        super();
        this._type = type;
    }

    protected _equals(anotherObject: this): boolean {
        return this === anotherObject;
    }

    public replace(subExpressionToReplace: Expression<Value>, newExpression: Expression<Value>): Expression {
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
        return new Hole(this._type) as this;
    }

    freeVariables(): Set<Identifier> {
        return new Set();
    }

    fillWith(anExpression: Expression<T>) {
        if (this._parent === undefined) throw new Error("Cannot fill root hole");

        this._parent.fillHole(this, anExpression);
    }

    allHolesOfType<S extends ExpressionType>(expressionType: S): Hole<S>[] {
        if (this.hasType(expressionType)) {
            return [this as unknown as Hole<S>];
        } else {
            return [];
        }
    }
}
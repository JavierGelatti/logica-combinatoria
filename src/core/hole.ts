import {Expression, ExpressionType} from "./expression";
import { Identifier } from "./identifier";
import {unificationFailure, UnificationResult} from "./unificationResult";
import {AtomicExpression} from "./atomicExpression.ts";

export class Hole<T extends ExpressionType> extends AtomicExpression<T> {
    protected _type: T;

    constructor(type: T) {
        super();
        this._type = type;
    }

    protected _equals(anotherObject: this): boolean {
        return this === anotherObject;
    }

    public unifyWith(_anotherExpression: Expression): UnificationResult {
        return unificationFailure();
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

    toString(): string {
        return "_";
    }

    allOccurrencesOf(_lookedUpIdentifier: Identifier): Set<Identifier> {
        return new Set();
    }
}
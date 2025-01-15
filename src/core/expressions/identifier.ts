import {Expression, ExpressionType, Value, valueType} from "./expression.ts";
import {successfulUnification, unificationFailure, UnificationResult} from "../unificationResult.ts";
import {Exists} from "./exists.ts";
import { Hole } from "./hole.ts";
import {AtomicExpression} from "./atomicExpression.ts";
import { Binder } from "./binder.ts";

export class Identifier extends AtomicExpression<Value> {
    protected _type: Value = valueType;

    constructor(
        readonly name: string | symbol,
        readonly subscript?: number
    ) {
        super();
    }

    protected _equals(anotherObject: this): boolean {
        return anotherObject.name === this.name && anotherObject.subscript === this.subscript;
    }

    copy() {
        return new Identifier(this.name, this.subscript) as this;
    }

    withIncrementedSubscript() {
        return new Identifier(this.name, this.subscript !== undefined ? this.subscript + 1 : 0) as this;
    }

    isFree() {
        return this.isFreeVariableInParent(this);
    }

    unifyWith(anotherExpression: Expression) {
        if (this.isFree()) {
            return this._unifyWhenFree(anotherExpression);
        } else {
            return this._unifyWhenBound(anotherExpression);
        }
    }

    private _unifyWhenFree(anotherExpression: Expression) {
        if (!(anotherExpression instanceof Identifier)) return unificationFailure();

        if (anotherExpression.isFree()) {
            return this.equals(anotherExpression) ? successfulUnification() : unificationFailure();
        }

        return unificationFailure();
    }

    private _unifyWhenBound(anotherExpression: Expression): UnificationResult {
        const declarationOfThis = this.declaration()!;

        if (this.isExistentiallyBound()) {
            if (!(anotherExpression instanceof Identifier)) return unificationFailure();

            if (declarationOfThis !== anotherExpression.declaration()) return unificationFailure();

            return successfulUnification();
        } else {
            if (!(anotherExpression instanceof Identifier)) {
                if (anotherExpression._containsOccurrenceOf(declarationOfThis)) {
                    return unificationFailure();
                } else {
                    return successfulUnification([declarationOfThis, anotherExpression]);
                }
            }

            if (declarationOfThis === anotherExpression.declaration()) {
                return successfulUnification();
            }

            if (anotherExpression.isFree()) {
                return successfulUnification([declarationOfThis, anotherExpression]);
            }

            return successfulUnification([declarationOfThis, anotherExpression]);
        }
    }

    private isExistentiallyBound() {
        return this.binder() instanceof Exists;
    }

    binder(): Binder | undefined {
        return this._parent?.declarationOf(this);
    }

    declaration(): Identifier | undefined {
        return this._parent?.declarationOf(this)?.boundVariable;
    }

    _containsOccurrenceOf(identifierDeclaration: Identifier): boolean {
        return this.declaration() === identifierDeclaration;
    }

    freeVariables(): Set<Identifier> {
        return this.isFree() ? new Set([this]) : new Set();
    }

    allHolesOfType<S extends ExpressionType>(_expressionType: S): Hole<S>[] {
        return [];
    }

    toString(): string {
        if (this.subscript !== undefined) {
            return `${String(this.name)}_${this.subscript}`;
        } else {
            return String(this.name);
        }
    }

    allOccurrences(): Set<Identifier> {
        const binder = this.binder();
        if (binder === undefined) throw new Error("The variable is free");

        return new Set([binder.boundVariable])
            .union(binder.body.allOccurrencesOf(binder.boundVariable));
    }

    allOccurrencesOf(lookedUpIdentifier: Identifier): Set<Identifier> {
        if (this.equals(lookedUpIdentifier)) {
            return new Set([this]);
        } else {
            return new Set();
        }
    }
}
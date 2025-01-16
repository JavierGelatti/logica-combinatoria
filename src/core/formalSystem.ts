import {Expression, Truth} from "./expressions/expression.ts";
import {Identifier} from "./expressions/identifier.ts";

export class FormalSystem {
    private readonly _axioms: Expression<Truth>[] = [];
    private readonly _wellKnownObjects: Identifier[] = [];

    axioms() {
        return this._axioms;
    }

    addAxiom(expression: Expression<Truth>): void {
        if (!expression.isComplete()) throw new Error("An expression with holes cannot be added as an axiom");
        if (!expression.isRootExpression()) throw new Error("A non-root expression cannot be added as an axiom");

        [...expression.freeVariables()]
            .forEach(freeVariable => this._registerAsWellKnownObject(freeVariable));

        this._axioms.push(expression);
    }

    private _registerAsWellKnownObject(freeVariable: Identifier) {
        if (this._wellKnownObjects.some(o => o.equals(freeVariable))) return;

        this._wellKnownObjects.push(freeVariable.copy());
    }

    wellKnownObjects(): Identifier[] {
        return this._wellKnownObjects;
    }

    isWellKnownFreeVariable(identifier: Identifier) {
        return this._wellKnownObjects.some(o => o.equals(identifier));
    }
}
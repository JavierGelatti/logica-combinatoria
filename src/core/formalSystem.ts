import {Expression, Truth, Value} from "./expressions/expression.ts";
import {Identifier} from "./expressions/identifier.ts";
import {ForAll} from "./expressions/forAll.ts";

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

    universalQuantifiersThatCanBeAppliedTo(argument: Expression): ForAll[] {
        if (!this._isCompleteStandAloneValue(argument)) return [];

        return this._axioms
            .flatMap(expression => expression.allSubExpressions())
            .filter(expression => expression instanceof ForAll)
            .filter(forall => this._canApplyTo(argument, forall));
    }

    private _canApplyTo(argument: Expression<Value>, forall: ForAll) {
        return [...argument.freeVariables()]
            .every(freeVariable => {
                return this.isWellKnownFreeVariable(freeVariable) || !forall.isFreeVariableInParent(freeVariable);
            });
    }

    private _isCompleteStandAloneValue(anExpression: Expression): anExpression is Expression<Value> {
        return anExpression.isValue() && this._isCompleteStandAloneExpression(anExpression);
    }

    private _isCompleteStandAloneExpression(anExpression: Expression): boolean {
        return anExpression.isRootExpression() && anExpression.isComplete();
    }
}
import {Expression, ExpressionType, Truth, Value} from "./expressions/expression.ts";
import {Identifier} from "./expressions/identifier.ts";
import {ForAll} from "./expressions/forAll.ts";

const standAloneBrand = Symbol("standAloneBrand");
type StandAlone = { [standAloneBrand]: any }
type StandAloneExpression<T extends ExpressionType = any> = Expression<T> & StandAlone;

export class FormalSystem {
    private readonly _axioms: StandAloneExpression<Truth>[] = [];
    private readonly _wellKnownObjects: Identifier[] = [];

    axioms() {
        return this._axioms;
    }

    addAxiom(expression: Expression<Truth>): void {
        if (!this._isStandAloneTruth(expression)) throw new Error("A non-stand-alone expression cannot be added as an axiom");

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
        if (!this._isStandAloneValue(argument)) return [];

        return this._axioms
            .flatMap(expression => expression.allSubExpressions())
            .filter(expression => expression instanceof ForAll)
            .filter(forall => this._canApplyTo(argument, forall));
    }

    private _canApplyTo(argument: StandAloneExpression<Value>, forall: ForAll) {
        return [...argument.freeVariables()]
            .every(freeVariable => {
                return this.isWellKnownFreeVariable(freeVariable) || !forall.isFreeVariableInParent(freeVariable);
            });
    }

    private _isStandAloneValue(anExpression: Expression): anExpression is StandAloneExpression<Value> {
        return anExpression.isValue() && this._isStandAloneExpression(anExpression);
    }

    private _isStandAloneTruth(anExpression: Expression): anExpression is StandAloneExpression<Truth> {
        return !anExpression.isValue() && this._isStandAloneExpression(anExpression);
    }

    private _isStandAloneExpression<T extends ExpressionType>(anExpression: Expression<T>): anExpression is StandAloneExpression<T> {
        return anExpression.isRootExpression() && anExpression.isComplete();
    }
}
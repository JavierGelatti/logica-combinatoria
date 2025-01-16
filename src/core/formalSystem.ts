import {Expression, ExpressionType, Truth, Value} from "./expressions/expression.ts";
import {Identifier} from "./expressions/identifier.ts";
import {ForAll} from "./expressions/forAll.ts";

const standAloneBrand = Symbol("standAloneBrand");
type StandAlone = { [standAloneBrand]: any }
type StandAloneExpression<T extends ExpressionType = any> = Expression<T> & StandAlone;

export class FormalSystem {
    private readonly _axioms: StandAloneExpression<Truth>[] = [];
    private readonly _theorems: StandAloneExpression<Truth>[] = [];
    private readonly _wellKnownObjects: Identifier[] = [];

    axioms() {
        return [...this._axioms];
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
        return [...this._wellKnownObjects];
    }

    isWellKnownFreeVariable(identifier: Identifier) {
        return this._wellKnownObjects.some(o => o.equals(identifier));
    }

    universalQuantifiersThatCanBeAppliedTo(argument: Expression): ForAll[] {
        if (!this._isStandAloneValue(argument)) return [];

        return this._subexpressionOfProvenExpressions()
            .filter(expression => expression instanceof ForAll)
            .filter(forall => this._canApplyTo(forall, argument));
    }

    private _subexpressionOfProvenExpressions() {
        return this._provenExpressions()
            .flatMap(expression => expression.allSubExpressions());
    }

    private _canApplyTo(forall: ForAll, argument: StandAloneExpression<Value>) {
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

    eliminateForAll(quantifierToEliminate: ForAll, argument: Expression) {
        if (!this._isStandAloneValue(argument)) throw new Error("Cannot apply a forall to a non-stand-alone value");
        if (!this._canApplyTo(quantifierToEliminate, argument)) throw new Error("Cannot apply a forall if it'd leave new unknown free variables");

        const provenRootExpression = this._provenExpressionContaining(quantifierToEliminate);
        if (provenRootExpression === undefined) throw new Error("Cannot eliminate a non-proved universal quantifier");

        const newTheorem = provenRootExpression.replace(
            quantifierToEliminate,
            quantifierToEliminate.applyTo(argument)
        );

        this._theorems.push(newTheorem as StandAloneExpression<Truth>);
        return newTheorem;
    }

    private _provenExpressionContaining(expression: Expression) {
        return this._provenExpressions().find(axiom => axiom.contains(expression));
    }

    private _provenExpressions() {
        return [...this._axioms, ...this._theorems];
    }

    theorems() {
        return [...this._theorems];
    }
}
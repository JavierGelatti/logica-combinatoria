import {EquationMember, Expression, ExpressionType, Truth, Value} from "./expressions/expression.ts";
import {Identifier} from "./expressions/identifier.ts";
import {ForAll} from "./expressions/forAll.ts";
import {Equality} from "./expressions/equality.ts";

const standAloneBrand = Symbol("standAloneBrand");
type StandAlone = { [standAloneBrand]: any };
type StandAloneExpression<T extends ExpressionType = any> = Expression<T> & StandAlone;
type Proposition = StandAloneExpression<Truth>;

export type PropositionIdentifier = ['A' | 'T', ...number[]];

type PropositionPart<T extends ExpressionType> = { rootExpression(): Proposition } & Expression<T>;

export class FormalSystem {
    private readonly _axioms: Proposition[] = [];
    private readonly _theorems: Proof[] = [];
    private readonly _wellKnownObjects: Identifier[] = [];

    axioms() {
        return [...this._axioms];
    }

    addAxiom(expression: Expression<Truth>): void {
        if (!this._isProposition(expression)) throw new Error("A non-stand-alone expression cannot be added as an axiom");

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

    private _isProposition(anExpression: Expression): anExpression is Proposition {
        return !anExpression.isValue() && this._isStandAloneExpression(anExpression);
    }

    private _isStandAloneExpression<T extends ExpressionType>(anExpression: Expression<T>): anExpression is StandAloneExpression<T> {
        return anExpression.isRootExpression() && anExpression.isComplete();
    }

    eliminateForAll(quantifierToEliminate: ForAll, argument: Expression) {
        if (!this._isStandAloneValue(argument)) throw new Error("Cannot apply a forall to a non-stand-alone value");
        if (!this._canApplyTo(quantifierToEliminate, argument)) throw new Error("Cannot apply a forall if it'd leave new unknown free variables");
        if (!this._isPartOfProvenProposition(quantifierToEliminate)) throw new Error("Cannot eliminate a non-proved universal quantifier");

        const newTheorem = quantifierToEliminate.rootExpression().replace(
            quantifierToEliminate,
            quantifierToEliminate.applyTo(argument),
        ) as Proposition;

        const newProof = new ForAllElimination(newTheorem, quantifierToEliminate, argument);
        this._theorems.push(newProof);
        return newProof;
    }

    private _provenExpressionContaining(expression: Expression): Proposition | undefined {
        const rootExpression = expression.rootExpression();
        return this._provenExpressions()
            .find(expression => expression === rootExpression);
    }

    private _provenExpressions() {
        return [...this.axioms(), ...this.theorems()];
    }

    theorems() {
        return this._theorems.map(proof => proof.provenProposition);
    }

    rewriteCandidatesMatching(term: Expression) {
        if (!term.isEquationMember()) return [];

        const termProvenRoot = this._provenExpressionContaining(term);
        if (termProvenRoot === undefined) return [];

        return this._provenExpressions()
            .filter(expression => expression !== termProvenRoot)
            .flatMap(expression => expression.allSubExpressions())
            .map(expression => this._rewriteEqualityUsing(term, expression) ? expression : undefined)
            .filter(result=> result !== undefined);
    }

    private _rewriteEqualityUsing(equalityMember: EquationMember, targetExpression: Expression): Equality | undefined {
        if (!targetExpression.isValue()) return undefined;
        const unificationResult = equalityMember.unifyWith(targetExpression);
        if (!unificationResult.isSuccessful()) return undefined;
        const rewriteResult = unificationResult.rewrite();
        if (!(rewriteResult instanceof Equality)) return undefined;
        return rewriteResult;
    }

    private _isPartOfProvenProposition<T extends ExpressionType>(expression: Expression<T>): expression is PropositionPart<T> {
        return this._provenExpressionContaining(expression) !== undefined;
    }

    rewrite(source: Expression<Value>, target: Expression<Value>) {
        this._assertCouldRewrite(source, target);

        const rewrittenEquation = this._rewriteEqualityUsing(source, target);
        if (rewrittenEquation === undefined)
            throw new Error("The rewrite target must fully unify with the source")

        const sourceEquality = source.parent();
        const newValue = source === sourceEquality.right ? rewrittenEquation.left : rewrittenEquation.right;
        const newTheorem = target.rootExpression().replace(target, newValue.copy()) as Proposition;

        const newProof = new TermRewriting(newTheorem, source, target as PropositionPart<Value>);
        this._theorems.push(newProof);
        return newProof;
    }

    private _assertCouldRewrite(
        source: Expression<Value>, target: Expression<Value>
    ): asserts source is EquationMember & PropositionPart<Value> {
        if (!source.isEquationMember())
            throw new Error("Must use an equation member to perform a rewrite");

        if (!this._isPartOfProvenProposition(source) || !this._isPartOfProvenProposition(target))
            throw new Error("Cannot rewrite using non-proven expressions");

        if (target.rootExpression() === source.rootExpression())
            throw new Error("The rewrite target must be part of a different expression of the source");

        if (!target.isValue())
            throw new Error("The rewrite target must be a value");
    }

    identifierOf(expression: Expression): PropositionIdentifier | undefined {
        const expressionAsProposition = expression as Proposition;

        const axiomIndex = this.axioms().indexOf(expressionAsProposition);
        if (axiomIndex !== -1) {
            return ['A', axiomIndex + 1];
        }

        const theoremIndex = this.theorems().indexOf(expressionAsProposition);
        if (theoremIndex !== -1) {
            return ['T', theoremIndex + 1];
        }

        return undefined;
    }
}

abstract class Proof {
    constructor(
        public readonly provenProposition: Proposition
    ) {}

    abstract referencedPropositions(): Proposition[]
}
abstract class DirectProof extends Proof {}
class ForAllElimination extends DirectProof {
    constructor(
        provenProposition: Proposition,
        public readonly eliminatedForAll: PropositionPart<Truth> & ForAll,
        public readonly argument: Expression<Value>
    ) {
        super(provenProposition);
    }

    referencedPropositions(): Proposition[] {
        return [this.eliminatedForAll.rootExpression()];
    }
}

class TermRewriting extends DirectProof {
    constructor(
        provenProposition: Proposition,
        public readonly source: PropositionPart<Value> & EquationMember,
        public readonly target: PropositionPart<Value>
    ) {
        super(provenProposition);
    }

    referencedPropositions(): Proposition[] {
        return [this.source.rootExpression(), this.target.rootExpression()];
    }
}

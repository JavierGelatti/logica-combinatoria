import {EquationMember, Expression, ExpressionType, Truth, Value} from "./expressions/expression.ts";
import {Identifier} from "./expressions/identifier.ts";
import {ForAll} from "./expressions/forAll.ts";
import {Equality} from "./expressions/equality.ts";
import {forall} from "./expressions/expression_constructors.ts";
import {lastElementOf} from "./essentials/lastElement.ts";
import {withoutDuplicates} from "./essentials/withoutDuplicates.ts";
import {Exists} from "./expressions/exists.ts";

const standAloneBrand = Symbol("standAloneBrand");
type StandAlone = { [standAloneBrand]: any };
type StandAloneExpression<T extends ExpressionType = any> = Expression<T> & StandAlone;
type Proposition = StandAloneExpression<Truth>;

export type PropositionIdentifier = ['A' | 'T', ...number[]];

type PropositionPart<T extends ExpressionType> = { rootExpression(): Proposition } & Expression<T>;

export class FormalSystem {
    private readonly _axioms: Proposition[] = [];
    private readonly _wellKnownObjects: Identifier[] = [];
    private readonly _theorems: Proof[] = [];
    private _currentProofs: Context[] = [];
    private _propositionIds: WeakMap<Proposition, PropositionIdentifier> = new WeakMap();

    axioms() {
        return [...this._axioms];
    }

    addAxiom(expression: Expression<Truth>): void {
        if (!this._isProposition(expression)) throw new Error("A non-stand-alone expression cannot be added as an axiom");

        [...expression.freeVariables()]
            .forEach(freeVariable => this._registerAsWellKnownObject(freeVariable));

        this._axioms.push(expression);
        this._propositionIds.set(expression, ['A', this._axioms.length]);
    }

    private _registerAsWellKnownObject(freeVariable: Identifier) {
        if (this._wellKnownObjects.some(o => o.equals(freeVariable))) return;

        this._wellKnownObjects.push(freeVariable.copy());
    }

    objectsInContext(): Identifier[] {
        return [
            ...this._wellKnownObjects,
            ...this._currentProofs.flatMap(proof => proof.objectsInContext())
        ];
    }

    isKnownObject(identifier: Identifier) {
        return this.objectsInContext()
            .some(o => o.equals(identifier));
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
                return this.isKnownObject(freeVariable) === forall.isFreeVariableInParent(freeVariable);
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
        this._registerProof(newProof);
        return newProof;
    }

    private _provenExpressionContaining(expression: Expression): Proposition | undefined {
        const rootExpression = expression.rootExpression();
        return this._provenExpressions()
            .find(expression => expression === rootExpression);
    }

    private _provenExpressions() {
        return [...this.axioms(), ...this.theorems(), ...this._currentProofs.flatMap(proof => proof.provenExpressions())];
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

    private _isProven(expression: Proposition): boolean {
        return this._provenExpressions().includes(expression);
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
        this._registerProof(newProof);
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
        return this._propositionIds.get(expression as Proposition);
    }

    startForAllIntroduction(...newBoundVariables: Identifier[]) {
        this._assertValidIdentifiersForForAllIntroduction(newBoundVariables);

        this._currentProofs.push(new Context(newBoundVariables));
    }

    private _assertValidIdentifiersForForAllIntroduction(
        identifiers: Identifier[]
    ): asserts identifiers is (Identifier & StandAlone)[] {
        identifiers.forEach(identifier => {
            if (!this._isStandAloneExpression(identifier))
                throw new Error("Cannot introduce a forall with a non-root identifier");

            if (this.isKnownObject(identifier))
                throw new Error("Cannot introduce a forall with a known object identifier");
        });
    }

    finishCurrentProof() {
        const currentProof = lastElementOf(this._currentProofs);
        if (currentProof === undefined)
            throw new Error("Cannot finish non-started proof");

        const newProof = currentProof.finishProof();
        this._currentProofs.pop();
        this._registerProof(newProof);
        return newProof;
    }

    private _registerProof(newProof: Proof) {
        const currentProof = lastElementOf(this._currentProofs);
        if (currentProof !== undefined) {
            currentProof.registerStep(newProof);
            const steps = this._currentProofs.map(context => context.numberOfSteps());
            this._propositionIds.set(newProof.provenProposition, ['T', this._theorems.length + 1, ...steps]);
        } else {
            this._theorems.push(newProof);
            this._propositionIds.set(newProof.provenProposition, ['T', this._theorems.length]);
        }
    }

    existentialQuantifiersCandidateForElimination(): (Exists & StandAlone)[] {
        return this._provenExpressions()
            .filter(expression => expression instanceof Exists);
    }

    eliminateExists(existentialToEliminate: Exists, newIdentifier: Identifier) {
        if (!existentialToEliminate.isRootExpression())
            throw new Error("Cannot eliminate a non-root existential quantifier");

        if (!this._isProposition(existentialToEliminate) || !this._isProven(existentialToEliminate))
            throw new Error("Cannot eliminate a non-proven existential quantifier");

        if (this.isKnownObject(newIdentifier))
            throw new Error("Cannot eliminate an existential quantifier with a known object");

        if (!this._isStandAloneValue(newIdentifier))
            throw new Error("Cannot eliminate an existential quantifier with a non-root identifier");

        const provenProposition = existentialToEliminate.applyTo(newIdentifier) as Proposition;
        const newProof = new ExistsElimination(
            provenProposition,
            existentialToEliminate,
            newIdentifier
        );
        this._registerProof(newProof)
        return newProof;
    }
}

export class Context {
    private readonly _steps: Proof[] = [];
    private readonly _extraBoundVariables: (Identifier & StandAlone)[] = [];

    constructor(
        private readonly ownBoundVariables: (Identifier & StandAlone)[]
    ) {}

    objectsInContext(): Identifier[] {
        return [...this.ownBoundVariables, ...this._extraBoundVariables];
    }

    registerStep(newProof: Proof) {
        if (newProof instanceof ExistsElimination) {
            this._extraBoundVariables.push(newProof.newBoundVariable);
        }
        this._steps.push(newProof);
    }

    provenExpressions() {
        return this._steps.map(step => step.provenProposition);
    }

    finishProof(): MultiStepProof {
        const lastStep = lastElementOf(this._steps);

        if (lastStep === undefined)
            throw new Error("Cannot finish empty proof");

        if (this._thereAreExtraFreeVariablesIn(lastStep.provenProposition))
            throw new Error("Cannot finish proof with free variables");

        return new MultiStepProof(
            this._buildProvenProposition(lastStep.provenProposition),
            this._steps
        );
    }

    private _thereAreExtraFreeVariablesIn(proposition: Proposition) {
        return this._extraBoundVariables
            .some(variable => proposition.freeVariablesContain(variable));
    }

    private _buildProvenProposition(lastStepProvenProposition: Proposition, boundVariables = this.ownBoundVariables): Proposition {
        if (boundVariables.length === 0) return lastStepProvenProposition.copy();

        const [boundVariable, ...restOfBoundVariables] = boundVariables;

        return forall(
            boundVariable.copy(),
            this._buildProvenProposition(lastStepProvenProposition, restOfBoundVariables)
        ) as Expression<Truth> as Proposition;
    }

    numberOfSteps() {
        return this._steps.length;
    }
}

export abstract class Proof {
    constructor(
        public readonly provenProposition: Proposition
    ) {}

    abstract referencedPropositions(): Proposition[]
}

export abstract class DirectProof extends Proof {}
export class MultiStepProof extends Proof {
    constructor(
        provenProposition: Proposition,
        public readonly steps: Proof[]
    ) {
        super(provenProposition);
    }

    referencedPropositions(): Proposition[] {
        const ownPropositions = this._ownPropositions();
        return withoutDuplicates(
            this.steps.flatMap(step => step.referencedPropositions())
        ).filter(proposition => !ownPropositions.includes(proposition));
    }

    private _ownPropositions() {
        return this.steps.map(step => step.provenProposition);
    }
}

export class ForAllElimination extends DirectProof {
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

export class ExistsElimination extends DirectProof {
    constructor(
        provenProposition: Proposition,
        public readonly eliminatedExistential: Proposition & Exists,
        public readonly newBoundVariable: Identifier & StandAlone
    ) {
        super(provenProposition);
    }

    referencedPropositions(): Proposition[] {
        return [this.eliminatedExistential];
    }
}

export class TermRewriting extends DirectProof {
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

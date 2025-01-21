import {EquationMember, Expression, ExpressionType, Truth, truthType, Value} from "./expressions/expression.ts";
import {Identifier} from "./expressions/identifier.ts";
import {ForAll} from "./expressions/forAll.ts";
import {Equality} from "./expressions/equality.ts";
import {equality, exists, forall} from "./expressions/expression_constructors.ts";
import {lastElementOf} from "./essentials/lastElement.ts";
import {withoutDuplicates} from "./essentials/withoutDuplicates.ts";
import {Exists} from "./expressions/exists.ts";
import {removeElementFrom} from "./essentials/removeElementFrom.ts";

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

    arbitraryObjectsInCurrentOngoingProof() {
        return lastElementOf(this._currentProofs)?.ownBoundVariables() ?? [];
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

    private _isProven(expression: Expression): expression is Proposition {
        return this._provenExpressions().includes(expression as Proposition);
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

    newArbitraryVariables(...newBoundVariables: Identifier[]) {
        this._assertValidNewIdentifiers(newBoundVariables);

        const currentProof = this._forceCurrentOngoingProof();

        currentProof.addBoundVariables(newBoundVariables);
    }

    private _assertValidNewIdentifiers(
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
        const currentProof = this._currentOngoingProof();
        if (currentProof === undefined)
            throw new Error("Cannot finish non-started proof");

        const newProof = currentProof.finishProof();
        this._currentProofs.pop();
        this._registerProof(newProof);
        return newProof;
    }

    private _currentOngoingProof() {
        return lastElementOf(this._currentProofs);
    }

    private _registerProof(newProof: Proof) {
        const currentProof = this._currentOngoingProof();
        if (currentProof !== undefined) {
            currentProof.registerStep(newProof);
            const steps = this._currentProofs.map(context => context.numberOfSteps());
            this._propositionIds.set(newProof.provenProposition, ['T', this._theorems.length + 1, ...steps]);
        } else {
            this._theorems.push(newProof);
            this._propositionIds.set(newProof.provenProposition, ['T', this._theorems.length]);
        }
    }

    existentialQuantifiersThatCanBeReplacedWith(identifier: Identifier): (Exists & StandAlone)[] {
        if (this.isNotAvailableKnownObject(identifier)) return [];

        return this._provenExpressions().filter(expression => {
            // noinspection SuspiciousTypeOfGuard
            return expression instanceof Exists;
        });
    }

    private isNotAvailableKnownObject(identifier: Identifier) {
        return this.isKnownObject(identifier) && !this._currentOngoingProof()?.ownsUnused(identifier);
    }

    eliminateExists(existentialToEliminate: Exists, newIdentifier: Identifier) {
        if (!existentialToEliminate.isRootExpression())
            throw new Error("Cannot eliminate a non-root existential quantifier");

        if (!this._isProposition(existentialToEliminate) || !this._isProven(existentialToEliminate))
            throw new Error("Cannot eliminate a non-proven existential quantifier");

        if (this.isNotAvailableKnownObject(newIdentifier))
            throw new Error("Cannot eliminate an existential quantifier with a known object");

        if (!this._isStandAloneValue(newIdentifier))
            throw new Error("Cannot eliminate an existential quantifier with a non-root identifier");

        const currentProof = this._forceCurrentOngoingProof();

        if (currentProof.owns(newIdentifier)) currentProof.removeBinding(newIdentifier);
        const provenProposition = existentialToEliminate.applyTo(newIdentifier) as Proposition;
        const newProof = new ExistsElimination(provenProposition, newIdentifier, existentialToEliminate);
        this._registerProof(newProof);
        return newProof;
    }

    private _forceCurrentOngoingProof(): Context {
        let currentProof = this._currentOngoingProof();
        if (currentProof !== undefined) return currentProof;

        this.startNewProof();
        return this._currentOngoingProof()!;
    }

    startNewProof() {
        this._currentProofs.push(new Context());
    }

    nameTerm(identifier: Identifier, term: Expression) {
        if (!this._isStandAloneValue(term))
            throw new Error("Cannot name a non-root or non-value expression");

        if (!this._isStandAloneValue(identifier))
            throw new Error("Cannot use a non-root identifier as name");

        if (this._containsUnknownFreeVariables(term))
            throw new Error("Cannot name an expression with unknown free variables");

        const newProof = new TermNaming(
            equality(identifier.copy(), term) as Equality & Proposition,
            identifier
        );
        this._forceCurrentOngoingProof();
        this._registerProof(newProof);
        return newProof;
    }

    private _containsUnknownFreeVariables(expression: Expression) {
        return ![...expression.freeVariables()].every(freeVariable => this.isKnownObject(freeVariable));
    }

    introduceExists(identifier: Identifier, expression: Expression<Truth>) {
        if (!this._isProven(expression))
            throw new Error("Cannot introduce an existential of a non-proven expression");

        if (!expression.freeVariablesContain(identifier))
            throw new Error("Cannot introduce an existential of a non-free variable");

        const newProof = new ExistsIntroduction(
            exists(identifier.copy(), expression.copy()) as Exists & Proposition,
            expression
        );
        this._registerProof(newProof);
        return newProof;
    }

    candidatesForExistentialQuantificationOf(identifier: Identifier) {
        return this._provenExpressions()
            .filter(expression => expression.freeVariablesContain(identifier));
    }
}

export class Context {
    private readonly _ownBoundVariables: (Identifier & StandAlone)[];
    private readonly _extraBoundVariables: (Identifier & StandAlone)[] = [];
    private readonly _steps: Proof[] = [];

    constructor(ownBoundVariables: (Identifier & StandAlone)[] = []) {
        this._ownBoundVariables = ownBoundVariables;
    }

    objectsInContext(): Identifier[] {
        return [...this._ownBoundVariables, ...this._extraBoundVariables];
    }

    ownBoundVariables() {
        return [...this._ownBoundVariables];
    }

    registerStep(newProof: Proof) {
        if (newProof instanceof NewBinding) {
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

    private _buildProvenProposition(lastStepProvenProposition: Proposition, boundVariables = this._ownBoundVariables): Proposition {
        if (boundVariables.length === 0) return lastStepProvenProposition.copy();

        const [boundVariable, ...restOfBoundVariables] = boundVariables;
        if (lastStepProvenProposition.freeVariablesContain(boundVariable)) {
            return forall(
                boundVariable.copy(),
                this._buildProvenProposition(lastStepProvenProposition, restOfBoundVariables)
            ) as Expression<Truth> as Proposition;
        } else {
            return this._buildProvenProposition(lastStepProvenProposition, restOfBoundVariables);
        }
    }

    numberOfSteps() {
        return this._steps.length;
    }

    addBoundVariables(newBoundVariables: (Identifier & StandAlone)[]) {
        this._ownBoundVariables.push(...newBoundVariables);
    }

    ownsUnused(variable: Identifier) {
        const foundOwnVariable = this._ownVariableEqualTo(variable);
        if (foundOwnVariable === undefined) return false;

        return !this._steps
            .some(step => step.provenProposition.freeVariablesContain(variable));
    }

    owns(variable: Identifier) {
        return this._ownVariableEqualTo(variable) !== undefined;
    }

    private _ownVariableEqualTo(variable: Identifier) {
        return this._ownBoundVariables.find(v => v.equals(variable));
    }

    removeBinding(variable: Identifier) {
        removeElementFrom(
            this._ownVariableEqualTo(variable),
            this._ownBoundVariables
        );
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

export abstract class NewBinding extends DirectProof {
    public readonly newBoundVariable: Identifier & StandAlone;

    protected constructor(
        provenProposition: Proposition,
        newBoundVariable: Identifier & StandAlone
    ) {
        super(provenProposition);
        this.newBoundVariable = newBoundVariable;
    }
}

export class TermNaming extends NewBinding {
    constructor(
        provenProposition: Proposition & Equality,
        newBoundVariable: Identifier & StandAlone
    ) {
        super(provenProposition, newBoundVariable);
    }

    referencedPropositions(): Proposition[] {
        return [];
    }
}

export class ExistsElimination extends NewBinding {
    constructor(
        provenProposition: Proposition,
        newBoundVariable: Identifier & StandAlone,
        public readonly eliminatedExistential: Expression<typeof truthType> & StandAlone & Exists,
    ) {
        super(provenProposition, newBoundVariable);
    }

    referencedPropositions(): Proposition[] {
        return [this.eliminatedExistential];
    }
}

export class ExistsIntroduction extends DirectProof {
    constructor(
        provenProposition: Proposition & Exists,
        public readonly eliminatedProposition: Expression<typeof truthType> & StandAlone,
    ) {
        super(provenProposition);
    }

    referencedPropositions(): Proposition[] {
        return [this.eliminatedProposition];
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

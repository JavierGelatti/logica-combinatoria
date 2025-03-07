import {Expression, ExpressionType, Truth, truthType, Value} from "./expression.ts";
import {Identifier} from "./identifier.ts";
import {CompoundExpression} from "./compoundExpression.ts";
import {unificationFailure, UnificationResult} from "../unificationResult.ts";

export abstract class Binder extends CompoundExpression<Truth> {
    protected _type: Truth = truthType;

    private _boundVariable: Identifier;
    private _body: Expression<Truth>;

    private readonly _species: { new(boundVariable: Identifier, expression: Expression<Truth>): Binder };

    protected constructor(
        boundVariable: Identifier,
        body: Expression<Truth>,
        species: { new(boundVariable: Identifier, expression: Expression<Truth>): Binder },
    ) {
        super(boundVariable, body);
        this._species = species;
        this._body = body;
        this._boundVariable = boundVariable;
    }

    get boundVariable() {
        return this._boundVariable
    }

    get body() {
        return this._body
    }

    protected _equals(anotherObject: this): boolean {
        const boundIdentifier = new Identifier(Symbol());
        return anotherObject.applyTo(boundIdentifier).equals(this.applyTo(boundIdentifier));
    }

    applyTo(boundVariableValue: Expression<Value>) {
        return this._body.substitute(this._boundVariable, boundVariableValue);
    }

    public substitute(subExpressionToSubstitute: Expression<Value>, newExpression: Expression<Value>): Expression<Truth> {
        if (subExpressionToSubstitute.equals(this._boundVariable)) return this.copy();

        if (newExpression.freeVariablesContain(this._boundVariable)) {
            const newBoundVariable = this._boundVariable.withIncrementedSubscript()
            return new this._species(
                newBoundVariable,
                this._body.substitute(this._boundVariable, newBoundVariable),
            ).substitute(subExpressionToSubstitute, newExpression);
        }

        return new this._species(
            this._boundVariable.copy(),
            this._body.substitute(subExpressionToSubstitute, newExpression),
        );
    }

    declarationOf(variable: Identifier): Binder | undefined {
        if (this._boundVariable.equals(variable)) return this;

        return super.declarationOf(variable);
    }

    protected _unifyWith(anotherExpression: this): UnificationResult {
        return this.equals(anotherExpression) ? this.successfulUnification() : unificationFailure();
    }

    copy() {
        return new this._species(this._boundVariable.copy(), this._body.copy()) as this;
    }

    protected _replaceDirectChild<S extends ExpressionType>(childToReplace: Expression<S>, replacement: Expression<S>): void {
        if (this._body === childToReplace) {
            this._body = replacement as Expression<Truth>;
        }
    }

    renameVariableTo(newName: Identifier) {
        if (this.hasLocallyUnbound(newName)) {
            throw new Error(`Cannot rename: ${newName} is free in the expression`);
        }

        const newBody = this.applyTo(newName);
        if (this.isRootExpression()) {
            this._boundVariable = newName.copy();
            this._body = newBody;
            this._setSubexpressions([this._boundVariable, this._body]);

            return this;
        } else {
            return new this._species(
                newName.copy(),
                newBody
            );
        }
    }

    public hasLocallyUnbound(newName: Identifier) {
        // If this returns true, the variable is either (globally) free, or it's bound outside of this expression.
        return this.copy().freeVariablesContain(newName);
    }

    protected _replaceChild<S extends ExpressionType>(subExpressionToReplace: Expression<S>, newExpression: Expression<S>): Expression<Truth> {
        return new this._species(
            this.boundVariable.copy(),
            this.body.replace(subExpressionToReplace, newExpression)
        );
    }

    allOccurrencesOf(lookedUpIdentifier: Identifier): Set<Identifier> {
        if (lookedUpIdentifier.equals(this._boundVariable)) {
            return new Set();
        }
        return super.allOccurrencesOf(lookedUpIdentifier);
    }

    allOccurrencesOfBoundVariable(): Set<Identifier> {
        return this.boundVariable.allOccurrences();
    }

    rewriteWith(bindings: Map<Identifier, Expression>): Expression<Truth> {
        const withRewrittenBody = new this._species(
            this.boundVariable.copy(),
            this.body.rewriteWith(bindings)
        );
        const replacement = bindings.get(this.boundVariable);
        if (replacement === undefined) return withRewrittenBody;

        return withRewrittenBody.applyTo(replacement);
    }
}

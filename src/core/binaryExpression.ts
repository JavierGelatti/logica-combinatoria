import {Expression, ExpressionType, Truth, Value} from "./expression.ts";
import {CompoundExpression} from "./compoundExpression.ts";
import {UnificationResult} from "./unificationResult.ts";

export abstract class BinaryExpression<I extends ExpressionType, O extends ExpressionType> extends CompoundExpression<O> {
    private _left: Expression<I>;
    private _right: Expression<I>;

    private readonly _species: { new(left: Expression<I>, right: Expression<I>): BinaryExpression<I, O> };

    protected constructor(
        left: Expression<I>,
        right: Expression<I>,
        species: { new(left: Expression<I>, right: Expression<I>): BinaryExpression<I, O> },
    ) {
        super(left, right);
        this._species = species;
        this._left = left;
        this._right = right;
    }

    get left() {
        return this._left;
    }

    get right() {
        return this._right;
    }

    protected _equals(anotherObject: this): boolean {
        return anotherObject._left.equals(this._left) &&
            anotherObject._right.equals(this._right);
    }

    public substitute(subExpressionToSubstitute: Expression<Value>, newExpression: Expression<Value>): Expression<O> {
        return new this._species(
            this._left.substitute(subExpressionToSubstitute, newExpression),
            this._right.substitute(subExpressionToSubstitute, newExpression),
        );
    }

    protected _replaceChild<S extends ExpressionType>(subExpressionToReplace: Expression<S>, newExpression: Expression<S>): Expression<O> {
        return new this._species(
            this._left.replace(subExpressionToReplace, newExpression),
            this._right.replace(subExpressionToReplace, newExpression),
        );
    }

    protected _unifyWith(anotherExpression: this): UnificationResult {
        const leftUnification = this._left.unifyWith(anotherExpression._left);
        const rightUnification = this._right.unifyWith(anotherExpression._right);
        return leftUnification.combinedWith(rightUnification);
    }

    copy() {
        return new this._species(this._left.copy(), this._right.copy()) as this;
    }

    protected _replaceDirectChild<S extends ExpressionType>(childToReplace: Expression<S>, replacement: Expression<S>): void {
        // @ts-expect-error
        if (childToReplace === this._left) {
            this._left = replacement as unknown as Expression<I>;
            return;
        }

        // @ts-expect-error
        if (childToReplace === this._right) {
            this._right = replacement as unknown as Expression<I>;
            return;
        }
    }
}
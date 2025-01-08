import {Expression} from "./expression.ts";
import {CompoundExpression} from "./compoundExpression.ts";
import {UnificationResult} from "./unificationResult.ts";

export class BinaryExpression extends CompoundExpression {
    private _left: Expression;
    private _right: Expression;

    private readonly _species: { new(left: Expression, right: Expression): BinaryExpression };

    constructor(
        left: Expression,
        right: Expression,
        species: { new(left: Expression, right: Expression): BinaryExpression },
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

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
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

    protected _replaceDirectChild(childToReplace: Expression, replacement: Expression): void {
        if (childToReplace === this._left) {
            this._left = replacement;
        } else if (childToReplace === this._right) {
            this._right = replacement;
        }
    }
}
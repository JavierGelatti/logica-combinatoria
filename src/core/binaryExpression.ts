import {Expression} from "./expression.ts";
import {CompoundExpression} from "./compoundExpression.ts";
import {UnificationResult} from "./unificationResult.ts";

export class BinaryExpression extends CompoundExpression {
    constructor(
        readonly left: Expression,
        readonly right: Expression,
        private readonly species: { new(left: Expression, right: Expression): BinaryExpression },
    ) {
        super(left, right);
    }

    protected _equals(anotherObject: this): boolean {
        return anotherObject.left.equals(this.left) &&
            anotherObject.right.equals(this.right);
    }

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
        return new this.species(
            this.left.replace(subExpressionToReplace, newExpression),
            this.right.replace(subExpressionToReplace, newExpression),
        );
    }

    protected _unifyWith(anotherExpression: this): UnificationResult {
        const leftUnification = this.left.unifyWith(anotherExpression.left);
        const rightUnification = this.right.unifyWith(anotherExpression.right);
        return leftUnification.combinedWith(rightUnification);
    }

    copy() {
        return new this.species(this.left.copy(), this.right.copy()) as this;
    }
}
import {Expression, ExpressionType, Value} from "./expression.ts";

export abstract class AtomicExpression<T extends ExpressionType> extends Expression<T> {
    substitute(subExpressionToSubstitute: Expression<Value>, newExpression: Expression<Value>): Expression<T> {
        if (subExpressionToSubstitute.equals(this)) {
            return newExpression.copy() as Expression<T>;
        } else {
            return this.copy();
        }
    }

    protected _contains(_anExpression: Expression): boolean {
        return false;
    }

    allSubExpressions(): Expression[] {
        return [this];
    }

    protected _replaceChild<S extends ExpressionType>(_subExpressionToReplace: Expression<S>, _newExpression: Expression<S>): Expression<T> {
        return this.copy();
    }
}
import {Expression, ExpressionType, Value} from "./expression.ts";

export abstract class AtomicExpression<T extends ExpressionType> extends Expression<T> {
    replace(subExpressionToReplace: Expression<Value>, newExpression: Expression<Value>): Expression<T> {
        if (subExpressionToReplace.equals(this)) {
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
}
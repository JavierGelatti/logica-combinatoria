import {describe, expect, test} from "vitest";
import {equality, forall, identifier} from "../../src/core/expression_constructors.ts";
import {Expression} from "../../src/core/expression.ts";

describe("all subexpressions", () => {
    test("all subexpressions of an atomic expression returns itself", () => {
        const anExpression: Expression = identifier("x");

        expect(anExpression.allSubExpressions()).toEqual([anExpression]);
    });

    test("all subexpressions of a compound expression returns itself with all its subexpressions", () => {
        let s0!: Expression, s1!: Expression, s2!: Expression, s3!: Expression;
        const anExpression: Expression = forall(
            s0 = identifier("x"),
            s1 = equality(
                s2 = identifier("x"),
                s3 = identifier("y")
            )
        );

        expect(anExpression.allSubExpressions()).toEqual([anExpression, s0, s1, s2, s3]);
    });
});

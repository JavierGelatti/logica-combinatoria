import {describe, expect, test} from "vitest";
import {equality, forall, identifier} from "../../../src/core/expressions/expression_constructors.ts";
import {Expression} from "../../../src/core/expressions/expression.ts";

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

describe("containment", () => {
    test("an expression contains itself", () => {
        const anExpression: Expression = identifier("x");

        expect(anExpression.contains(anExpression)).toBe(true);
    });

    test("two unrelated expressions don't contain each other", () => {
        const anExpression: Expression = identifier("x");
        const anotherExpression: Expression = identifier("y");

        expect(anExpression.contains(anotherExpression)).toBe(false);
    });

    test("an expression contains another if it's one of its parents", () => {
        let containedExpression!: Expression;
        const anExpression: Expression = forall(identifier("x"),
            equality(containedExpression = identifier("x"), identifier("y"))
        );

        expect(anExpression.contains(containedExpression)).toBe(true);
        expect(containedExpression.contains(anExpression)).toBe(false);
    });
});

describe("root expression", () => {
    test("of a root expression is itself", () => {
        const anExpression: Expression = identifier("x");

        expect(anExpression.isRootExpression()).toBe(true);
        expect(anExpression.rootExpression()).toBe(anExpression);
    });

    test("of a subexpression is its top-level expression", () => {
        let aSubexpression!: Expression;
        const anExpression: Expression = forall(
            identifier("x"),
            equality(
                identifier("x"),
                aSubexpression = identifier("y")
            )
        );

        expect(aSubexpression.isRootExpression()).toBe(false);
        expect(aSubexpression.rootExpression()).toBe(anExpression);
    });
});

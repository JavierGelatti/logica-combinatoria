import {describe, expect, test} from "vitest";
import {application, equality, exists, forall, hole, identifier} from "../../src/core/expressions/expression_constructors.ts";
import {Expression} from "../../src/core/expressions/expression.ts";

describe("string representation of expressions", () => {
    test("a complex example", () => {
        const anExpression: Expression = forall(
            identifier("x"),
            exists(
                identifier("x", 1),
                equality(
                    application(identifier("x"), identifier("x", 1)),
                    application(
                        application(hole(), identifier("x")),
                        application(identifier("x", 1), identifier("y"))
                    )
                )
            )
        );

        expect(anExpression.toString())
            .toEqual("(∀x) (∃x_1) x x_1 = (_ x) (x_1 y)");
    });
});
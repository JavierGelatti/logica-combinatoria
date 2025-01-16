import {describe, expect, test} from "vitest";
import {application, equality, forall, hole, identifier} from "../../src/core/expressions/expression_constructors.ts";
import {FormalSystem} from "../../src/core/formalSystem.ts";
import {Expression} from "../../src/core/expressions/expression.ts";

describe("a formal system", () => {
    test("starts with no axioms and no well-known objects", () => {
        const system = new FormalSystem();

        expect(system.axioms()).toEqual([]);
        expect(system.wellKnownObjects()).toEqual([]);
    });

    test("complete truth-expressions can be added as axioms", () => {
        const system = new FormalSystem();
        const expression = equality(identifier("M"), identifier("X"));

        system.addAxiom(expression);

        expect(system.axioms()).toEqual([expression]);
    });

    test("incomplete expressions cannot be added as axioms", () => {
        const system = new FormalSystem();
        const expression = equality(identifier("M"), hole());

        expect(() => system.addAxiom(expression))
            .toThrowError("An expression with holes cannot be added as an axiom");
    });

    test("non-root expressions cannot be added as axioms", () => {
        const system = new FormalSystem();
        let subexpression!: Expression;
        equality(subexpression = identifier("M"), identifier("X"));

        expect(() => system.addAxiom(subexpression))
            .toThrowError("A non-root expression cannot be added as an axiom");
    });

    test("the free variables in the axioms determine the well-known objects", () => {
        const system = new FormalSystem();
        const expression = forall(
            identifier("x"),
            equality(
                application(identifier("M"), identifier("x")),
                application(identifier("x"), identifier("w"))
            )
        );

        system.addAxiom(expression);

        expect(system.wellKnownObjects()).toEqual([identifier("M"), identifier("w")])
        expect(system.isWellKnownFreeVariable(identifier("M"))).toBe(true);
        expect(system.isWellKnownFreeVariable(identifier("x"))).toBe(false);
    });
});
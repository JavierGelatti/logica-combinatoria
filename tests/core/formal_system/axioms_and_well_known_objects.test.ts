import {describe, expect, test} from "vitest";
import {
    application,
    equality,
    forall,
    hole,
    identifier,
} from "../../../src/core/expressions/expression_constructors.ts";
import {FormalSystem} from "../../../src/core/formalSystem.ts";
import {Expression} from "../../../src/core/expressions/expression.ts";

describe("axioms and well-known objects", () => {
    test("starts with no axioms, no well-known objects, and no theorems", () => {
        const system = new FormalSystem();

        expect(system.axioms()).toEqual([]);
        expect(system.theorems()).toEqual([]);
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
            .toThrowError("A non-stand-alone expression cannot be added as an axiom");
    });

    test("non-root expressions cannot be added as axioms", () => {
        const system = new FormalSystem();
        let subexpression!: Expression;
        equality(subexpression = identifier("M"), identifier("X"));

        expect(() => system.addAxiom(subexpression))
            .toThrowError("A non-stand-alone expression cannot be added as an axiom");
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


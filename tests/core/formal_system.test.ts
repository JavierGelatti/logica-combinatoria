import {describe, expect, test} from "vitest";
import {
    application,
    equality,
    exists,
    forall,
    hole,
    identifier,
} from "../../src/core/expressions/expression_constructors.ts";
import {FormalSystem} from "../../src/core/formalSystem.ts";
import {Expression} from "../../src/core/expressions/expression.ts";
import {ForAll} from "../../src/core/expressions/forAll.ts";

describe("a formal system", () => {
    describe("axioms and well-known objects", () => {
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

    describe("determination of universal quantifiers candidate for elimination", () => {
        test("the system can determine which universal quantifiers in the axioms can be applied to an expression", () => {
            const system = new FormalSystem();
            const axiom1 = forall(
                identifier("x"),
                equality(identifier("A"), identifier("x"))
            );
            const axiom2 = exists(
                identifier("x"),
                equality(identifier("A"), identifier("x"))
            );
            system.addAxiom(axiom1);
            system.addAxiom(axiom2);

            expect(system.universalQuantifiersThatCanBeAppliedTo(identifier("A")))
                .toEqual([axiom1]);
        });

        test("if replacing the bound variable by the argument leaves free variables that don't correspond to well-known objects, the quantifier is not offered for replacement", () => {
            const system = new FormalSystem();
            const axiom1 = forall(
                identifier("x"),
                equality(identifier("A"), identifier("x"))
            );
            system.addAxiom(axiom1);

            expect(system.universalQuantifiersThatCanBeAppliedTo(identifier("w")))
                .toEqual([]);
        });

        test("if replacing the bound variable by the argument doesn't leave free non-well-known objects but the free variable is bound to another object, the quantifier is not offered", () => {
            const system = new FormalSystem();
            const axiom1 = forall(identifier("x"),
                exists(identifier("w"),
                    equality(identifier("A"), identifier("x"))
                )
            );
            system.addAxiom(axiom1);

            expect(system.universalQuantifiersThatCanBeAppliedTo(identifier("w")))
                .toEqual([]);
        });

        test("finds universal quantifiers that are subexpressions", () => {
            const system = new FormalSystem();
            let universalQuantifier!: ForAll;
            const axiom1 = exists(identifier("w"),
                universalQuantifier = forall(identifier("x"),
                    equality(identifier("A"), identifier("x"))
                )
            );
            system.addAxiom(axiom1);

            expect(system.universalQuantifiersThatCanBeAppliedTo(identifier("A")))
                .toEqual([universalQuantifier]);
        });

        test("if replacing the bound variable by the argument doesn't leave free non-well-known objects and the argument's free variables are bound in the context of the quantifier, the quantifier is offered", () => {
            const system = new FormalSystem();
            let universalQuantifier!: ForAll;
            const axiom1 = exists(identifier("w"),
                universalQuantifier = forall(identifier("x"),
                    equality(identifier("A"), identifier("x"))
                )
            );
            system.addAxiom(axiom1);

            expect(system.universalQuantifiersThatCanBeAppliedTo(identifier("w")))
                .toEqual([universalQuantifier]);
        });

        test("compound expressions can be used as arguments", () => {
            const system = new FormalSystem();
            let universalQuantifier!: ForAll;
            const axiom1 = exists(identifier("w"),
                universalQuantifier = forall(identifier("x"),
                    equality(identifier("A"), identifier("x"))
                )
            );
            system.addAxiom(axiom1);

            expect(system.universalQuantifiersThatCanBeAppliedTo(application(identifier("w"), identifier("A"))))
                .toEqual([universalQuantifier]);
            expect(system.universalQuantifiersThatCanBeAppliedTo(application(identifier("A"), identifier("x"))))
                .toEqual([]);
        });

        test("cannot use non-root expressions as arguments", () => {
            const system = new FormalSystem();
            const axiom1 = forall(
                identifier("x"),
                equality(identifier("A"), identifier("x"))
            );
            system.addAxiom(axiom1);
            let subexpression!: Expression;
            application(subexpression = identifier("A"), identifier("x"));

            expect(system.universalQuantifiersThatCanBeAppliedTo(subexpression))
                .toEqual([]);
        });

        test("cannot use incomplete expressions as arguments", () => {
            const system = new FormalSystem();
            const axiom1 = forall(
                identifier("x"),
                equality(identifier("A"), identifier("x"))
            );
            system.addAxiom(axiom1);

            expect(system.universalQuantifiersThatCanBeAppliedTo(hole()))
                .toEqual([]);
        });

        test("cannot use non-value expressions as arguments", () => {
            const system = new FormalSystem();
            const axiom1 = forall(
                identifier("x"),
                equality(identifier("A"), identifier("x"))
            );
            system.addAxiom(axiom1);
            const truthExpression: Expression = axiom1.copy();

            expect(system.universalQuantifiersThatCanBeAppliedTo(truthExpression))
                .toEqual([]);
        });
    });
});
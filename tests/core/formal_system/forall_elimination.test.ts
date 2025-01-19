import {describe, expect, test} from "vitest";
import {
    application,
    equality,
    exists,
    forall,
    hole,
    identifier,
} from "../../../src/core/expressions/expression_constructors.ts";
import {FormalSystem} from "../../../src/core/formalSystem.ts";
import {Expression, Truth} from "../../../src/core/expressions/expression.ts";
import {ForAll} from "../../../src/core/expressions/forAll.ts";

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

    test("finds universal quantifiers in theorems", () => {
        const system = new FormalSystem();
        const axiom1 = forall(identifier("w"),
            forall(identifier("x"),
                equality(identifier("A"), identifier("w"))
            )
        );
        system.addAxiom(axiom1);
        const newProof = system.eliminateForAll(axiom1, identifier("A"));

        expect(system.universalQuantifiersThatCanBeAppliedTo(identifier("A")))
            .toContain(newProof.provenProposition);
    });

    describe("interaction with known-objects (to avoid confusion)", () => {
        test("if the argument is not a known object, it can be used even if it'll become bound after the application", () => {
            const system = new FormalSystem();
            let innerForAll!: ForAll;
            const axiom1 = forall(identifier("A"),
                innerForAll = forall(identifier("x"),
                    equality(identifier("A"), identifier("x"))
                )
            );
            system.addAxiom(axiom1);

            expect(system.universalQuantifiersThatCanBeAppliedTo(identifier("A")))
                .toEqual([innerForAll]);
        });

        test("if the argument is equal to a known object, it cannot be used if it'll become bound after the application", () => {
            const system = new FormalSystem();
            const axiom1 = forall(identifier("A"),
                forall(identifier("x"),
                    equality(identifier("A"), identifier("x"))
                )
            );
            const axiom2 = equality(identifier("A"), identifier("A"));
            system.addAxiom(axiom1);
            system.addAxiom(axiom2);

            expect(system.universalQuantifiersThatCanBeAppliedTo(identifier("A")))
                .toEqual([axiom1]);
        });
    });
});

describe("elimination of universal quantifiers", () => {
    test("cannot apply an universal quantifier to a non-stand-alone value", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);

        expect(() => system.eliminateForAll(axiom1, hole()))
            .toThrowError("Cannot apply a forall to a non-stand-alone value");
    });

    test("can apply an universal quantifier that is an axiom", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);

        system.eliminateForAll(axiom1, identifier("A"));

        expect(system.theorems()).toEqual([
            equality(identifier("A"), identifier("A"))
        ]);
    });

    test("cannot apply an universal quantifier that is not an axiom", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        const nonAxiom = axiom1.copy();
        system.addAxiom(axiom1);

        expect(() => system.eliminateForAll(nonAxiom, identifier("A")))
            .toThrowError("Cannot eliminate a non-proved universal quantifier");
    });

    test("can apply an universal quantifier that is a subexpression of an axiom", () => {
        const system = new FormalSystem();
        let universalQuantifier!: ForAll;
        const axiom1 = exists(identifier("w"),
            universalQuantifier = forall(identifier("x"),
                equality(identifier("A"), identifier("x"))
            )
        );
        system.addAxiom(axiom1);

        const newProof = system.eliminateForAll(universalQuantifier, identifier("A"));

        expect(newProof.referencedPropositions()).toEqual([axiom1]);
        expect(newProof.eliminatedForAll).toEqual(universalQuantifier);
        expect(newProof.argument).toEqual(identifier("A"));
        expect(newProof.provenProposition).toEqual(exists(identifier("w"), equality(identifier("A"), identifier("A"))));
        expect(system.theorems()).toEqual([newProof.provenProposition]);
    });

    test("can apply an universal quantifier from a theorem", () => {
        const system = new FormalSystem();
        const axiom1 = forall(identifier("w"),
            forall(identifier("x"),
                equality(identifier("A"), identifier("w"))
            )
        );
        system.addAxiom(axiom1);
        const newTheorem: Expression<Truth> = system.eliminateForAll(axiom1, identifier("A")).provenProposition;

        system.eliminateForAll(newTheorem as ForAll, identifier("A"));

        expect(system.theorems()).toEqual([
            forall(identifier("x"),
                equality(identifier("A"), identifier("A"))
            ),
            equality(identifier("A"), identifier("A"))
        ]);
    });

    test("cannot apply an universal quantifier that would leave unknown free variables", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);

        expect(() => system.eliminateForAll(axiom1, identifier("W")))
            .toThrowError("Cannot apply a forall if it'd leave new unknown free variables");
    });
});


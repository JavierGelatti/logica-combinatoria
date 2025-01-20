import {describe, expect, test} from "vitest";
import {
    application,
    equality,
    exists,
    forall,
    identifier,
} from "../../../src/core/expressions/expression_constructors.ts";
import {FormalSystem} from "../../../src/core/formalSystem.ts";
import {Exists} from "../../../src/core/expressions/exists.ts";
import {Identifier} from "../../../src/core/expressions/identifier.ts";

describe("determination of existential quantifiers candidate for elimination", () => {
    test("the candidate existential quantifiers are all of the root existential quantifiers", () => {
        const system = new FormalSystem();
        const axiom1 = forall(identifier("x"),
            exists(identifier("y"),
                equality(identifier("x"), identifier("y"))
            )
        );
        const axiom2 = exists(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);
        system.addAxiom(axiom2);

        expect(system.existentialQuantifiersThatCanBeReplacedWith(identifier("W")))
            .toEqual([axiom2]);
    });

    test("there are no existential quantifiers that can be replaced with known objects", () => {
        const system = new FormalSystem();
        const axiom1 = forall(identifier("x"),
            exists(identifier("y"),
                equality(identifier("x"), identifier("y"))
            )
        );
        const axiom2 = exists(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);
        system.addAxiom(axiom2);

        expect(system.existentialQuantifiersThatCanBeReplacedWith(identifier("A")))
            .toEqual([]);
    });
});

describe("elimination of existential quantifiers", () => {
    test("cannot eliminate a non-root existential quantifier", () => {
        const system = new FormalSystem();
        let nonRootExistential!: Exists;
        const axiom1 = forall(identifier("x"),
            nonRootExistential = exists(identifier("y"),
                equality(identifier("x"), identifier("y"))
            )
        );
        system.addAxiom(axiom1);

        expect(() => system.eliminateExists(nonRootExistential, identifier("W")))
            .toThrowError("Cannot eliminate a non-root existential quantifier");
    });

    test("cannot eliminate an existential quantifier with a known object", () => {
        const system = new FormalSystem();
        const axiom1 = exists(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);

        expect(() => system.eliminateExists(axiom1, identifier("A")))
            .toThrowError("Cannot eliminate an existential quantifier with a known object");
    });

    test("cannot eliminate an existential quantifier with a non-standalone identifier", () => {
        const system = new FormalSystem();
        const axiom1 = exists(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);
        let subexpressionIdentifier!: Identifier;
        application(subexpressionIdentifier = identifier("B"), identifier("C"));

        expect(() => system.eliminateExists(axiom1, subexpressionIdentifier))
            .toThrowError("Cannot eliminate an existential quantifier with a non-root identifier");
    });

    test("cannot eliminate a non-proven existential quantifier", () => {
        const system = new FormalSystem();
        const nonProvenProposition = exists(
            identifier("x"),
            equality(identifier("x"), identifier("x"))
        );

        expect(() => system.eliminateExists(nonProvenProposition, identifier("A")))
            .toThrowError("Cannot eliminate a non-proven existential quantifier");
    });

    test("when an existential quantifier is eliminated during a proof, a new binding is added", () => {
        const system = new FormalSystem();
        const axiom1 = exists(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);
        system.startForAllIntroduction(identifier("B"))
        const newProof = system.eliminateExists(axiom1, identifier("W"));

        expect(newProof.newBoundVariable).toEqual(identifier("W"));
        expect(newProof.eliminatedExistential).toEqual(axiom1);
        expect(newProof.provenProposition).toEqual(equality(identifier("A"), identifier("W")));
        expect(system.objectsInContext()).toContainEqual(identifier("W"));
        expect(system.theorems()).toEqual([]);
    });

    test("cannot finish the current proof if the existential binding is present on the proposition to prove", () => {
        const system = new FormalSystem();
        const axiom1 = exists(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);
        system.startForAllIntroduction(identifier("B"))
        system.eliminateExists(axiom1, identifier("W"));

        expect(() => system.finishCurrentProof())
            .toThrowError("Cannot finish proof with free variables");
    });
});


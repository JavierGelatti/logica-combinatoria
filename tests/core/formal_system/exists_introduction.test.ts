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

describe("introduction of existential quantifiers", () => {
    test("cannot introduce an existential quantifier of a non-proven expression", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);
        const nonProvenExpression = equality(identifier("A"), identifier("A"));

        expect(() => system.introduceExists(identifier("A"), nonProvenExpression))
            .toThrowError("Cannot introduce an existential of a non-proven expression");
    });

    test("cannot introduce an existential quantifier of a non-free variable", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);

        expect(() => system.introduceExists(identifier("B"), axiom1))
            .toThrowError("Cannot introduce an existential of a non-free variable");
    });

    test("can introduce an existential quantifier of a free variable of a proven expression", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("A"), identifier("x"))
        );
        system.addAxiom(axiom1);

        const proof = system.introduceExists(identifier("A"), axiom1);

        expect(proof.referencedPropositions()).toEqual([axiom1]);
        expect(proof.eliminatedProposition).toEqual(axiom1);
        expect(proof.provenProposition)
            .toEqual(exists(identifier("A"), forall(identifier("x"), equality(identifier("A"), identifier("x")))));
        expect(system.theorems()).toContain(proof.provenProposition);
    });
});

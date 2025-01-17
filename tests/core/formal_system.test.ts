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
            const newTheorem = system.eliminateForAll(axiom1, identifier("A"));

            expect(system.universalQuantifiersThatCanBeAppliedTo(identifier("A")))
                .toContain(newTheorem);
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

            system.eliminateForAll(universalQuantifier, identifier("A"));

            expect(system.theorems()).toEqual([
                exists(identifier("w"),
                    equality(identifier("A"), identifier("A"))
                )
            ]);
        });

        test("can apply an universal quantifier from a theorem", () => {
            const system = new FormalSystem();
            const axiom1 = forall(identifier("w"),
                forall(identifier("x"),
                    equality(identifier("A"), identifier("w"))
                )
            );
            system.addAxiom(axiom1);
            const newTheorem = system.eliminateForAll(axiom1, identifier("A")) as ForAll;

            system.eliminateForAll(newTheorem, identifier("A"));

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

    describe("determination of rewrite candidates", () => {
        test("the same expression cannot be used to rewrite itself", () => {
            const system = new FormalSystem();
            let term!: Expression;
            system.addAxiom(forall(
                identifier("x"),
                equality(term = identifier("x"), identifier("A"))
            ));

            const rewriteCandidates = system.rewriteCandidatesMatching(term);

            expect(rewriteCandidates).toEqual([]);
        });

        test("can find exact matches in axioms", () => {
            const system = new FormalSystem();
            let term!: Expression;
            system.addAxiom(equality(term = identifier("A"), identifier("B")));
            let exactMatch!: Expression;
            system.addAxiom(equality(
                exactMatch = identifier("A"),
                identifier("C")
            ));

            const rewriteCandidates = system.rewriteCandidatesMatching(term);

            expect(rewriteCandidates).toEqual([exactMatch]);
        });

        test("can find non-exact matches in axioms", () => {
            const system = new FormalSystem();
            let term!: Expression;
            system.addAxiom(forall(
                identifier("x"),
                equality(term = identifier("x"), identifier("A"))
            ));
            let nonExactMatch1!: Expression, nonExactMatch2!: Expression;
            system.addAxiom(equality(
                nonExactMatch1 = identifier("A"),
                nonExactMatch2 = identifier("C")
            ));

            const rewriteCandidates = system.rewriteCandidatesMatching(term);

            expect(rewriteCandidates).toEqual([nonExactMatch1, nonExactMatch2]);
        });

        test("can find matches in theorems", () => {
            const system = new FormalSystem();
            const forallAxiom = forall(
                identifier("x"),
                equality(identifier("x"), identifier("A"))
            );
            system.addAxiom(forallAxiom);
            let term!: Expression;
            system.addAxiom(equality(term = identifier("B"), identifier("W")));
            system.eliminateForAll(forallAxiom, identifier("B"));

            const rewriteCandidates = system.rewriteCandidatesMatching(term);

            expect(rewriteCandidates.length).toEqual(1);
            expect(rewriteCandidates[0]!.rootExpression()).toEqual(system.theorems()[0]!);
        });

        test("does not include matches that don't bind all variables on the other side of the equation", () => {
            const system = new FormalSystem();
            let term!: Expression;
            system.addAxiom(forall(
                identifier("x"),
                equality(identifier("x"), term = identifier("A"))
            ));
            system.addAxiom(equality(
                identifier("A"),
                identifier("B")
            ));

            const rewriteCandidates = system.rewriteCandidatesMatching(term);

            expect(rewriteCandidates).toEqual([]);
        });

        test("cannot use an expression to rewrite if it's not an equation member", () => {
            const system = new FormalSystem();
            let term!: Expression;
            system.addAxiom(
                equality(
                    identifier("A"),
                    application(term = identifier("A"), identifier("A"))
                )
            );
            system.addAxiom(equality(identifier("A"), identifier("A")));

            const rewriteCandidates = system.rewriteCandidatesMatching(term);

            expect(rewriteCandidates).toEqual([]);
        });

        test("cannot use an expression to rewrite if it's not part of a proven proposition", () => {
            const system = new FormalSystem();
            let term!: Expression;
            equality(term = identifier("A"), identifier("W"));
            system.addAxiom(equality(identifier("A"), application(identifier("A"), identifier("W"))));

            const rewriteCandidates = system.rewriteCandidatesMatching(term);

            expect(rewriteCandidates).toEqual([]);
        });
    });

    describe("actual rewriting", () => {
        test("cannot use an expression to rewrite if it's not part of a proven proposition", () => {
            const system = new FormalSystem();
            let source!: Expression, target!: Expression;
            equality(source = identifier("A"), identifier("W"));
            system.addAxiom(equality(identifier("A"), application(target = identifier("A"), identifier("W"))));

            expect(() => system.rewrite(source, target))
                .toThrowError("Cannot rewrite using non-proven expressions");
        });

        test("cannot select a rewrite target if it's not part of a proven proposition", () => {
            const system = new FormalSystem();
            let source!: Expression, target!: Expression;
            system.addAxiom(equality(source = identifier("A"), application(identifier("A"), identifier("W"))));
            equality(target = identifier("A"), identifier("W"));

            expect(() => system.rewrite(source, target))
                .toThrowError("Cannot rewrite using non-proven expressions");
        });

        test("the expression used to rewrite must be an equation member", () => {
            const system = new FormalSystem();
            let source!: Expression, target!: Expression;
            system.addAxiom(forall(identifier("x"), equality(identifier("x"), application(source = identifier("A"), identifier("W")))));
            system.addAxiom(equality(target = identifier("A"), application(identifier("A"), identifier("B"))));

            expect(() => system.rewrite(source, target))
                .toThrowError("Must use an equation member to perform a rewrite");
        });

        test("the rewrite target must be a value", () => {
            const system = new FormalSystem();
            let source!: Expression, target!: Expression;
            system.addAxiom(forall(identifier("x"), equality(source = identifier("x"), application(identifier("A"), identifier("W")))));
            system.addAxiom(target = equality(identifier("A"), application(identifier("A"), identifier("B"))));

            expect(() => system.rewrite(source, target))
                .toThrowError("The rewrite target must be a value");
        });

        test("the same expression cannot be used to rewrite itself", () => {
            const system = new FormalSystem();
            let source!: Expression, target!: Expression;
            system.addAxiom(forall(
                identifier("x"),
                equality(source = identifier("x"), target = identifier("A"))
            ));

            expect(() => system.rewrite(source, target))
                .toThrowError("The rewrite target must be part of a different expresison of the source");
        });

        test("cannot rewrite if the target didn't unify with the source", () => {
            const system = new FormalSystem();
            let source!: Expression, target!: Expression;
            system.addAxiom(forall(
                identifier("x"),
                equality(source = identifier("B"), identifier("A"))
            ));
            system.addAxiom(equality(identifier("B"), target = identifier("A")));

            expect(() => system.rewrite(source, target))
                .toThrowError("The rewrite target must fully unify with the source");
        });

        test("can rewrite with the left-hand-side if the expressions unify and fully determine the other side of the equation", () => {
            const system = new FormalSystem();
            let source!: Expression, target!: Expression;
            system.addAxiom(forall(
                identifier("x"),
                equality(source = identifier("x"), identifier("A"))
            ));
            system.addAxiom(equality(target = identifier("B"), identifier("W")));

            const newTheorem = system.rewrite(source, target);
            expect(newTheorem).toEqual(equality(identifier("A"), identifier("W")))
            expect(system.theorems()).toContain(newTheorem);
        });

        test("can rewrite with the right-hand-side if the expressions unify and fully determine the other side of the equation", () => {
            const system = new FormalSystem();
            let source!: Expression, target!: Expression;
            system.addAxiom(forall(
                identifier("x"),
                equality(identifier("A"), source = identifier("x"))
            ));
            system.addAxiom(equality(target = identifier("B"), identifier("W")));

            const newTheorem = system.rewrite(source, target);
            expect(newTheorem).toEqual(equality(identifier("A"), identifier("W")))
            expect(system.theorems()).toContain(newTheorem);
        });
    });
});
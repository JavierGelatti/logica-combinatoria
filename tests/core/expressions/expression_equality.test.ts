import {describe, expect, test} from "vitest";
import {application, equality, exists, forall, identifier} from "../../../src/core/expressions/expression_constructors.ts";

describe("expression equality", () => {
    test("a free variable is only equal to another free variable with the same name", () => {
        const aVariable = identifier("A");
        const anotherVariable = identifier("B");
        const yetAnotherVariable = identifier("A");

        expect(aVariable.equals(aVariable)).toBe(true);
        expect(aVariable.equals(anotherVariable)).toBe(false);
        expect(aVariable.equals(yetAnotherVariable)).toBe(true);
        expect(aVariable.equals("A")).toBe(false);
    });

    test("an application is equal to another if both components are equal", () => {
        const application1 = application(identifier("A"), identifier("B"));
        const application2 = application(identifier("B"), identifier("B"));
        const application3 = application(identifier("A"), identifier("A"));
        const application4 = application(identifier("A"), identifier("B"));

        expect(application1.equals(application1)).toBe(true);
        expect(application1.equals(application2)).toBe(false);
        expect(application1.equals(application3)).toBe(false);
        expect(application1.equals(application4)).toBe(true);
        expect(application1.equals("A")).toBe(false);
    });

    describe("a forall is equal to another if their contents are equal assuming their bound variables are equal", () => {
        test("when the content is an identifier", () => {
            const forall1 = forall(identifier("x"), equality(identifier("x"), identifier("x")));
            const forall2 = forall(identifier("y"), equality(identifier("x"), identifier("x")));
            const forall3 = forall(identifier("y"), equality(identifier("y"), identifier("y")));

            expect(forall1.equals(forall1)).toBe(true);
            expect(forall1.equals(forall2)).toBe(false);
            expect(forall1.equals(forall3)).toBe(true);
        });

        test("when the content is an equality with the bound variable in the right-hand side", () => {
            const forall1 = forall(identifier("x"), equality(identifier("y"), identifier("x")));
            const forall2 = forall(identifier("y"), equality(identifier("y"), identifier("x")));
            const forall3 = forall(identifier("x"), equality(identifier("x"), identifier("x")));
            const forall4 = forall(identifier("z"), equality(identifier("y"), identifier("z")));

            expect(forall1.equals(forall1)).toBe(true);
            expect(forall1.equals(forall2)).toBe(false);
            expect(forall1.equals(forall3)).toBe(false);
            expect(forall1.equals(forall4)).toBe(true);
        });

        test("when the content is an equality with the bound variable in the left-hand side", () => {
            const forall1 = forall(identifier("x"), equality(identifier("x"), identifier("y")));
            const forall2 = forall(identifier("y"), equality(identifier("x"), identifier("y")));
            const forall3 = forall(identifier("x"), equality(identifier("x"), identifier("x")));
            const forall4 = forall(identifier("z"), equality(identifier("z"), identifier("y")));

            expect(forall1.equals(forall1)).toBe(true);
            expect(forall1.equals(forall2)).toBe(false);
            expect(forall1.equals(forall3)).toBe(false);
            expect(forall1.equals(forall4)).toBe(true);
        });

        test("when the content is another forall", () => {
            const forall1 = forall(identifier("x"), forall(identifier("y"), equality(identifier("x"), identifier("y"))));
            const forall2 = forall(identifier("x"), forall(identifier("x"), equality(identifier("x"), identifier("x"))));
            const forall3 = forall(identifier("x"), forall(identifier("y"), equality(identifier("y"), identifier("y"))));
            const forall4 = forall(identifier("y"), forall(identifier("z"), equality(identifier("y"), identifier("z"))));
            const forall5 = forall(identifier("x"), forall(identifier("y"), equality(identifier("x"), identifier("x"))));

            expect(forall1.equals(forall1)).toBe(true);
            expect(forall1.equals(forall2)).toBe(false);
            expect(forall1.equals(forall3)).toBe(false);
            expect(forall1.equals(forall4)).toBe(true);
            expect(forall2.equals(forall5)).toBe(false);
        });
    });

    test("an exists is equal to another if their contents are equal assuming their bound variables are equal", () => {
        const exists1 = exists(identifier("x"), equality(identifier("x"), identifier("x")));
        const exists2 = exists(identifier("y"), equality(identifier("x"), identifier("x")));
        const exists3 = exists(identifier("y"), equality(identifier("y"), identifier("y")));
        const forall1 = forall(identifier("x"), equality(identifier("x"), identifier("x")));

        expect(exists1.equals(exists1)).toBe(true);
        expect(exists1.equals(exists2)).toBe(false);
        expect(exists1.equals(exists3)).toBe(true);
        expect(exists1.equals(forall1)).toBe(false);
    });

    test("an equality is equal to another if their components are equal", () => {
        const equality1 = equality(identifier("x"), identifier("y"));
        const equality2 = equality(identifier("y"), identifier("x"));
        const equality3 = equality(identifier("y"), identifier("y"));
        const equality4 = equality(identifier("x"), identifier("x"));
        const equality5 = equality(identifier("x"), identifier("y"));

        expect(equality1.equals(equality1)).toBe(true);
        expect(equality1.equals(equality2)).toBe(false);
        expect(equality1.equals(equality3)).toBe(false);
        expect(equality1.equals(equality4)).toBe(false);
        expect(equality1.equals(equality5)).toBe(true);
    });
});
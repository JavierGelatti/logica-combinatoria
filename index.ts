import {application, equality, exists, forall, hole, identifier, truthHole} from "./src/core/expression_constructors";
import {ExpressionView} from "./src/dom/expression_view";
import {Expression} from "./src/core/expression";
import {ExpressionEditor} from "./src/dom/expressionEditor";

const mockingbird = forall(
    identifier("x"),
    equality(
        application(identifier("M"), identifier("x")),
        application(identifier("x"), identifier("x")),
    )
);

show(mockingbird);

// show(exists(
//     identifier("x"),
//     equality(
//         application(identifier("x"), identifier("x")),
//         application(
//             application(identifier("x"), identifier("x")),
//             identifier("x")
//         ),
//     )
// ));
//
const aForAll = forall(
    identifier("x"),
    forall(identifier("y"),
        equality(identifier("y"), identifier("x"))
    )
);
// const argument = application(identifier("y"), identifier("y", 0));
// const result = aForAll.applyTo(argument);
//
show(aForAll);
show(aForAll.applyTo(application(identifier("y"), identifier("y", 0))));
// show(result);

function show(expression: Expression) {
    document.body.append(ExpressionView.forExpression(expression).domElement());
}


const editor = new ExpressionEditor();
[
    identifier("x"),
    identifier("y"),
    identifier("z"),
    identifier("M"),
    application(hole(), hole()),
    equality(hole(), hole()),
    forall(identifier("x"), truthHole()),
    exists(identifier("x"), truthHole())
].forEach(e => editor.addToPallete(e));

document.body.append(editor.domElement());

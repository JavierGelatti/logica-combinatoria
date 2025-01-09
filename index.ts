import {application, equality, exists, forall, hole, identifier} from "./src/core/expression_constructors";
import {ExpressionView} from "./src/dom/expression_view";
import {Expression} from "./src/core/expression";
import {createElement} from "./src/dom/createElement";
import {makeDropTarget} from "./src/dom/drag_and_drop";

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
        application(hole(), identifier("x"))
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

const editor = createElement("div", { className: "expression-editor" });
const editorPallete = createElement("div", { className: "pallete" });
const editorCanvas = createElement("div", { className: "canvas" });

editor.append(editorPallete, editorCanvas);

makeDropTarget(editorCanvas, droppedElement => {
    const droppedExpression = ExpressionView.forDomElement(droppedElement)!.expression;
    if (!droppedExpression.isRootExpression()) return;

    const droppedExpressionCopy = droppedExpression.copy();

    const expressionView = ExpressionView.forExpression(droppedExpressionCopy);
    expressionView.makeDraggable(() => {
        expressionView.domElement().remove();
    }, "move");
    editorCanvas.append(expressionView.domElement());
});

makeDropTarget(editorPallete, droppedElement => {
    const droppedExpressionView = ExpressionView.forDomElement(droppedElement)!;
    const droppedExpression = droppedExpressionView.expression;

    if (!droppedExpression.isRootExpression()) {
        const newHole = droppedExpression.detachFromParent();
        droppedExpressionView.domElement().replaceWith(
            ExpressionView.forExpression(newHole).domElement()
        )
    }
});

[
    identifier("x"),
    identifier("y"),
    identifier("y", 0),
    identifier("y", 1),
    identifier("M"),
    application(hole(), hole()),
    equality(hole(), hole()),
    forall(identifier("x"), hole()),
    exists(identifier("x"), hole())
].forEach(showInPallete);

function showInPallete(expression: Expression) {
    const expressionView = ExpressionView.forExpression(expression);
    expressionView.makeDraggable();
    editorPallete.append(expressionView.domElement());
}


document.body.append(editor);

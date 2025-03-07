import {ExpressionEditor} from "../expressionEditor.ts";
import {Expression} from "../../core/expressions/expression.ts";

export abstract class UserInteraction {
    protected constructor(
        protected readonly editor: ExpressionEditor,
    ) {}

    start(): void {
        // The order is important: the editor will cancel the current interaction (if any) before starting this one.
        this.editor.startedInteraction(this);
        this._start();
    }

    protected abstract _start(): void;

    abstract currentExpression(): Expression | undefined;

    cancel(): void {
        this._cancel();
        this.editor.cancelledInteraction(this);
    }

    protected abstract _cancel(): void

    finish(): void {
        this._finish();
        this.editor.completedInteraction(this);
    }

    protected abstract _finish(): void;
}
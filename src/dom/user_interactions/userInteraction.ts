import {ExpressionEditor} from "../expressionEditor.ts";

export abstract class UserInteraction {
    protected constructor(
        protected readonly editor: ExpressionEditor,
    ) {}

    abstract register(): void;

    start(): void {
        this._start();
        this.editor.startedInteraction(this);
    }

    protected abstract _start(): void;

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

    abstract unregister(): void;
}
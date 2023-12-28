import { MarkdownView, Plugin, WorkspaceLeaf } from 'obsidian';
import { EditorView } from "@codemirror/view";
import { Compartment, EditorState } from "@codemirror/state";

declare module 'obsidian' {
	interface WorkspaceLeaf {
		id: string;
	}

	interface Editor {
		editorComponent: any;
		cm: any;
	}

	interface MarkdownView {
		editMode: any;
	}
}

export default class MyPlugin extends Plugin {
	editable: Map<string, boolean> = new Map();
	actionElMap: Map<string, HTMLElement> = new Map();
	editorPlugin: Compartment;

	async onload() {
		this.editorPlugin = new Compartment();

		this.app.workspace.iterateAllLeaves((leaf) => this.updateLeafAction(leaf));
		this.registerEditorExtension([
			this.editorPlugin.of(
				EditorState.readOnly.of(false)
			)
		])

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf)=> {
				if(!leaf) return;
				this.updateLeafAction(leaf);
			})
		)

		this.addCommand({
		    id: 'toggle-read-only-mode',
		    name: 'Toggle read-only mode',
		    editorCallback: (editor, ctx) => {
				const id = editor.editorComponent.view.leaf.id;
				const markdownView = editor.editorComponent.view;

				const view = (editor.cm as EditorView);
				this.updateViewStatusById(id, view);
			}
		});
	}

	onunload() {
		console.log('unloading plugin');
		this.actionElMap.forEach((el, id) => {
			el.remove();
			this.actionElMap.delete(id);
		});
	}

	updateLeafAction = (leaf: WorkspaceLeaf) => {
		if(!(leaf?.view)) return;
		if(!(leaf?.view instanceof MarkdownView)) return;

		const view = (leaf.view as MarkdownView);
		if(this.editable.has(view.leaf.id)) return;
		this.editable.set(view.leaf.id, false);

		const actionEl = view.addAction(
			'lock', 'Lock', () => {
				const id = view.leaf.id;
				this.actionElMap.get(id)?.toggleClass('cm-button-active', !this.editable.get(id));
				this.updateViewStatusById(id, view.editMode.editor.cm as EditorView);
			}
		)
		this.actionElMap.set(view.leaf.id, actionEl);
	}

	updateViewStatusById(id: string, view: EditorView) {
		this.editable.set(id, !this.editable.get(id));
		view.dispatch(
			{
				effects: this.editorPlugin.reconfigure(EditorState.readOnly.of(!!this.editable.get(id)))
			}
		)
	}
}

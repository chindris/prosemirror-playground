import {Schema} from "prosemirror-model";

import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {DOMParser} from "prosemirror-model"
import {keymap} from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"
import {Plugin} from "prosemirror-state"

const todoListSchema = new Schema({
    nodes: {
        text: {},
        label: {
            content: "text*",
            toDOM() {return ["label", 0]},
            parseDom: [{tag: "label"}],
            //isolating: true,
        },
        due_date: {
            content: "text*",
            //isolating: true,
            toDOM() { return ["due_date", 0] },
            parseDOM: [{tag: "due_date"}]
        },
        todo_item: {
            content: "label due_date",
            toDOM() { return ['todo_item', 0]},
            parseDOM: [{tag: "todo_item"}],
        },
        doc: {
            content: "todo_item+"
        }
    }
});

function createTodoItem(pos, state, dispatch) {
    let todoItemtype = todoListSchema.nodes.todo_item
    let labelType = todoListSchema.nodes.label
    let dueDateType = todoListSchema.nodes.due_date
    if (dispatch) {
        dispatch(state.tr.insert(pos, todoItemtype.create(null, [labelType.create(), dueDateType.create()])));
    }
    return true
  }

function removeTodoItem(state, dispatch) {
    let $head = state.selection.$head
    for (let d = $head.depth; d > 0; d--) {
        if ($head.node(d).type.name == "todo_item") {
            if (dispatch) {
                let todo_item = $head.node(d);
                let start_position = $head.start(d);
                // Not sure why we need this actually...
                let start_position_offset = start_position <= 1 ? 0 : -2;
                dispatch(state.tr.delete(start_position + start_position_offset, start_position + todo_item.content.size));
            }
        }
    }
    return true
}

function appendTodoItem(state, dispatch) {
    return createTodoItem(state.doc.content.size, state, dispatch);
}

function prependTodoItem(state, dispatch) {
    return createTodoItem(0, state, dispatch);
}

  class MenuView {
    constructor(items, editorView) {
      this.items = items
      this.editorView = editorView
  
      this.dom = document.createElement("div")
      this.dom.className = "menubar"
      items.forEach(({dom}) => this.dom.appendChild(dom))
      this.update()
  
      this.dom.addEventListener("mousedown", e => {
        e.preventDefault()
        editorView.focus()
        items.forEach(({command, dom}) => {
          if (dom.contains(e.target))
            command(editorView.state, editorView.dispatch, editorView)
        })
      })
    }
  
    update() {
      this.items.forEach(({command, dom}) => {
        let active = command(this.editorView.state, null, this.editorView)
        dom.style.display = active ? "" : "none"
      })
    }
  
    destroy() { this.dom.remove() }
  }

  function menuPlugin(items) {
    return new Plugin({
      view(editorView) {
        let menuView = new MenuView(items, editorView)
        editorView.dom.parentNode.insertBefore(menuView.dom, editorView.dom)
        return menuView
      }
    })
  }

  // Helper function to create menu icons
function icon(text, name) {
    let span = document.createElement("span")
    span.className = "menuicon " + name
    span.title = name
    span.textContent = text
    return span
  }

  let menu = menuPlugin([
    {command: prependTodoItem, dom: icon("Prepend todo", "prepend_todo")},
    {command: appendTodoItem, dom: icon("Append todo", "append_todo")},
    {command: removeTodoItem, dom: icon("Remove todo", "remove_todo")},
  ])

  window.todoListView = new EditorView(document.querySelector("#editor"), {
    state: EditorState.create({
      doc: DOMParser.fromSchema(todoListSchema).parse(document.querySelector("#content")),
      plugins: [
          keymap(baseKeymap),
          menu,
      ]
    })
  });

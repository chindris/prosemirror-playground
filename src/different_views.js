import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {Schema} from "prosemirror-model"
import {schema} from "prosemirror-schema-basic"
import {addListNodes} from "prosemirror-schema-list"
import {exampleSetup} from "prosemirror-example-setup"
import {defaultMarkdownParser} from "prosemirror-markdown";
import {defaultMarkdownSerializer} from 'prosemirror-markdown';


class MarkdownView {
  constructor(target, content) {
    this.textarea = target.appendChild(document.createElement("textarea"))
    this.textarea.value = content
  }

  get content() { return this.textarea.value }
  focus() { this.textarea.focus() }
  destroy() { this.textarea.remove() }
}

class ProseMirrorView {
  constructor(target, content) {
    const mySchema = new Schema({
      nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
      marks: schema.spec.marks
    })
    this.view = new EditorView(target, {
    state: EditorState.create({
        doc: defaultMarkdownParser.parse(content),
        plugins: exampleSetup({schema: mySchema})
      })
    })
  }

  get content() {
    return defaultMarkdownSerializer.serialize(this.view.state.doc)
  }
  focus() { this.view.focus() }
  destroy() { this.view.destroy() }
}

let place = document.querySelector("#editor")
let view = new MarkdownView(place, document.querySelector("#content").value);

document.querySelectorAll("input[type=radio]").forEach(button => {
    button.addEventListener("change", () => {
      if (!button.checked) return
      let View = button.value == "markdown" ? MarkdownView : ProseMirrorView
      if (view instanceof View) return
      let content = view.content
      view.destroy()
      view = new View(place, content)
      view.focus()
    })
  })

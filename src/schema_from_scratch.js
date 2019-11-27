import {Schema} from 'prosemirror-model';
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {DOMParser} from "prosemirror-model"
import {keymap} from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"
import {findWrapping} from "prosemirror-transform"
import {toggleMark} from "prosemirror-commands"

const textSchema = new Schema({
    nodes: {
        text: {},
        doc: {content: "text*"}
    }
});

window.view = new EditorView(document.querySelector("#simple-text-editor"), {
    state: EditorState.create({
      doc: DOMParser.fromSchema(textSchema).parse(document.querySelector("#simple-text-content"))
    })
  });


const noteSchema = new Schema({
    nodes: {
      text: {},
      note: {
        content: "text*",
        toDOM() { return ["note", 0] },
        parseDOM: [{tag: "note"}]
      },
      notegroup: {
        content: "note+",
        toDOM() { return ["notegroup", 0] },
        parseDOM: [{tag: "notegroup"}]
      },
      doc: {
        content: "(note | notegroup)+"
      }
    }
  })

  function makeNoteGroup(state, dispatch) {
    // Get a range around the selected blocks
    let range = state.selection.$from.blockRange(state.selection.$to)
    // See if it is possible to wrap that range in a note group
    let wrapping = findWrapping(range, noteSchema.nodes.notegroup)
    // If not, the command doesn't apply
    if (!wrapping) return false
    // Otherwise, dispatch a transaction, using the `wrap` method to
    // create the step that does the actual wrapping.
    if (dispatch) dispatch(state.tr.wrap(range, wrapping).scrollIntoView())
    return true
  }  

  window.noteView = new EditorView(document.querySelector("#note-editor"), {
    state: EditorState.create({
      doc: DOMParser.fromSchema(noteSchema).parse(document.querySelector("#note-content")),
      plugins: [
          keymap(baseKeymap),
          keymap({"Ctrl-Space": makeNoteGroup})
      ]
    })
  });


  let starSchema = new Schema({
    nodes: {
      text: {
        group: "inline",
      },
      star: {
        inline: true,
        group: "inline",
        toDOM() { return ["star", "🟊"] },
        parseDOM: [{tag: "star"}]
      },
      paragraph: {
        group: "block",
        content: "inline*",
        toDOM() { return ["p", 0] },
        parseDOM: [{tag: "p"}]
      },
      boring_paragraph: {
        group: "block",
        content: "text*",
        marks: "",
        toDOM() { return ["p", {class: "boring"}, 0] },
        parseDOM: [{tag: "p.boring", priority: 60}]
      },
      doc: {
        content: "block+"
      }
    },
    marks: {
        shouting: {
          toDOM() { return ["shouting", 0] },
          parseDOM: [{tag: "shouting"}]
        },
        link: {
          attrs: {href: {}},
          toDOM(node) { return ["a", {href: node.attrs.href}, 0] },
          parseDOM: [{tag: "a", getAttrs(dom) { return {href: dom.href} }}],
          inclusive: false
        }
      }
    })

    function toggleLink(state, dispatch) {
        let {doc, selection} = state
        if (selection.empty) return false
        let attrs = null
        if (!doc.rangeHasMark(selection.from, selection.to, starSchema.marks.link)) {
          attrs = {href: prompt("Link to where?", "")}
          if (!attrs.href) return false
        }
        return toggleMark(starSchema.marks.link, attrs)(state, dispatch)
      }

      function insertStar(state, dispatch) {
        let type = starSchema.nodes.star
        let {$from} = state.selection
        if (!$from.parent.canReplaceWith($from.index(), $from.index(), type))
          return false
        dispatch(state.tr.replaceSelectionWith(type.create()))
        return true
      }
      

    let starKeymap = keymap({
        'Ctrl-b': toggleMark(starSchema.marks.shouting),
        'Ctrl-q': toggleLink,
        "Ctrl-Space": insertStar,
    });


    window.starView = new EditorView(document.querySelector("#star-editor"), {
        state: EditorState.create({
          doc: DOMParser.fromSchema(starSchema).parse(document.querySelector("#star-content")),
          plugins: [
              keymap(baseKeymap),
              starKeymap,
          ]
        })
      });
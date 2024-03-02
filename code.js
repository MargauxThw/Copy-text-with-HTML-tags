figma.showUI(__html__, {
  width: 350,
  height: 350,
  title: "Select one text box to begin...",
  themeColors: true
});

var underline =
  figma.root.getPluginData("underline") === "unchecked" ? false : true;
var italics =
  figma.root.getPluginData("italics") === "unchecked" ? false : true;
var bold = figma.root.getPluginData("bold") === "unchecked" ? false : true;
var br = figma.root.getPluginData("br") === "unchecked" ? false : true;

figma.ui.postMessage({
  underline: underline,
  bold: bold,
  br: br,
  italics: italics,
  msg: "init-options",
});

updatePhrase();

figma.on("selectionchange", () => {
  updatePhrase();
});

figma.ui.onmessage = (msg) => {
  if (msg.type === "update-options") {
    figma.root.setPluginData("underline", msg.underline);
    figma.root.setPluginData("italics", msg.italics);
    figma.root.setPluginData("bold", msg.bold);
    figma.root.setPluginData("br", msg.br);

    underline = msg.underline === "unchecked" ? false : true;
    italics = msg.italics === "unchecked" ? false : true;
    bold = msg.bold === "unchecked" ? false : true;
    br = msg.br === "unchecked" ? false : true;

    updatePhrase();
  }
};

function updatePhrase() {
  if (
    figma.currentPage.selection.length == 1 &&
    figma.currentPage.selection[0].type === "TEXT"
  ) {
    var segs = figma.currentPage.selection[0].getStyledTextSegments([
      "textDecoration",
      "fontName",
    ]);
    var newSegs = [];

    for (let i = 0; i < segs.length; i++) {
      let seg = segs[i].characters;

      if (br) {
        seg = seg.replaceAll("\n", "<br>");
      }

      if (underline && segs[i].textDecoration === "UNDERLINE") {
        seg = `<u>${seg}</u>`;
      }

      if (bold && segs[i].fontName.style === "Bold") {
        seg = `<b>${seg}</b>`;
      }

      if (italics && segs[i].fontName.style === "Italic") {
        seg = `<i>${seg}</i>`;
      }

      newSegs.push(seg);
    }

    for (let i = 0; i < newSegs.length; i++) {
      if (underline && newSegs[i].includes("<u>")) {
        if (i != 0 && newSegs[i - 1].includes("</u>")) {
          newSegs[i] = newSegs[i].replace("<u>", "");
          newSegs[i - 1] = newSegs[i - 1].replace("</u>", "");
        }
      }

      if (bold && newSegs[i].includes("<b>")) {
        if (i != 0 && newSegs[i - 1].includes("</b>")) {
          newSegs[i] = newSegs[i].replace("<b>", "");
          newSegs[i - 1] = newSegs[i - 1].replace("</b>", "");
        }
      }

      if (italics && newSegs[i].includes("<i>")) {
        if (i != 0 && newSegs[i - 1].includes("</i>")) {
          newSegs[i] = newSegs[i].replace("<i>", "");
          newSegs[i - 1] = newSegs[i - 1].replace("</i>", "");
        }
      }
    }

    figma.ui.postMessage({ text: newSegs.join(""), msg: "init" });
  }
}

figma.showUI(__html__, {
  width: 350,
  height: 350,
  title: "Select one text box to begin...",
  themeColors: true,
});

// Get selected options from persistent prefs (default to selected if no prefs)
var underline =
  figma.root.getPluginData("underline") === "unchecked" ? false : true;
var italics =
  figma.root.getPluginData("italics") === "unchecked" ? false : true;
var bold = figma.root.getPluginData("bold") === "unchecked" ? false : true;
var br = figma.root.getPluginData("br") === "unchecked" ? false : true;
var colors = figma.root.getPluginData("colors") === "unchecked" ? false : true;
var links = figma.root.getPluginData("links") === "unchecked" ? false : true;

// Send selected options to UI
figma.ui.postMessage({
  underline: underline,
  bold: bold,
  br: br,
  italics: italics,
  colors: colors,
  links: links,
  msg: "init-options",
});

// Initialise text based on selection
updatePhrase();

// Update text based on selection change
figma.on("selectionchange", () => {
  updatePhrase();
});

// React to options change in ui.html
figma.ui.onmessage = (msg) => {
  if (msg.type === "update-options") {
    // Update in persistent prefs
    figma.root.setPluginData("underline", msg.underline);
    figma.root.setPluginData("italics", msg.italics);
    figma.root.setPluginData("bold", msg.bold);
    figma.root.setPluginData("br", msg.br);
    figma.root.setPluginData("colors", msg.colors);
    figma.root.setPluginData("links", msg.links);

    // Update in current session
    underline = msg.underline === "unchecked" ? false : true;
    italics = msg.italics === "unchecked" ? false : true;
    bold = msg.bold === "unchecked" ? false : true;
    br = msg.br === "unchecked" ? false : true;
    colors = msg.colors === "unchecked" ? false : true;
    links = msg.links === "unchecked" ? false : true;

    // Update text based on option change
    updatePhrase();
  }
};

// Helper function for color conversion
function convertToHex(r, g, b) {
  r = Math.round(r * 255.0);
  g = Math.round(g * 255.0);
  b = Math.round(b * 255.0);

  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Helper function to return the majority HEX code of a textNode's styled segments
function getMainColor(segs) {
  let fills = new Set();
  let freqs = {};

  for (let i = 0; i < segs.length; i++) {
    let color = convertToHex(
      segs[i].fills[0].color.r,
      segs[i].fills[0].color.g,
      segs[i].fills[0].color.b
    );

    if (!fills.has(color)) {
      fills.add(color);
      freqs[color] = 0;
    }

    freqs[color] += segs[i].characters.length;
  }

  return Object.keys(freqs).reduce((a, b) => (freqs[a] > freqs[b] ? a : b));
}

// Main helper function to determine html from text
function updatePhrase() {
  if (
    figma.currentPage.selection.length == 1 &&
    figma.currentPage.selection[0].type === "TEXT"
  ) {
    var segs = figma.currentPage.selection[0].getStyledTextSegments([
      "textDecoration",
      "fontName",
      "fills",
      "hyperlink",
    ]);
    var newSegs = [];
    var mainTextFill = getMainColor(segs);
    console.log(mainTextFill);
    console.log(segs);

    // Nesting tags
    for (let i = 0; i < segs.length; i++) {
      let seg = segs[i].characters;

      if (br) {
        seg = seg.replaceAll("\n", "<br>");
      }

      if (
        underline &&
        segs[i].textDecoration === "UNDERLINE" &&
        segs[i].hyperlink == null
      ) {
        seg = `<u>${seg}</u>`;
      }

      if (bold && segs[i].fontName.style.toLowerCase().includes("bold")) {
        seg = `<b>${seg}</b>`;
      }

      if (italics && segs[i].fontName.style.toLowerCase().includes("italic")) {
        seg = `<i>${seg}</i>`;
      }

      if (links && segs[i].hyperlink) {
        seg = `<a href="${segs[i].hyperlink.value}">${seg}</a>`;
      }

      let hexFill = convertToHex(
        segs[i].fills[0].color.r,
        segs[i].fills[0].color.g,
        segs[i].fills[0].color.b
      );
      if (colors && hexFill !== mainTextFill) {
        seg = `<span style="color: ${hexFill};">${seg}</span>`;
      }

      newSegs.push(seg);
    }

    // Joining adjacent tags (not including links)
    let prevColor = ""
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

      if (colors && newSegs[i].includes("<span style=")) {
        if (i != 0 && newSegs[i - 1].includes("<span style=")) {
          // Case where first time 2 adjacent segments have same span color
          if (newSegs[i].substring(20, 27) === newSegs[i - 1].substring(20, 27)) {
            prevColor = newSegs[i].substring(20, 27)
            console.log("Adding color", prevColor)
            newSegs[i] = newSegs[i].substring(30);
            newSegs[i-1] = newSegs[i-1].replace("</span>", "");

          } 
          // Case where previous segment has been edited for above
        } else if (i != 0 && newSegs[i - 1].includes("</span>") && newSegs[i].substring(20, 27) === prevColor) {
          newSegs[i] = newSegs[i].substring(30);
          newSegs[i-1] = newSegs[i-1].replace("</span>", "");
        }
      } else {
        prevColor = ""
      }
    }

    figma.ui.postMessage({ text: newSegs.join(""), msg: "init" });
  }
}

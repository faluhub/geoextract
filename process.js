import fs from "fs";
import * as babel from "@babel/parser";
import beautify from "js-beautify";

try {
  fs.mkdirSync("./chunks");
} catch {
  fs.rmSync("./chunks", {
    recursive: true,
    force: true
  });
  fs.mkdirSync("./chunks");
}

for (const file of fs.readdirSync("./extracted")) {
  if (!file.endsWith(".js")) {
    continue;
  }
  const path = "./extracted/" + file;
  const stringContent = fs.readFileSync(path, {
    encoding: "utf-8"
  });
  const content = babel.parse(stringContent, {
    sourceFilename: file,
    sourceType: "script"
  }).program.body[0].expression;
  let chunkId;
  const functions = {};
  if (!content.arguments) {
    continue;
  }
  for (const arg of content.arguments[0].elements) {
    if (arg.type === "ArrayExpression") {
      chunkId = arg.elements[0].value;
    } else if (arg.type === "ObjectExpression") {
      for (const prop of arg.properties) {
        const funcId = prop.key.value;
        functions[funcId] = {
          content: beautify("export default " + stringContent.substring(prop.value.start, prop.value.end), {
            indent_size: 2
          }),
          requireName: prop.value.params.length === 3 ? prop.value.params[2].name : null
        };
      }
    }
  }
  if (!chunkId) {
    continue;
  }
  for (const key in functions) {
    const func = functions[key];
    fs.writeFileSync(`./chunks/${key}.js`, processContent(func), {
      encoding: "utf-8"
    });
  }
}

function processContent(func) {
  var content = func.content;

  const zeroSyntax = /\(0, (\w+\.\w+)\)\(([\s\S]*?)\)/g;
  while (true) {
    if (content.match(zeroSyntax) === null) {
      break;
    }
    content = content.replace(zeroSyntax, (_, p1, p2) => {
      return `${p1}(${p2})`;
    });
  }

  if (func.requireName) {
    const wpRequire = new RegExp(`\\b${func.requireName}\\((\\d+)\\)`, "g");
    content = content.replace(wpRequire, (_, p1) => {
      return `require(\"./${p1}.js\")`;
    });
  }

  const trueFalse = /!([01])/g;
  return content.replace(trueFalse, (_, p1) => {
    return p1 === "1" ? "false" : "true";
  });
}

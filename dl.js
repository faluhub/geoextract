import fetch from "node-fetch";
import * as htmlparser from "htmlparser2";
import * as babel from "@babel/parser";
import http from "https";
import fs from "fs";

const url = "https://geoguessr.com";
const extraFiles = [
  "_app",
  "framework-",
  "main-",
  "webpack-"
];

function downloadFile(url, destination, callback) {
  var file = fs.createWriteStream(destination);
  http.get(url, res => {
    if (res.statusCode && res.statusCode === 200) {
      res.pipe(file);
      file.on("finish", function() {
        file.close(callback);
      });
    }
  });
}

async function getManifest() {
  const res = await (await fetch(url, {
    method: "GET",
    redirect: "follow"
  })).text();
  const dom = htmlparser.parseDocument(res);
  let parsed;
  for (const v of dom.children[1].children[0].children) {
    if (v.type === "script") {
      const attrs = v.attribs;
      if (!attrs.src) {
        continue;
      }
      if (attrs.src.endsWith("_buildManifest.js")) {
        const manifest = await (await fetch(url + attrs.src, {
          method: "GET",
          redirect: "follow"
        })).text();
        parsed = babel.parse(manifest, {
          sourceFilename: "_buildManifest.js",
          sourceType: "script"
        });
      } else {
        const name = attrs.src.split("/")[attrs.src.split("/").length - 1];
        for (const k of extraFiles) {
          if (name.startsWith(k)) {
            console.log(url + attrs.src);
            downloadFile(url + attrs.src, "./extracted/" + name, () => console.log("Downloaded " + name));
            break;
          }
        }
      }
    }
  }
  return parsed;
}

async function getScripts() {
  const manifest = await getManifest();
  const expression = manifest.program.body[0].expression.expressions[0].right;
  const args = {};
  expression.callee.params.forEach((v, i) => {
    args[v.name] = expression.arguments[i].value;
  });
  const returnObject = expression.callee.body.body[0].argument.properties;
  const scripts = [];
  for (const prop of returnObject) {
    if (prop.value.type === "ArrayExpression" && !prop.key.name) {
      for (const v of prop.value.elements) {
        let value;
        if (v.type === "StringLiteral") {
          value = v.value;
        } else if (v.type === "Identifier") {
          value = args[v.name];
        }
        if (value) {
          scripts.push(url + "/_next/" + value);
        }
      }
    }
  }
  return scripts;
}

async function downloadScripts() {
  const scripts = await getScripts();
  for (const script of scripts) {
    const name = script.split("/")[script.split("/").length - 1];
    setTimeout(() => downloadFile(script, "./extracted/" + name, () => console.log("Downloaded " + name)), 100);
  }
}

downloadScripts();

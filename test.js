import fs from "fs";

for (const folder of fs.readdirSync("./chunks")) {
  const ids = [];
  for (const file of fs.readdirSync("./chunks/" + folder)) {
    console.log(file)
    if (ids.includes(file)) {
        console.log("dupe " + file);
    } else {
        ids.push(file);
    }
  }
}

import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

const DIRECTORY = "./public/sfx/original/";
const OUT_DIRECTORY = "./public/sfx/";

const contents = fs.readdirSync(DIRECTORY);
const files = contents.filter(
  (file) =>
    file.endsWith(".mp3") ||
    file.endsWith(".wav") ||
    file.endsWith(".flac") ||
    file.endsWith(".aiff")
);

for (let file of files) {
  const fileName = file.split(".").slice(0, -1).join(".");

  const command = ffmpeg(`${DIRECTORY}${file}`);
  command.addInput;
  command.addOptions(["-vn", "-ar 44100", "-ac 2", "-q:a 6"]);
  command.addOutput(`${OUT_DIRECTORY}/${fileName}.mp3`);
  command.run();
}

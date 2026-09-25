import { createInterface } from "node:readline/promises";
export async function ask(label, { secret = false } = {}) {
  if (!process.stdin.isTTY)
    throw new Error("Use um terminal interativo para informar os dados.");
  if (!secret) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      return (await rl.question(label)).trim();
    } finally {
      rl.close();
    }
  }
  process.stdout.write(label);
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const done = () => {
      process.stdin.removeListener("data", data);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const data = (chunk) => {
      for (const c of chunk) {
        if (c === "\r" || c === "\n") {
          done();
          resolve(value);
          return;
        }
        if (c === "\u0003") {
          done();
          reject(new Error("Cancelado."));
          return;
        }
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else if (c >= " ") value += c;
      }
    };
    process.stdin.on("data", data);
  });
}

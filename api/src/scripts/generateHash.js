import bcrypt from "bcryptjs";
import { ask } from "./prompt.js";
try {
  const token =
    process.argv[2] ||
    (await ask("Token do dispositivo (20–72 bytes): ", { secret: true }));
  if (Buffer.byteLength(token) < 20 || Buffer.byteLength(token) > 72)
    throw new Error("Use um token entre 20 e 72 bytes.");
  console.log(await bcrypt.hash(token, 12));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

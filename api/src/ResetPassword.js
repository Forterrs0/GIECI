import bcrypt from "bcryptjs";
 
const password = process.argv[2];
 
if (!password) {
  console.error("Uso: node src/scripts/resetPassword.js SUA_SENHA_NOVA");
  process.exit(1);
}
if (password.length < 12) {
  console.error("A senha deve ter pelo menos 12 caracteres.");
  process.exit(1);
}
 
console.log(await bcrypt.hash(password, 12));
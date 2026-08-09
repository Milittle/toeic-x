// Starts the Next.js dev server on 0.0.0.0 and prints the LAN access URLs so
// any phone/tablet on the same Wi-Fi can reach the app.
import { networkInterfaces } from "os";
import { spawn } from "child_process";

function lanAddresses() {
  const nets = networkInterfaces();
  const out = [];
  for (const addrs of Object.values(nets)) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) out.push(a.address);
    }
  }
  return out;
}

const port = process.env.PORT ?? "3000";
const addrs = lanAddresses();

console.log("\n  托业阅读练习 — 局域网访问地址");
console.log("  -----------------------------------------");
console.log(`  本机：  http://localhost:${port}`);
for (const ip of addrs) {
  console.log(`  局域网：http://${ip}:${port}`);
}
if (addrs.length === 0) {
  console.log("  （未检测到局域网 IPv4 地址，仅本机可访问）");
}
console.log("  -----------------------------------------\n");

const args = ["next", "dev", "-H", "0.0.0.0", "-p", String(port)];
const child = spawn("npx", args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));

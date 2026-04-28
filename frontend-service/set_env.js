const fs = require("fs");
const os = require("os");

const ENV_PATH = ".env";
const API_PORT = 3000;

function getWifiIPv4() {
  const interfaces = os.networkInterfaces();

  const wifi = interfaces["Wi-Fi"];

  if (wifi) {
    const ipv4 = wifi.find(
      (iface) => iface.family === "IPv4" && !iface.internal,
    );

    if (ipv4) return ipv4.address;
  }

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === "IPv4" &&
        !iface.internal &&
        iface.address.startsWith("192.168.")
      ) {
        return iface.address;
      }
    }
  }

  throw new Error("Không tìm thấy IPv4 Wi-Fi / LAN");
}

function upsertEnvValue(content, key, value) {
  const line = `${key}=${value}`;

  if (content.match(new RegExp(`^${key}=`, "m"))) {
    return content.replace(new RegExp(`^${key}=.*$`, "m"), line);
  }

  return content.trimEnd() + `\n${line}\n`;
}

const ip = getWifiIPv4();
const apiBaseUrl = `http://${ip}:${API_PORT}`;

let envContent = "";

if (fs.existsSync(ENV_PATH)) {
  envContent = fs.readFileSync(ENV_PATH, "utf8");
}

envContent = upsertEnvValue(envContent, "EXPO_PUBLIC_API_BASE_URL", apiBaseUrl);

fs.writeFileSync(ENV_PATH, envContent);

console.log(`Updated .env: EXPO_PUBLIC_API_BASE_URL=${apiBaseUrl}`);
